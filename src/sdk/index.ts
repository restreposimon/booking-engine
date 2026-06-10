/**
 * Booking SDK — thin typed wrapper over Spaboard's /api/public/v1/* endpoints.
 *
 * Usage:
 *
 *   const client = createClient({
 *     apiUrl: "https://app.lumiagenda.co/api/public/v1",
 *     businessId: "casaverde",
 *   })
 *
 *   const business = await client.getBusiness()
 *   const dates = await client.getAvailableDates({ serviceId, startDate, endDate })
 *   const result = await client.createAppointment({ ... })
 *
 * Every method throws an `ApiError` on non-2xx responses so callers can use a
 * single try/catch instead of inspecting `.error` on each call.
 */

import type {
  Business,
  Service,
  AvailabilitySlot,
  CreateAppointmentInput,
  CreateGiftCardInput,
  GiftCardValidation,
  AppointmentResult,
  GiftCardResult,
  ReferenceType,
} from "../types"

export interface CreateClientOptions {
  /** Base URL of the Spaboard public v1 API, e.g. "https://app.lumiagenda.co/api/public/v1". */
  apiUrl: string
  /** Public slug identifying the business this client is bound to. */
  businessId: string
  /**
   * When true, mutation endpoints (`appointments`, `gift-cards`) route to
   * the `/test/*` variants which force Wompi sandbox and stamp `is_test=true`
   * on every row. Read endpoints (business, availability, dates) are
   * unaffected — they return the same data either way.
   *
   * Defaults to false (production mode). Tier 2 sites typically wire this
   * to an env var: `<BookingFlow testMode={process.env.NEXT_PUBLIC_TEST_MODE === 'true'} />`.
   */
  testMode?: boolean
  /**
   * Optional fetch implementation. Defaults to the global `fetch`. Useful for
   * tests, server-side rendering, or instrumented fetches.
   */
  fetch?: typeof fetch
}

/**
 * Error thrown by SDK methods when the API returns a non-2xx response.
 * Mirrors the standard v1 error envelope: { error: { code, message, details? } }.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

interface V1ErrorBody {
  error?: { code?: string; message?: string; details?: unknown }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T
  }

  let body: V1ErrorBody = {}
  try {
    body = (await response.json()) as V1ErrorBody
  } catch {
    // Non-JSON error response; fall through to generic message.
  }

  throw new ApiError(
    response.status,
    body.error?.code ?? "unknown",
    body.error?.message ?? `Request failed with status ${response.status}`,
    body.error?.details
  )
}

export interface BookingClient {
  /** Returns business metadata + active services + the Wompi public key. */
  getBusiness(): Promise<{
    business: Business
    services: Service[]
    wompi_public_key: string | null
  }>

  /** Returns dates that have at least one open slot in the given range. */
  getAvailableDates(input: {
    serviceId: string
    /** YYYY-MM-DD */
    startDate: string
    /** YYYY-MM-DD */
    endDate: string
  }): Promise<{ dates: string[] }>

  /** Returns the open time slots for a specific date. */
  getAvailability(input: {
    serviceId: string
    /** YYYY-MM-DD */
    date: string
  }): Promise<{ slots: AvailabilitySlot[] }>

  /** Creates a pending appointment + Wompi payment URL. */
  createAppointment(input: CreateAppointmentInput): Promise<AppointmentResult>

  /** Creates a pending gift card + Wompi payment URL. */
  createGiftCard(input: CreateGiftCardInput): Promise<GiftCardResult>

  /** Validates a gift card code (read-only). */
  redeemGiftCard(code: string): Promise<GiftCardValidation>

  /** Records the Wompi transaction id post-redirect. */
  saveTransaction(
    referenceId: string,
    input: { wompiTransactionId: string; referenceType: ReferenceType }
  ): Promise<{ ok: true; data: unknown }>
}

/**
 * Creates a typed SDK client bound to one Spaboard API + one business slug.
 * Cheap; no network call. Safe to create per-render if convenient.
 */
export function createClient(options: CreateClientOptions): BookingClient {
  const { apiUrl, businessId, testMode = false } = options
  const fetchImpl = options.fetch ?? globalThis.fetch

  if (!apiUrl) throw new Error("createClient: apiUrl is required")
  if (!businessId) throw new Error("createClient: businessId is required")

  const trimmedApi = apiUrl.replace(/\/+$/, "")
  const businessUrl = `${trimmedApi}/businesses/${encodeURIComponent(businessId)}`
  // Test-mode mutations route to /test/* parallel endpoints which force
  // Wompi sandbox credentials and stamp is_test=true on every row.
  const mutationBase = testMode ? `${businessUrl}/test` : businessUrl

  const jsonHeaders = { "Content-Type": "application/json" }

  return {
    async getBusiness() {
      const response = await fetchImpl(businessUrl, { method: "GET" })
      return handleResponse(response)
    },

    async getAvailableDates(input) {
      const response = await fetchImpl(`${businessUrl}/available-dates`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(input),
      })
      return handleResponse(response)
    },

    async getAvailability(input) {
      const response = await fetchImpl(`${businessUrl}/availability`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(input),
      })
      return handleResponse(response)
    },

    async createAppointment(input) {
      const response = await fetchImpl(`${mutationBase}/appointments`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(input),
      })
      return handleResponse(response)
    },

    async createGiftCard(input) {
      const response = await fetchImpl(`${mutationBase}/gift-cards`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(input),
      })
      return handleResponse(response)
    },

    async redeemGiftCard(code) {
      const response = await fetchImpl(`${businessUrl}/gift-cards/redeem`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ code }),
      })
      return handleResponse(response)
    },

    async saveTransaction(referenceId, input) {
      const response = await fetchImpl(
        `${trimmedApi}/payments/${encodeURIComponent(referenceId)}/save-transaction`,
        {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify(input),
        }
      )
      return handleResponse(response)
    },
  }
}
