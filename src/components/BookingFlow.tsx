"use client"

import { useEffect, useMemo, useState } from "react"
import { BookingPage } from "./BookingPage"
import {
  createClient,
  type BookingClient,
} from "../sdk"
import {
  resolveTheme,
  themeToCssVars,
  type PartialBookingTheme,
} from "../theme"
import {
  getTranslations,
  type Locale,
  type Translations,
} from "../i18n"
import { businessToSpa, serviceToPublicService } from "./adapters"
import type { Business, Service } from "../types"

export interface BookingFlowProps {
  /**
   * The slug identifying which business this flow is booking for. Must match
   * the business's slug in Spaboard's database.
   */
  businessId: string

  /**
   * The base URL of Spaboard's public v1 API.
   * Example: "https://app.lumiagenda.co/api/public/v1"
   *
   * Defaults to `process.env.NEXT_PUBLIC_SPABOARD_API_URL` when running inside
   * a Next.js app that exposes that env var.
   */
  apiUrl?: string

  /**
   * Visual theming. Pass any subset; missing keys fall back to the engine's
   * defaults (Spaboard's beige+black look).
   */
  theme?: PartialBookingTheme

  /**
   * UI locale. Defaults to "es" (Spanish). Pass "en" for English, or extend
   * the package with additional locales as needed.
   */
  locale?: Locale

  /**
   * Optional: render this when data is still loading. Otherwise a minimal
   * skeleton is used.
   */
  loadingFallback?: React.ReactNode

  /**
   * Optional: render this if the business slug can't be found or the API
   * returns an error.
   */
  errorFallback?: (error: Error) => React.ReactNode

  /**
   * Override the URL Wompi redirects to after payment. Defaults to
   * `${origin}/book/${businessId}/result?appointment_id=...` (Spaboard's
   * convention). Tier 2 sites should point this at their own result page.
   */
  paymentRedirectUrl?: string

  /**
   * Optional: invoked when the user clicks "Buy a gift card" on the landing
   * page. Tier 2 sites can route to their own gift-card flow. If omitted,
   * the link is hidden.
   */
  onBuyGiftCard?: () => void
}

/**
 * The single React component every consumer of @strmlsys/booking-engine
 * should reach for first. Drops onto any page; renders the full booking
 * experience (service list → date → time → customer form → payment).
 *
 *   import { BookingFlow } from "@strmlsys/booking-engine"
 *
 *   <BookingFlow businessId="casaverde" />
 *
 * Internally:
 *  1. Uses the SDK to load the business + services from Spaboard's v1 API.
 *  2. Resolves theme + locale.
 *  3. Renders the booking page/modal stack inside a themed wrapper.
 *
 * Power users who want different layouts or a custom UX should compose with
 * the lower-level sub-components or call `createClient()` directly.
 */
export function BookingFlow({
  businessId,
  apiUrl,
  theme,
  locale,
  loadingFallback,
  errorFallback,
  paymentRedirectUrl,
  onBuyGiftCard,
}: BookingFlowProps) {
  const resolvedApiUrl =
    apiUrl ??
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SPABOARD_API_URL
      : undefined)

  if (!resolvedApiUrl) {
    throw new Error(
      "BookingFlow: `apiUrl` is required. Pass it as a prop or set " +
        "NEXT_PUBLIC_SPABOARD_API_URL in your environment."
    )
  }

  const client = useMemo<BookingClient>(
    () => createClient({ apiUrl: resolvedApiUrl, businessId }),
    [resolvedApiUrl, businessId]
  )

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme])
  const t = useMemo<Translations>(() => getTranslations(locale ?? "es"), [locale])

  const [data, setData] = useState<{
    business: Business
    services: Service[]
    wompi_public_key: string | null
  } | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)

    client
      .getBusiness()
      .then((result) => {
        if (cancelled) return
        setData(result)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
      })

    return () => {
      cancelled = true
    }
  }, [client])

  if (error) {
    if (errorFallback) return <>{errorFallback(error)}</>
    return (
      <div
        role="alert"
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "#b00020",
          fontFamily: resolvedTheme.fontBody,
        }}
      >
        {t.common.error_generic}
      </div>
    )
  }

  if (!data) {
    if (loadingFallback) return <>{loadingFallback}</>
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: resolvedTheme.muted,
          fontFamily: resolvedTheme.fontBody,
        }}
      >
        {t.common.loading}
      </div>
    )
  }

  return (
    <div style={themeToCssVars(resolvedTheme)} className="be-root">
      <BookingPage
        slug={businessId}
        spa={businessToSpa(data.business)}
        services={data.services.map(serviceToPublicService)}
        client={client}
        wompiPublicKey={data.wompi_public_key}
        translations={t}
        paymentRedirectUrl={paymentRedirectUrl}
        onBuyGiftCard={onBuyGiftCard}
      />
    </div>
  )
}
