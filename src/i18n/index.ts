/**
 * Localization for @strmlsys/booking-engine.
 *
 * Two locales at launch: "es" (Spanish, default — Spaboard's existing market)
 * and "en" (English). Adding more is a one-file PR: copy ./es.ts, translate,
 * register in SUPPORTED_LOCALES + LOCALE_MAP below.
 *
 * Resolution order (in <BookingFlow>):
 *   1. Explicit `locale` prop
 *   2. business.default_locale (future field on Business)
 *   3. navigator.language (browser only)
 *   4. Fallback to "es"
 */

import { es } from "./es"
import { en } from "./en"

export const SUPPORTED_LOCALES = ["es", "en"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

/**
 * The full translation shape. `es` is the source of truth for which keys
 * exist; this type widens those keys' literal-string types to `string` so
 * other locales can supply different translations for the same keys.
 */
export type Translations = WidenStrings<typeof es>

type WidenStrings<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenStrings<U>[]
    : T extends Record<string, unknown>
      ? { [K in keyof T]: WidenStrings<T[K]> }
      : T

const LOCALE_MAP: Record<Locale, Translations> = { es, en }

/** Look up a translations dict by locale. Falls back to "es". */
export function getTranslations(locale: string | undefined | null): Translations {
  if (!locale) return LOCALE_MAP.es
  // Normalize "es-CO" → "es", "en-US" → "en"
  const base = locale.toLowerCase().split("-")[0] as Locale
  return LOCALE_MAP[base] ?? LOCALE_MAP.es
}

export { es, en }
