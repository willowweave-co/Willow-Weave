import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { bankTransferConfigured } from "@/lib/types";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function CheckoutPage({ searchParams }: Props) {
  const [{ code }, settings] = await Promise.all([searchParams, repo.getSettings()]);
  return (
    <CheckoutForm
      shippingFee={settings.shippingFee}
      freeShippingThreshold={settings.freeShippingThreshold}
      initialDiscountCode={code ?? ""}
      intlCountries={settings.intlShipping.countries}
      intlNote={settings.intlShipping.note}
      bank={bankTransferConfigured(settings.bankTransfer) ? settings.bankTransfer : null}
      contactEmail={settings.contact.email}
      whatsapp={settings.contact.whatsapp}
    />
  );
}
