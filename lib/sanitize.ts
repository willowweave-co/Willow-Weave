import sanitizeHtmlLib from "sanitize-html";

/**
 * Allowlist sanitizer for owner-entered rich text (product/collection
 * descriptions, editable site pages and policies). Everything here is later
 * rendered with dangerouslySetInnerHTML on the public storefront AND fed back
 * into the admin editor's innerHTML, so anything that survives this runs in
 * both a shopper's and the owner's browser.
 *
 * Deliberately an allowlist, not a blocklist: the previous regex approach
 * stripped only *quoted* event handlers, so `<img src=x onerror=alert(1)>`
 * went straight through.
 *
 * The tag/attribute set mirrors exactly what components/ui/rich-text.tsx can
 * produce (execCommand marks, lists, links, alignment, list-style-type).
 */

/**
 * Covers both what the editor emits AND what the migrated Shopify copy already
 * contains (p, span, br, h1, h3, h4, b, i, strong, ul, li, div, img, hr, a) —
 * so re-saving an existing product doesn't silently delete its content.
 */
const ALLOWED_TAGS = [
  "p", "br", "hr", "div", "span",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike",
  "ul", "ol", "li",
  "a", "img",
  "blockquote",
  "table", "thead", "tbody", "tr", "th", "td",
];

const options: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ["href", "target", "rel"],
    // no event handlers can survive an attribute allowlist — that is the whole
    // point of it. src is additionally constrained to http/https by
    // allowedSchemes (no javascript:, no data:).
    img: ["src", "alt", "width", "height", "loading"],
    // execCommand's justify* writes inline text-align; the list-style selects
    // write list-style-type. Both are constrained by allowedStyles below.
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
      "list-style-type": [
        /^(disc|circle|square|decimal|lower-alpha|upper-alpha|lower-roman|upper-roman)$/,
      ],
    },
  },
  // http/https/mailto/tel only — no javascript:, no data:
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // relative links like /size-guide must keep working
  allowProtocolRelative: false,
  // anything not on the list is dropped tag-and-all (not just unwrapped), so a
  // <script> or <iframe> body can't leak through as text
  nonTextTags: ["style", "script", "textarea", "option", "noscript", "iframe"],
  transformTags: {
    // external links open safely; internal ones are left alone
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: external
          ? { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" }
          : attribs,
      };
    },
  },
};

export function sanitizeRichText(html: string): string {
  if (!html) return "";
  return sanitizeHtmlLib(html, options);
}
