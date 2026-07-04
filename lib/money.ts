/** PKR money formatting, matching the store's "Rs. X,XXX" style. */
export function formatPKR(amount: number): string {
  const whole = Number.isInteger(amount);
  return `Rs. ${amount.toLocaleString("en-PK", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function discountPercent(price: number, compareAt: number | null): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
