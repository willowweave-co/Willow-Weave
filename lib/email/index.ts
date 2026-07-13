import { Resend } from "resend";
import type { Order, OrderStatus } from "@/lib/types";
import { DEFAULT_CONTACT } from "@/lib/types";
import { formatPKR } from "@/lib/money";

/**
 * Order emails via Resend. Without RESEND_API_KEY (local mode) the emails are
 * printed to the server console instead, so the whole flow stays testable.
 */

const FROM = process.env.EMAIL_FROM ?? "Willow Weave <onboarding@resend.dev>";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

type OrderLike = Pick<
  Order,
  | "orderNumber"
  | "customerName"
  | "phone"
  | "email"
  | "address"
  | "city"
  | "notes"
  | "subtotal"
  | "discountCode"
  | "discountAmount"
  | "shippingFee"
  | "total"
  | "items"
  | "createdAt"
>;

const S = {
  wrap: `margin:0;padding:24px;background:#faf6ef;font-family:Georgia,'Times New Roman',serif;color:#29211a;`,
  card: `max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5daca;border-radius:14px;overflow:hidden;`,
  head: `background:#6b4a2f;color:#faf6ef;padding:20px 28px;`,
  body: `padding:24px 28px;`,
  h1: `margin:0;font-size:20px;font-weight:600;`,
  sub: `margin:4px 0 0;font-size:13px;opacity:.85;`,
  row: `display:block;padding:10px 0;border-bottom:1px solid #efe7d9;font-size:14px;`,
  totalRow: `padding:12px 0 0;font-size:16px;font-weight:700;`,
  muted: `color:#6e5c4b;font-size:13px;`,
  btn: `display:inline-block;background:#6b4a2f;color:#faf6ef;text-decoration:none;padding:11px 22px;border-radius:999px;font-size:14px;`,
};

function itemsHtml(order: OrderLike): string {
  return order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #efe7d9;font-size:14px;">
          ${escapeHtml(i.title)}
          <div style="${S.muted}">${[i.color, i.size].filter(Boolean).map(escapeHtml).join(" · ")} × ${i.quantity}</div>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #efe7d9;font-size:14px;white-space:nowrap;">
          ${formatPKR(i.unitPrice * i.quantity)}
        </td>
      </tr>`
    )
    .join("");
}

function totalsHtml(order: OrderLike): string {
  const line = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:6px 0;font-size:${strong ? "16px" : "14px"};${strong ? "font-weight:700;" : ""}">${label}</td>
      <td align="right" style="padding:6px 0;font-size:${strong ? "16px" : "14px"};${strong ? "font-weight:700;" : ""}">${value}</td>
    </tr>`;
  return `
    ${line("Subtotal", formatPKR(order.subtotal))}
    ${order.discountAmount > 0 ? line(`Discount${order.discountCode ? ` (${escapeHtml(order.discountCode)})` : ""}`, `−${formatPKR(order.discountAmount)}`) : ""}
    ${line("Delivery", order.shippingFee > 0 ? formatPKR(order.shippingFee) : "Free")}
    ${line("Total — Cash on Delivery", formatPKR(order.total), true)}
  `;
}

