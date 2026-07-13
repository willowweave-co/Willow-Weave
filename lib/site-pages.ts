/**
 * Registry of the site pages editable from Admin → Pages.
 * Pure constants — safe for both server and client components.
 * Defaults (when no override is saved) come from data/content.json.
 */

export interface EditablePage {
  handle: string;
  label: string;
  /** Storefront path, also used for "View live" links. */
  path: string;
  /** Which slice of content.json supplies the default copy. */
  source: "page" | "policy" | "contact";
}

export const EDITABLE_PAGES: EditablePage[] = [
  { handle: "about", label: "About Us", path: "/about", source: "page" },
  { handle: "philosophy", label: "Philosophy Behind Logo", path: "/philosophy", source: "page" },
  { handle: "contact", label: "Contact — intro text", path: "/contact", source: "contact" },
  { handle: "privacy-policy", label: "Privacy Policy", path: "/policies/privacy-policy", source: "policy" },
  { handle: "refund-policy", label: "Refund Policy", path: "/policies/refund-policy", source: "policy" },
  { handle: "terms-of-service", label: "Terms of Service", path: "/policies/terms-of-service", source: "policy" },
  { handle: "shipping-policy", label: "Shipping Policy", path: "/policies/shipping-policy", source: "policy" },
];

export function isEditablePage(handle: string): boolean {
  return EDITABLE_PAGES.some((p) => p.handle === handle);
}

/** Default copy for the contact page intro (the rest of that page is structured). */
export const CONTACT_DEFAULT = {
  title: "Contact Willow Weave",
  bodyHtml:
    "<p>Questions about sizing, an order on its way, or a piece you have your eye on — reach out through any of these and we’ll get back to you quickly.</p>",
};

export interface SitePage {
  handle: string;
  title: string;
  bodyHtml: string;
}
