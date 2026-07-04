import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { getContent } from "@/lib/content";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Willow Weave — phone, WhatsApp and email.",
};

const PHONE = "+92 300 0535503";
const PHONE_LINK = "+923000535503";
const EMAIL = "willowweave.co@gmail.com";

export default async function ContactPage() {
  const content = await getContent();
  return (
    <div className="container-site py-10 md:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-umber uppercase">
          We’d love to hear from you
        </p>
        <h1 className="heading-display mt-1 text-3xl font-semibold text-ink sm:text-4xl">
          Contact Willow Weave
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-umber">
          Questions about sizing, an order on its way, or a piece you have your eye on — reach out
          through any of these and we’ll get back to you quickly.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
        <a
          href={`tel:${PHONE_LINK}`}
          className="group rounded-2xl border border-line bg-white/60 p-6 text-center transition-all hover:border-walnut/50 hover:shadow-md"
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-walnut/10">
            <Phone className="h-5 w-5 text-walnut" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Call us</p>
          <p className="mt-1 text-sm text-bark">{PHONE}</p>
        </a>
        <a
          href={`https://wa.me/${PHONE_LINK.replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border border-line bg-white/60 p-6 text-center transition-all hover:border-walnut/50 hover:shadow-md"
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-moss/12">
            <MessageCircle className="h-5 w-5 text-moss" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">WhatsApp</p>
          <p className="mt-1 text-sm text-bark">Message us anytime</p>
        </a>
        <a
          href={`mailto:${EMAIL}`}
          className="group rounded-2xl border border-line bg-white/60 p-6 text-center transition-all hover:border-walnut/50 hover:shadow-md"
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/20">
            <Mail className="h-5 w-5 text-walnut-dark" />
          </span>
          <p className="mt-3 text-sm font-semibold text-ink">Email</p>
          <p className="mt-1 text-sm break-all text-bark">{EMAIL}</p>
        </a>
      </div>

      <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-line bg-parchment/60 p-6 text-center">
        <p className="flex items-center justify-center gap-2 text-sm text-bark">
          <Clock className="h-4 w-4 text-umber" />
          Orders are processed within 1–3 business days (excluding weekends & public holidays).
        </p>
        <p className="mt-2 text-xs text-umber">
          For delivery details see the{" "}
          <Link href="/policies/shipping-policy" className="text-walnut underline underline-offset-2">
            shipping policy
          </Link>
          ; for returns see the{" "}
          <Link href="/policies/refund-policy" className="text-walnut underline underline-offset-2">
            refund policy
          </Link>
          .
        </p>
      </div>

      {content.policies["contact-information"]?.bodyHtml && (
        <div className="mx-auto mt-8 max-w-3xl text-center">
          <div
            className="rte inline-block text-left"
            dangerouslySetInnerHTML={{
              __html: content.policies["contact-information"].bodyHtml,
            }}
          />
        </div>
      )}
    </div>
  );
}
