import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, Truck, BadgeCheck, MessageCircle } from "lucide-react";
import { THEME_IMAGES } from "@/lib/content";
import { repo } from "@/lib/data";

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

function WhatsAppIcon({ className }: { className?: string }) {
  // Simple Icons "WhatsApp" glyph (CC0)
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
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
  { icon: MessageCircle, title: "WhatsApp Support", text: "Questions answered fast — we're one message away" },
];

export async function Footer() {
  const { contact } = await repo.getSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-parchment/50">
      {/* value props — justify-items centres each block within its third */}
      <div className="container-site grid gap-6 border-b border-line py-10 sm:grid-cols-3 sm:justify-items-center">
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
            {contact.facebook && (
              <a
                href={contact.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Willow Weave on Facebook"
                className="rounded-full border border-line p-2 text-bark transition-colors hover:border-walnut hover:text-walnut"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
            )}
            {contact.instagram && (
              <a
                href={contact.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Willow Weave on Instagram"
                className="rounded-full border border-line p-2 text-bark transition-colors hover:border-walnut hover:text-walnut"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
            )}
            {contact.tiktok && (
              <a
                href={contact.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Willow Weave on TikTok"
                className="rounded-full border border-line p-2 text-bark transition-colors hover:border-walnut hover:text-walnut"
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
            )}
            <a
              href={`https://wa.me/${contact.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Willow Weave on WhatsApp"
              className="rounded-full border border-line p-2 text-bark transition-colors hover:border-walnut hover:text-walnut"
            >
              <WhatsAppIcon className="h-4 w-4" />
            </a>
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
              <Phone className="h-3.5 w-3.5" /> {contact.phone}
            </p>
            <p className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {contact.email}
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
