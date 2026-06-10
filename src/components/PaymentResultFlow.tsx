"use client"

import { useMemo } from "react"
import { PaymentResult } from "./PaymentResult"
import { createClient, type BookingClient } from "../sdk"
import { resolveTheme, themeToCssVars, type PartialBookingTheme } from "../theme"
import { getTranslations, type Locale, type Translations } from "../i18n"

export interface PaymentResultFlowProps {
  /** Business slug — must match the business's slug in Spaboard's database. */
  businessId: string

  /**
   * Base URL of Spaboard's public v1 API.
   * Defaults to `process.env.NEXT_PUBLIC_SPABOARD_API_URL`.
   */
  apiUrl?: string

  /** Visual theming. Any subset; missing keys fall back to engine defaults. */
  theme?: PartialBookingTheme

  /** UI locale. Defaults to "es". */
  locale?: Locale

  /** Forwarded to PaymentResult — where the action button points. */
  backUrl?: string
}

/**
 * Drop-in payment-result screen, mirroring <BookingFlow> / <GiftCardFlow>.
 * Unlike those, it does NOT fetch business data — the result page must stay
 * fast and resilient even if the API is slow, so it only needs the SDK client
 * (for the best-effort `saveTransaction` call), theme, and locale.
 *
 *   import { PaymentResultFlow } from "@strmlsys/booking-engine"
 *
 *   <PaymentResultFlow businessId="casaverde" />
 */
export function PaymentResultFlow({
  businessId,
  apiUrl,
  theme,
  locale,
  backUrl,
}: PaymentResultFlowProps) {
  const resolvedApiUrl =
    apiUrl ??
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SPABOARD_API_URL
      : undefined)

  if (!resolvedApiUrl) {
    throw new Error(
      "PaymentResultFlow: `apiUrl` is required. Pass it as a prop or set " +
        "NEXT_PUBLIC_SPABOARD_API_URL in your environment."
    )
  }

  const client = useMemo<BookingClient>(
    () => createClient({ apiUrl: resolvedApiUrl, businessId }),
    [resolvedApiUrl, businessId]
  )

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme])
  const t = useMemo<Translations>(() => getTranslations(locale ?? "es"), [locale])

  return (
    <div style={themeToCssVars(resolvedTheme)} className="be-root">
      <PaymentResult slug={businessId} client={client} translations={t} backUrl={backUrl} />
    </div>
  )
}
