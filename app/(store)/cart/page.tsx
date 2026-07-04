import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { CartPageContent } from "@/components/store/cart-page-content";

export const metadata: Metadata = { title: "Your Cart", robots: { index: false } };

export default async function CartPage() {
  const settings = await repo.getSettings();
  return (
    <CartPageContent
      shippingFee={settings.shippingFee}
      freeShippingThreshold={settings.freeShippingThreshold}
    />
  );
}