function escapeHtml(s: string | null | undefined): string {
  return (s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

function ownerEmailHtml(order: OrderLike): string {
  return `
  <div style="${S.wrap}">
    <div style="${S.card}">
      <div style="${S.head}">
        <h1 style="${S.h1}">🛍️ New COD order ${order.orderNumber}</h1>
        <p style="${S.sub}">${new Date(order.createdAt).toLocaleString("en-GB")} · ${formatPKR(order.total)}</p>
      </div>
      <div style="${S.body}">
        <h2 style="font-size:15px;margin:0 0 6px;">Customer & delivery</h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
          <strong>${escapeHtml(order.customerName)}</strong><br/>
          📞 ${escapeHtml(order.phone)}${order.email ? `<br/>✉️ ${escapeHtml(order.email)}` : ""}<br/>
          📍 ${escapeHtml(order.address)}, ${escapeHtml(order.city)}
          ${order.notes ? `<br/>📝 ${escapeHtml(order.notes)}` : ""}
        </p>
        <h2 style="font-size:15px;margin:0 0 6px;">Items</h2>
        <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml(order)}${totalsHtml(order)}</table>
        <p style="margin:20px 0 0;">
          <a href="${siteUrl()}/admin/orders" style="${S.btn}">Open in dashboard</a>
        </p>
      </div>
    </div>
  </div>`;
}

function customerEmailHtml(order: OrderLike, contactPhone: string): string {
  return `
  <div style="${S.wrap}">
    <div style="${S.card}">
      <div style="${S.head}">
        <h1 style="${S.h1}">Thank you, ${escapeHtml(order.customerName.split(" ")[0])} 🌿</h1>
        <p style="${S.sub}">Order ${order.orderNumber} is confirmed</p>
      </div>
      <div style="${S.body}">
        <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">
          We’ve received your order and will start preparing it right away. You’ll pay
          <strong>${formatPKR(order.total)} in cash</strong> when it arrives at:
        </p>
        <p style="font-size:14px;line-height:1.6;margin:0 0 16px;background:#faf6ef;border:1px solid #e5daca;border-radius:10px;padding:12px 16px;">
          ${escapeHtml(order.address)}, ${escapeHtml(order.city)}<br/>📞 ${escapeHtml(order.phone)}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml(order)}${totalsHtml(order)}</table>
        <p style="${S.muted};margin:18px 0 0;">
          Orders are processed within 1–3 business days and delivered in 2–7 business days.
          Questions? Just reply to this email or call ${escapeHtml(contactPhone)}.
        </p>
      </div>
    </div>
  </div>`;
}

function shippedEmailHtml(order: OrderLike): string {
  return `
  <div style="${S.wrap}">
    <div style="${S.card}">
      <div style="${S.head}">
        <h1 style="${S.h1}">Your order is on its way 📦</h1>
        <p style="${S.sub}">Order ${order.orderNumber}</p>
      </div>
      <div style="${S.body}">
        <p style="font-size:14px;line-height:1.6;margin:0 0 14px;">
          Good news, ${escapeHtml(order.customerName.split(" ")[0])} — your Willow Weave order has been
          shipped and should reach you within 2–5 business days. Please keep
          <strong>${formatPKR(order.total)}</strong> ready as Cash on Delivery.
        </p>
        <p style="${S.muted};margin:0;">Delivery address: ${escapeHtml(order.address)}, ${escapeHtml(order.city)}</p>
      </div>
    </div>
  </div>`;
}

async function deliver(
  to: string,
  subject: string,
  html: string,
  replyTo?: string
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `\n━━━ EMAIL (local mode — set RESEND_API_KEY to actually send) ━━━\nTO: ${to}\nSUBJECT: ${subject}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    );
    return;
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    // orders@willowweave.co has no mailbox — route replies somewhere real
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) console.error(`Resend error for "${subject}" → ${to}:`, error.message);
}

/** Fire order emails. Never throws — an email failure must not fail an order. */
export async function sendOrderEmails(
  order: OrderLike,
  notifyEmail: string,
  contactPhone: string = DEFAULT_CONTACT.phone
): Promise<void> {
  try {
    const jobs: Promise<void>[] = [];
    if (notifyEmail) {
      jobs.push(
        deliver(
          notifyEmail,
          `New COD order ${order.orderNumber} — ${formatPKR(order.total)}`,
          ownerEmailHtml(order),
          // owner hits Reply to answer the customer directly
          order.email ?? undefined
        )
      );
    }
    if (order.email) {
      jobs.push(
        deliver(
          order.email,
          `Order ${order.orderNumber} confirmed — Willow Weave`,
          customerEmailHtml(order, contactPhone),
          // customer replies land in the owner's real inbox
          notifyEmail || undefined
        )
      );
    }
    await Promise.allSettled(jobs);
  } catch (e) {
    console.error("sendOrderEmails failed:", e);
  }
}

export async function sendStatusEmail(
  order: OrderLike,
  status: OrderStatus,
  replyTo?: string
): Promise<void> {
  try {
    if (status !== "shipped" || !order.email) return;
    await deliver(
      order.email,
      `Order ${order.orderNumber} shipped — Willow Weave`,
      shippedEmailHtml(order),
      replyTo
    );
  } catch (e) {
    console.error("sendStatusEmail failed:", e);
  }
}
