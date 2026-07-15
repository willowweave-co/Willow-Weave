-- ── 1. THE FIX for "saved settings don't show on the storefront" ─────────────
-- The security hardening (0009_security_hardening) locked store_settings to
-- staff and exposed a whitelisted VIEW to shoppers. Columns added since then
-- (intl_shipping, bank_transfer, announcement_color) were missing from the
-- whitelist, so checkout/announcement read defaults while the dashboard
-- (which reads the base table) looked fine. Re-create the view with the new
-- public-safe columns — notify_email stays private, as before.
-- (DROP first: `create or replace view` can only append columns at the end,
-- and inserting one mid-list errors with 42P16. A view holds no data, and the
-- app falls back to the old column set for the instant it's absent.)
drop view if exists public.store_settings_public;
create view public.store_settings_public as
  select
    id,
    store_name,
    shipping_fee,
    free_shipping_threshold,
    announcement,
    announcement_color,
    contact,
    hero_slides,
    homepage_collections,
    intl_shipping,
    bank_transfer
  from public.store_settings
  where id = 1;

-- create-or-replace keeps existing grants; re-stated so the file stands alone
revoke all on public.store_settings_public from anon, authenticated, public;
grant select on public.store_settings_public to anon, authenticated;

-- ── 2. Orders remember the shopper's display currency ───────────────────────
-- Shipping labels/packing slips print the total in the currency the customer
-- shopped in. display_total is converted server-side at order time with the
-- weekly rate, so the printed amount matches what the customer saw.
alter table public.orders
  add column if not exists currency text not null default 'PKR',
  add column if not exists display_total numeric(12,2);

-- ── 3. place_order gains p_currency + p_display_rate ────────────────────────
drop function if exists public.place_order(text, text, text, text, text, text, text, jsonb, text, text);

create or replace function public.place_order(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_city text,
  p_notes text,
  p_discount_code text,
  p_items jsonb, -- [{"variant_id":1,"quantity":2}]
  p_country text default 'Pakistan',
  p_payment_method text default 'cod',
  p_currency text default 'PKR',
  p_display_rate numeric default null -- display-currency units per 1 PKR (server-supplied)
) returns jsonb
language plpgsql security definer set search_path = public as
$$
declare
  v_item record;
  v_variant record;
  v_product record;
  v_subtotal numeric(12,2) := 0;
  v_discount discount_codes%rowtype;
  v_discount_amount numeric(12,2) := 0;
  v_settings store_settings%rowtype;
  v_shipping numeric(12,2);
  v_country text := coalesce(nullif(trim(p_country), ''), 'Pakistan');
  v_payment text := coalesce(nullif(trim(p_payment_method), ''), 'cod');
  v_currency text := coalesce(nullif(trim(p_currency), ''), 'PKR');
  v_total numeric(12,2);
  v_order_id bigint;
  v_order_number text;
  v_image text;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  select * into v_settings from store_settings where id = 1;

  if v_payment not in ('cod', 'bank') then
    raise exception 'BAD_PAYMENT_METHOD';
  end if;
  -- bank transfer is only offered once the owner has saved account details
  if v_payment = 'bank' and coalesce(
       nullif(trim(coalesce(v_settings.bank_transfer->>'accountNumber', '')), ''),
       nullif(trim(coalesce(v_settings.bank_transfer->>'iban', '')), '')
     ) is null then
    raise exception 'BANK_UNAVAILABLE';
  end if;

  -- Lock + validate every variant, compute subtotal from DB prices
  for v_item in select (e->>'variant_id')::bigint as variant_id, (e->>'quantity')::int as quantity
                from jsonb_array_elements(p_items) e
  loop
    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 20 then
      raise exception 'BAD_QUANTITY';
    end if;
    select * into v_variant from product_variants where id = v_item.variant_id for update;
    if not found then raise exception 'VARIANT_NOT_FOUND:%', v_item.variant_id; end if;
    select * into v_product from products where id = v_variant.product_id;
    if v_product.published_at is null then raise exception 'PRODUCT_UNAVAILABLE:%', v_product.handle; end if;
    if v_variant.stock < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%:%', v_product.title,
        coalesce(v_variant.size, v_variant.title);
    end if;
    v_subtotal := v_subtotal + v_variant.price * v_item.quantity;
  end loop;

  -- Discount
  if p_discount_code is not null and length(trim(p_discount_code)) > 0 then
    select * into v_discount from discount_codes
      where upper(code) = upper(trim(p_discount_code)) for update;
    if not found or not v_discount.active
       or (v_discount.starts_at is not null and now() < v_discount.starts_at)
       or (v_discount.ends_at is not null and now() > v_discount.ends_at)
       or (v_discount.usage_limit is not null and v_discount.times_used >= v_discount.usage_limit)
       or v_subtotal < v_discount.min_subtotal then
      raise exception 'INVALID_DISCOUNT';
    end if;
    if v_discount.type = 'percent' then
      v_discount_amount := round(v_subtotal * v_discount.value / 100, 2);
    else
      v_discount_amount := least(v_discount.value, v_subtotal);
    end if;
    update discount_codes set times_used = times_used + 1 where id = v_discount.id;
  end if;

  -- Shipping: Pakistan uses the flat fee + free-shipping threshold;
  -- other countries use their per-country fee (threshold does NOT apply)
  -- and must be enabled in settings, otherwise the order is rejected.
  if v_country = 'Pakistan' then
    v_shipping := coalesce(v_settings.shipping_fee, 0);
    if v_settings.free_shipping_threshold is not null
       and (v_subtotal - v_discount_amount) >= v_settings.free_shipping_threshold then
      v_shipping := 0;
    end if;
  else
    select (c->>'fee')::numeric into v_shipping
      from jsonb_array_elements(coalesce(v_settings.intl_shipping->'countries', '[]'::jsonb)) c
      where c->>'name' = v_country
      limit 1;
    if v_shipping is null then
      raise exception 'BAD_COUNTRY:%', v_country;
    end if;
  end if;

  v_total := v_subtotal - v_discount_amount + v_shipping;

  insert into orders (customer_name, phone, email, address, city, country, notes,
                      payment_method, currency, display_total,
                      subtotal, discount_code, discount_amount, shipping_fee, total,
                      status_history)
  values (p_customer_name, p_phone, nullif(trim(coalesce(p_email,'')), ''), p_address, p_city,
          v_country, p_notes,
          v_payment,
          v_currency,
          case
            when v_currency <> 'PKR' and p_display_rate is not null and p_display_rate > 0
              then round(v_total * p_display_rate, 2)
            else null
          end,
          v_subtotal,
          case when v_discount_amount > 0 then upper(trim(p_discount_code)) else null end,
          v_discount_amount, v_shipping,
          v_total,
          jsonb_build_array(jsonb_build_object('status','pending','at', now())))
  returning id, order_number into v_order_id, v_order_number;

  -- Items (snapshot) + stock decrement
  for v_item in select (e->>'variant_id')::bigint as variant_id, (e->>'quantity')::int as quantity
                from jsonb_array_elements(p_items) e
  loop
    select v.*, p.title as product_title, p.handle as product_handle
      into v_variant
      from product_variants v join products p on p.id = v.product_id
      where v.id = v_item.variant_id;
    select url into v_image from product_images
      where product_id = v_variant.product_id order by position limit 1;
    insert into order_items (order_id, product_id, variant_id, handle, title, size, color,
                             unit_price, quantity, image_url)
    values (v_order_id, v_variant.product_id, v_item.variant_id, v_variant.product_handle,
            v_variant.product_title, v_variant.size, v_variant.color,
            v_variant.price, v_item.quantity, v_image);
    update product_variants set stock = stock - v_item.quantity where id = v_item.variant_id;
  end loop;

  return jsonb_build_object(
    'order_number', v_order_number,
    'total', v_total
  );
end;
$$;
