/**
 * @strmlsys/booking-engine
 *
 * Reusable booking engine used by Spaboard's own booking page and every
 * Tier 2 custom client website. One source of truth — bugfixes and
 * features propagate to every consumer.
 *
 * Primary entry points:
 *   - <BookingFlow>      — the main React component to drop into any page
 *   - createClient()     — the low-level SDK that wraps the public v1 API
 *   - Theme / i18n types — for fine-grained customization
 *
 * See README.md for setup and usage.
 */

// SDK
export {
  createClient,
  type BookingClient,
  type ApiError,
} from "./sdk"

// Types — neutral, business-agnostic (no "spa" terminology)
export type {
  Business,
  Service,
  AvailabilitySlot,
  CreateAppointmentInput,
  CreateGiftCardInput,
  GiftCardValidation,
  AppointmentResult,
  GiftCardResult,
  ReferenceType,
} from "./types"

// Theme tokens + helpers
export {
  defaultTheme,
  resolveTheme,
  themeToCssVars,
  type BookingTheme,
  type PartialBookingTheme,
} from "./theme"

// i18n
export {
  type Locale,
  type Translations,
  getTranslations,
  SUPPORTED_LOCALES,
} from "./i18n"

// Main React components — the primary entry points most consumers will use.
// One per flow: booking, gift-card purchase, and the post-payment result.
export { BookingFlow, type BookingFlowProps } from "./components/BookingFlow"
export { GiftCardFlow, type GiftCardFlowProps } from "./components/GiftCardFlow"
export {
  PaymentResultFlow,
  type PaymentResultFlowProps,
} from "./components/PaymentResultFlow"

// Sub-components — exposed for power users who want a different layout while
// keeping the engine's data fetching and security model.
export { BookingPage } from "./components/BookingPage"
export { ServiceCard } from "./components/ServiceCard"
export { PublicHeader } from "./components/PublicHeader"
export { GiftCardPage } from "./components/GiftCardPage"
export { GiftCardModal } from "./components/GiftCardModal"
export { PaymentResult } from "./components/PaymentResult"

// Currency / format helpers — useful for matching the engine's formatting in
// surrounding site copy (e.g. pricing pages, gift card amounts).
export {
  formatCurrency,
  formatNumberWithPunctuation,
  pesosToCents,
} from "./utils/format"
