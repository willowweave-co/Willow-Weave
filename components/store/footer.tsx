import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, Truck, BadgeCheck, RefreshCcw } from "lucide-react";
import { getContent, THEME_IMAGES } from "@/lib/content";

/** lucide-react v1 dropped brand glyphs — tiny inline marks keep the row consistent. */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 21v-7h2.4l.5-3h-2.9V9.1c0-.9.3-1.6 1.6-1.6H16.5V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.3H8v3h2.3v7h3.2Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.32 5.56a5.1 5.1 0 0 1-3.54-1.43A5.1 5.1 0 0 1 14.2 1h-3.45v13.9a2.89 2.89 0 1 1-2.89-2.89c.3 0 .58.05.85.13V8.6a6.34 6.34 0 1 0 5.49 6.29V9.87a8.5 8.5 0 0 0 5.12 1.7V8.13a5.09 5.09 0 0 1-.99-.1 5.1 5.1 0 0 1-.01-2.47Z" />
    </svg>
  );
}

const VALUE_PROPS = [
  { icon: Truck, title: "Cash on Delivery", text: "Pay when your order arrives — anywhere in Pakistan" },
  { icon: BadgeCheck, title: "Premium Fabrics", text: "Lawn, silks, chiffon & velvet, thoughtfully sourced" },
  { icon: RefreshCcw, title: "Easy Returns", text: "Simple refund policy on unworn items" },
];

export async function Footer() {
  const content = await getContent();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-parchment/50">
      {/* value props */}
      <div className="container-site grid gap-6 border-b border-line py-10 sm:grid-cols-3">
        {VALUE_PROPS.map((v) => (
          <div key={v.title} className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-walnut/10">
              <v.icon className="h-5 w-5 text-walnut" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{v.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-umber">{v.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="container-site grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {/* brand */}
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src={THEME_IMAGES.logo}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
            />
            <span className="heading-display text-xl font-semibold text-ink">Willow Weave</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-umber">
            A brand where every thread tells a story of elegance and comfort. Thoughtfully designed,
            meticulously crafted women’s wear.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {content.socials.facebook && (
              <a
                href={content.socials.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Willow Weave on Facebook"
                className="rounded-full border border-line p-2 text-bark transition-colors hover:border-walnut hover:text-walnut"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
            )}
            {content.socials.instagram && (
              <a
                href={content.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Willow Weave on Instagram"
                className="rounded-full border border-line p-2 text-bark transition-colors hover:border-walnut hover:text-walnut"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            )}
            {content.socials.tiktok && (
              <a
                href={content.socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Willow Weave on TikTok"
                className="rounded-full border border-line p-2 text-bark transition-colors hover:border-walnut hover:text-walnut"
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* shop */}
        <nav aria-label="Shop">
          <p className="mb-3 text-[0.7rem] font-semibold tracking-[0.15em] text-umber uppercase">
            Shop
          </p>
          <ul className="space-y-2.5 text-sm text-bark">
            <li><Link href="/products" className="hover:text-walnut">All Products</Link></li>
            <li><Link href="/collections" className="hover:text-walnut">Collections</Link></li>
            <li><Link href="/collections/2-piece" className="hover:text-walnut">2-Piece Suits</Link></li>
            <li><Link href="/collections/3-piece" className="hover:text-walnut">3-Piece Suits</Link></li>
            <li><Link href="/collections/tops" className="hover:text-walnut">Tops</Link></li>
          </ul>
        </nav>

        {/* help */}
        <nav aria-label="Help">
          <p className="mb-3 text-[0.7rem] font-semibold tracking-[0.15em] text-umber uppercase">
            Help
          </p>
          <ul className="space-y-2.5 text-sm text-bark">
            <li><Link href="/size-guide" className="hover:text-walnut">Size Guide</Link></li>
            <li><Link href="/contact" className="hover:text-walnut">Contact Us</Link></li>
            <li><Link href="/policies/shipping-policy" className="hover:text-walnut">Shipping Policy</Link></li>
            <li><Link href="/policies/refund-policy" className="hover:text-walnut">Refund Policy</Link></li>
          </ul>
        </nav>

        {/* company */}
        <nav aria-label="Company">
          <p className="mb-3 text-[0.7rem] font-semibold tracking-[0.15em] text-umber uppercase">
            Company
          </p>
          <ul className="space-y-2.5 text-sm text-bark">
            <li><Link href="/about" className="hover:text-walnut">About Us</Link></li>
            <li><Link href="/philosophy" className="hover:text-walnut">Philosophy Behind Logo</Link></li>
            <li><Link href="/policies/privacy-policy" className="hover:text-walnut">Privacy Policy</Link></li>
            <li><Link href="/policies/terms-of-service" className="hover:text-walnut">Terms of Service</Link></li>
          </ul>
          <div className="mt-5 space-y-1.5 text-xs text-umber">
            <p className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> +92 300 0535503
            </p>
            <p className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> willowweave.co@gmail.com
            </p>
          </div>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="container-site flex flex-col items-center justify-between gap-2 py-5 text-xs text-umber sm:flex-row">
          <p>© {year} Willow Weave. All rights reserved.</p>
          <p>Cash on Delivery across Pakistan 🇵🇰</p>
        </div>
      </div>
    </footer>
  );
}
