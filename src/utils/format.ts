/**
 * Currency formatting for the booking engine.
 *
 * IMPORTANT MONEY RULE (COP — Spaboard's current convention):
 * - Values are stored as PESOS (integer), not cents.
 *   Example: 300000 represents "300.000 COP".
 * - Only Wompi requires "amount-in-cents" (pesos × 100), handled in the
 *   payment-step component just before the redirect.
 */

/**
 * Format an integer amount with the business's currency. Currently COP-only;
 * adding other currencies is a switch statement here when we expand.
 *
 * @param value Amount in the smallest currency unit (pesos for COP).
 * @param currency ISO 4217 currency code. Defaults to "COP".
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: "COP" = "COP"
): string {
  if (value === null || value === undefined) return "—"

  const formatted = formatNumberWithPunctuation(value)
  switch (currency) {
    case "COP":
      return `${formatted} COP`
    default:
      return `${formatted} ${currency}`
  }
}

/** Colombian-style number formatting: dots as thousands separators. */
export function formatNumberWithPunctuation(value: number | string): string {
  const cleaned = String(value).replace(/\./g, "").replace(/,/g, ".")
  const num = parseFloat(cleaned)
  if (isNaN(num)) return ""

  const parts = num.toString().split(".")
  const integerPart = parts[0] || ""
  const decimalPart = parts[1] || ""

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return decimalPart ? `${formattedInteger},${decimalPart}` : formattedInteger
}

/** Pesos to Wompi cents — Wompi's API expects cents. */
export function pesosToCents(pesos: number): number {
  return Math.round(pesos * 100)
}

/**
 * Simple template interpolation for i18n strings.
 *
 *   interpolate("Step {{current}} of {{total}}", { current: 2, total: 5 })
 *   // → "Step 2 of 5"
 */
export function interpolate(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{{${key}}}`
  )
}
