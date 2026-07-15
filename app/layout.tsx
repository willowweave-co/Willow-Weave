import type { Metadata, Viewport } from "next";
import { Fraunces, Jost } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart-context";
import { ToastProvider } from "@/components/ui/toast";
import { CurrencyProvider } from "@/components/store/currency-context";
import { getRates } from "@/lib/currency-server";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Willow Weave — Where Every Thread Tells a Story",
    template: "%s · Willow Weave",
  },
  description:
    "Willow Weave — women's clothing crafted with premium fabrics. 2-piece and 3-piece suits, tops and trousers. Cash on Delivery across Pakistan — international shipping available worldwide.",
};

export const viewport: Viewport = {
  themeColor: "#faf6ef",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // cached 12h; static pages stay static (no request-specific data involved)
  const rates = await getRates();
  return (
    <html lang="en" className={`${fraunces.variable} ${jost.variable}`}>
      <body>
        <ToastProvider>
          <CurrencyProvider rates={rates}>
            <CartProvider>{children}</CartProvider>
          </CurrencyProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
