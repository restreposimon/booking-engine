"use client"

import { useEffect, useMemo, useState } from "react"
import { GiftCardPage } from "./GiftCardPage"
import { createClient, type BookingClient } from "../sdk"
import {
  resolveTheme,
  themeToCssVars,
  type PartialBookingTheme,
} from "../theme"
import { getTranslations, type Locale, type Translations } from "../i18n"
import { businessToSpa, serviceToPublicService } from "./adapters"
import type { Business, Service } from "../types"

export interface GiftCardFlowProps {
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

  /**
   * Route gift-card purchases through Wompi's sandbox (`is_test=true`). Wire
   * to an env var on Tier 2 sites. Defaults to false (production).
   */
  testMode?: boolean

  /** Optional loading state. */
  loadingFallback?: React.ReactNode

  /** Optional error state. */
  errorFallback?: (error: Error) => React.ReactNode

  /** Forwarded to GiftCardModal — overrides the post-payment redirect URL. */
  giftCardRedirectUrl?: string

  /** Forwarded to GiftCardPage — where "Back to booking" points. */
  bookingUrl?: string
}

/**
 * Drop-in gift-card purchase experience, mirroring <BookingFlow>. Loads the
 * business + services from Spaboard's v1 API, then renders a themed gift-card
 * landing page + purchase modal.
 *
 *   import { GiftCardFlow } from "@strmlsys/booking-engine"
 *
 *   <GiftCardFlow businessId="casaverde" />
 */
export function GiftCardFlow({
  businessId,
  apiUrl,
  theme,
  locale,
  testMode,
  loadingFallback,
  errorFallback,
  giftCardRedirectUrl,
  bookingUrl,
}: GiftCardFlowProps) {
  const resolvedApiUrl =
    apiUrl ??
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SPABOARD_API_URL
      : undefined)

  if (!resolvedApiUrl) {
    throw new Error(
      "GiftCardFlow: `apiUrl` is required. Pass it as a prop or set " +
        "NEXT_PUBLIC_SPABOARD_API_URL in your environment."
    )
  }

  const client = useMemo<BookingClient>(
    () => createClient({ apiUrl: resolvedApiUrl, businessId, testMode }),
    [resolvedApiUrl, businessId, testMode]
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
      <GiftCardPage
        slug={businessId}
        spa={businessToSpa(data.business)}
        services={data.services.map(serviceToPublicService)}
        client={client}
        wompiPublicKey={data.wompi_public_key}
        translations={t}
        giftCardRedirectUrl={giftCardRedirectUrl}
        bookingUrl={bookingUrl}
      />
    </div>
  )
}
