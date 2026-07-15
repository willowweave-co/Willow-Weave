/**
 * Countries the owner can enable for international shipping — the markets
 * with the most online shoppers plus the Pakistani-diaspora heavy ones.
 * Deliberately NOT the whole world, and India is excluded (no shipping
 * route). Pakistan is the domestic market and always available at checkout.
 * Client-safe constants.
 */
export const DOMESTIC_COUNTRY = "Pakistan";

export const SHIPPABLE_COUNTRIES: string[] = [
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Saudi Arabia",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Netherlands",
  "Ireland",
  "Norway",
  "Sweden",
  "Denmark",
  "Turkey",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Malaysia",
  "Singapore",
  "Japan",
  "South Korea",
  "China",
  "New Zealand",
  "Bangladesh",
];
