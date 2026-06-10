/**
 * Public types exposed by @strmlsys/booking-engine. These mirror the shapes
 * returned by Spaboard's /api/public/v1/* endpoints (see lib/api/v1/types.ts
 * in the Spaboard repo).
 *
 * Neutral terminology throughout — "business" not "spa." The package powers
 * any service business: spas, salons, dentists, gyms, consultants, restaurants.
 */

/** A business that exposes a public booking page. */
export interface Business {
  id: string
  slug: string
  name: string
  logo_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  instagram_url: string | null
  payment_requirement: "full" | "percentage" | "fixed" | "none"
  deposit_percentage: number
  /** Deposit in the smallest currency unit (e.g. centavos for COP). */
  deposit_fixed_amount: number
  /** ISO 4217 currency code. Currently always COP for Spaboard tenants. */
  currency: "COP"
}

/** A bookable service offered by a business. */
export interface Service {
  id: string
  business_id: string
  name: string
  description: string | null
  duration_minutes: number
  /** Price in the smallest currency unit (centavos for COP). */
  price: number
  currency: "COP"
  category: string | null
  photo_url: string | null
  staff_required_count: number | null
  require_room: boolean | null
}

/** A single bookable time slot returned by the availability endpoint. */
export interface AvailabilitySlot {
  start_time: string
  end_time: string
  available_staff_ids: string[]
  available_staff_names: string[]
  available_room_ids: string[]
  staff_count?: number
}

/** Customer payload submitted with a new appointment. */
export interface CustomerInput {
  name: string
  /** E.164 format with country code, e.g. "+573001234567". */
  phone: string
  email?: string
  /** YYYY-MM-DD */
  dateOfBirth: string
}

/** Input for POST /businesses/:slug/appointments. */
export interface CreateAppointmentInput {
  serviceId: string
  /** ISO timestamp or YYYY-MM-DDTHH:mm:ss accepted by Postgres timestamp. */
  startTime: string
  customer: CustomerInput
  giftCode?: string
  staffId?: string
  staffIds?: string[]
  roomId?: string
  payInFull?: boolean
}

/** Input for POST /businesses/:slug/gift-cards. */
export interface CreateGiftCardInput {
  /** Amount in smallest currency unit (centavos for COP). */
  amount: number
  purchaserName: string
  purchaserEmail: string
  purchaserPhone: string
  isGifted?: boolean
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  message?: string
  giftedServiceId?: string
}

/** Response from POST /businesses/:slug/gift-cards/redeem. */
export interface GiftCardValidation {
  valid: boolean
  remaining_amount_cop?: number
  reason?: string
  [key: string]: unknown
}

/**
 * Response from /appointments and /gift-cards checkout endpoints.
 * Pass-through of the underlying Postgres RPC result. Shape varies by
 * whether the booking auto-confirmed (no Wompi needed) or requires payment.
 */
export interface AppointmentResult {
  appointment_id?: string
  payment_id?: string | null
  wompi_reference?: string | null
  wompi_signature?: string | null
  wompi_public_key?: string | null
  amount_in_cents?: number
  /** Allow additional fields without forcing every consumer to handle them. */
  [key: string]: unknown
}

export interface GiftCardResult {
  gift_card_id?: string
  payment_id?: string | null
  wompi_reference?: string | null
  wompi_signature?: string | null
  wompi_public_key?: string | null
  amount_in_cents?: number
  [key: string]: unknown
}

/** Reference types used when saving the Wompi transaction id post-redirect. */
export type ReferenceType = "appointment" | "gift_card"
