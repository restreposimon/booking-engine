"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, Check, Clock, MapPin, User } from "lucide-react"
import { formatCurrency as formatCurrencyFromCents, interpolate } from "../utils/format"
import type { BookingData, PublicSpa } from "./internal-types"
import type { BookingClient } from "../sdk"
import type { Translations } from "../i18n"

interface PaymentStepProps {
  slug: string
  spa: PublicSpa
  bookingData: BookingData
  onBack: () => void
  onComplete: () => void
  client: BookingClient
  wompiPublicKey: string | null
  translations: Translations
  /**
   * Override the URL Wompi redirects the customer to after payment.
   * Defaults to `${origin}/book/${slug}/result?appointment_id=...` (Spaboard's
   * convention). Tier 2 client sites can point this at their own result page.
   * The `{appointment_id}` placeholder is interpolated; if your URL doesn't
   * have a placeholder it's appended as a query param.
   */
  paymentRedirectUrl?: string
}

interface PreparedPayment {
  amount_to_charge_cop: number
  amount_in_cents: number
  wompi_public_key: string | null
  wompi_reference: string | null
  wompi_signature: string | null
  appointment_id: string | null
}

function buildRedirectUrl(
  origin: string,
  slug: string,
  appointmentId: string | null | undefined,
  override?: string
): string {
  if (override) {
    const url = override.includes("{appointment_id}")
      ? override.replace("{appointment_id}", appointmentId ?? "")
      : `${override}${override.includes("?") ? "&" : "?"}appointment_id=${appointmentId ?? ""}`
    return url
  }
  return `${origin}/book/${slug}/result?appointment_id=${appointmentId ?? ""}`
}

function formatTimeDisplay(timeString: string): string {
  const match = timeString.match(/(\d{2}):(\d{2})/)
  if (!match || !match[1] || !match[2]) return timeString
  const hours = parseInt(match[1], 10)
  const minutes = match[2]
  const ampm = hours >= 12 ? "PM" : "AM"
  const displayHour = hours % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export function PaymentStep({
  slug,
  spa,
  bookingData,
  onBack,
  onComplete,
  client,
  wompiPublicKey,
  translations,
  paymentRedirectUrl,
}: PaymentStepProps) {
  const t = translations
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prepared, setPrepared] = useState<PreparedPayment | null>(null)
  const [origin, setOrigin] = useState("")
  const [payInFull, setPayInFull] = useState(false)

  const totalPrice = bookingData.service?.price_cop ?? 0
  const giftAmount = bookingData.giftCard?.amount ?? 0
  const finalPrice = Math.max(0, totalPrice - giftAmount)

  const requiredDeposit = useMemo(() => {
    switch (spa.payment_requirement) {
      case "none":
        return 0
      case "percentage":
        return Math.min(Math.ceil((totalPrice * spa.deposit_percentage) / 100), totalPrice)
      case "fixed":
        return Math.min(spa.deposit_fixed_amount_cop, totalPrice)
      case "full":
      default:
        return totalPrice
    }
  }, [spa, totalPrice])

  const depositCharge = Math.max(0, requiredDeposit - giftAmount)
  const fullCharge = finalPrice
  const hasChoice =
    spa.payment_requirement !== "full" &&
    spa.payment_requirement !== "none" &&
    depositCharge < fullCharge
  const amountNow = payInFull ? fullCharge : depositCharge
  const amountLater = fullCharge - amountNow

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!prepared || !formRef.current) return
    formRef.current.submit()
  }, [prepared])

  const startTime = useMemo(() => {
    if (!bookingData.timeSlot) return ""
    return bookingData.timeSlot.startTime
  }, [bookingData.timeSlot])

  async function handlePay() {
    if (!bookingData.service || !bookingData.timeSlot || !bookingData.date) return
    setError(null)
    setLoading(true)
    try {
      const data = (await client.createAppointment({
        serviceId: bookingData.service.id,
        startTime,
        customer: {
          name: bookingData.customer.name,
          email: bookingData.customer.email || undefined,
          phone: bookingData.customer.phone,
          dateOfBirth: bookingData.customer.dateOfBirth,
        },
        giftCode: bookingData.giftCard?.code || undefined,
        staffIds:
          (bookingData.service.staff_required_count ?? 1) > 1
            ? undefined
            : bookingData.timeSlot.staffIds?.slice(0, 1) || undefined,
        roomId: bookingData.timeSlot.roomId ?? undefined,
        payInFull,
      })) as unknown as PreparedPayment

      if (
        (data.amount_to_charge_cop ?? 0) > 0 &&
        data.wompi_public_key &&
        data.wompi_reference
      ) {
        setPrepared(data)
      } else {
        onComplete()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error_generic)
    } finally {
      setLoading(false)
    }
  }

  // Surfaces a sandbox/test-mode warning when the prepared payment uses a
  // Wompi sandbox key OR when the wompiPublicKey passed in from the parent
  // (BookingFlow) is a test key. Either signal is sufficient — we want to
  // catch the situation BEFORE the customer enters card details.
  const isTestMode =
    (prepared?.wompi_public_key?.startsWith("pub_test_") ?? false) ||
    (wompiPublicKey?.startsWith("pub_test_") ?? false)

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h3 className="mb-2 font-serif text-3xl text-black">{t.steps.payment.title}</h3>
        <p className="text-sm font-light tracking-wide text-black/60">
          {t.steps.payment.subtitle}
        </p>
      </div>

      {isTestMode ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-bold uppercase tracking-wider">{t.test_mode.banner_title}</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
              {t.test_mode.banner_desc.split("{{card}}").map((part, i) => (
                <span key={i}>
                  {i > 0 ? (
                    <code className="font-mono font-bold">{t.test_mode.test_card}</code>
                  ) : null}
                  {part}
                </span>
              ))}
            </p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
      ) : null}

      {/* Policies */}
      <div className="mb-6 rounded-xl border border-black/5 bg-[#f9f9f4] p-6">
        <h4 className="mb-4 font-serif text-lg text-black">{t.steps.payment.policies_title}</h4>
        <ul className="space-y-3 text-sm leading-relaxed text-black/80">
          <li className="flex items-start gap-2">
            <span className="mt-1 text-black/40">•</span>
            <span>{t.steps.payment.policy_punctuality}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 text-black/40">•</span>
            <span>{t.steps.payment.policy_no_refund}</span>
          </li>
        </ul>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Ticket / Summary Card */}
        <div className="relative overflow-hidden rounded-xl border border-black/5 bg-[#f9f9f4] p-6 md:p-8">
          <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />

          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                  {t.steps.payment.service}
                </p>
                <h4 className="font-serif text-xl text-black md:text-2xl">
                  {bookingData.service?.name}
                </h4>
              </div>
              <div className="text-right">
                <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                  {t.steps.payment.price}
                </p>
                <p className="font-sans text-lg font-light text-black">
                  {formatCurrencyFromCents(totalPrice)}
                </p>
              </div>
            </div>

            <div className="h-px w-full bg-black/10" />

            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-4 w-4 text-black/40" />
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                    {t.steps.payment.date}
                  </p>
                  <p className="font-sans text-sm text-black">
                    {bookingData.date
                      ? new Date(bookingData.date + "T00:00:00").toLocaleDateString(t.calendar.date_locale, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="mt-1 h-4 w-4 text-black/40" />
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                    {t.steps.payment.time}
                  </p>
                  <p className="font-sans text-sm text-black">
                    {bookingData.timeSlot
                      ? `${formatTimeDisplay(bookingData.timeSlot.startTime)} - ${formatTimeDisplay(bookingData.timeSlot.endTime)}`
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="mt-1 h-4 w-4 text-black/40" />
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                    {t.steps.payment.guest}
                  </p>
                  <p className="font-sans text-sm text-black">{bookingData.customer.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 text-black/40" />
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                    {t.steps.payment.location}
                  </p>
                  <p className="font-sans text-sm text-black">
                    {bookingData.timeSlot?.staffName || spa.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total */}
        <div className="mt-8 px-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-black/60">{t.steps.payment.subtotal}</span>
            <span>{formatCurrencyFromCents(totalPrice)}</span>
          </div>
          {giftAmount > 0 ? (
            <div className="mb-2 flex items-center justify-between text-sm text-green-700">
              <span>{t.steps.payment.gift_card_discount}</span>
              <span>- {formatCurrencyFromCents(giftAmount)}</span>
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4 text-sm text-black/60">
            <span>{t.steps.payment.total_service}</span>
            <span>{formatCurrencyFromCents(fullCharge)}</span>
          </div>

          {hasChoice ? (
            <div className="mt-6 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                {t.steps.payment.payment_option}
              </p>
              <button
                type="button"
                onClick={() => setPayInFull(false)}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${
                  !payInFull
                    ? "border-black bg-black text-[#f5f5dc]"
                    : "border-black/10 bg-white hover:border-black/40"
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{t.steps.payment.pay_deposit}</div>
                  <div className={`text-xs ${!payInFull ? "text-[#f5f5dc]/70" : "text-black/50"}`}>
                    {depositCharge > 0
                      ? interpolate(t.steps.payment.pay_remaining_on_arrival, {
                          amount: formatCurrencyFromCents(fullCharge - depositCharge),
                        })
                      : t.steps.payment.covered_by_gift_card}
                  </div>
                </div>
                <div className="font-serif text-lg">
                  {formatCurrencyFromCents(depositCharge)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPayInFull(true)}
                className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${
                  payInFull
                    ? "border-black bg-black text-[#f5f5dc]"
                    : "border-black/10 bg-white hover:border-black/40"
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{t.steps.payment.pay_full}</div>
                  <div className={`text-xs ${payInFull ? "text-[#f5f5dc]/70" : "text-black/50"}`}>
                    {t.steps.payment.nothing_on_arrival}
                  </div>
                </div>
                <div className="font-serif text-lg">
                  {formatCurrencyFromCents(fullCharge)}
                </div>
              </button>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4 font-serif text-xl">
            <span>{t.steps.payment.total_to_pay_now}</span>
            <span>{formatCurrencyFromCents(amountNow)}</span>
          </div>
          {amountLater > 0 ? (
            <div className="mt-1 flex items-center justify-between text-xs text-black/50">
              <span>{t.steps.payment.pending_on_arrival}</span>
              <span>{formatCurrencyFromCents(amountLater)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {loading || prepared ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 flex items-center justify-center gap-3 rounded-lg border border-black/10 bg-white px-4 py-5 text-sm text-black/70"
        >
          <svg
            className="h-5 w-5 animate-spin text-black"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-20"
            />
            <path
              d="M12 2a10 10 0 0110 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span>
            {prepared
              ? t.steps.payment.redirecting_to_gateway
              : t.steps.payment.preparing_payment}
          </span>
        </div>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-black/10 pt-4 sm:pt-6">
        <button
          onClick={onBack}
          disabled={loading || !!prepared}
          className="flex min-h-11 items-center border-b border-black pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:opacity-40"
        >
          {t.common.back}
        </button>
        <button
          onClick={() => void handlePay()}
          disabled={loading || !!prepared}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f5f5dc] shadow-lg transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:hover:scale-100 sm:px-8"
        >
          {loading || prepared
            ? t.steps.payment.redirecting
            : amountNow > 0
              ? t.steps.payment.proceed_to_payment
              : t.steps.payment.confirm_reservation}
          {!loading && !prepared ? <Check className="h-3 w-3" /> : null}
        </button>
      </div>

      {prepared ? (
        <form
          ref={formRef}
          method="GET"
          action="https://checkout.wompi.co/p/"
          className="hidden"
        >
          <input type="hidden" name="public-key" value={prepared.wompi_public_key ?? ""} />
          <input type="hidden" name="currency" value="COP" />
          <input
            type="hidden"
            name="amount-in-cents"
            value={String(prepared.amount_in_cents)}
          />
          <input type="hidden" name="reference" value={prepared.wompi_reference ?? ""} />
          {prepared.wompi_signature ? (
            <input type="hidden" name="signature:integrity" value={prepared.wompi_signature} />
          ) : null}
          <input
            type="hidden"
            name="redirect-url"
            value={buildRedirectUrl(origin, slug, prepared.appointment_id, paymentRedirectUrl)}
          />
          <input type="hidden" name="customer-data[full-name]" value={bookingData.customer.name} />
          {bookingData.customer.email ? (
            <input
              type="hidden"
              name="customer-data[email]"
              value={bookingData.customer.email}
            />
          ) : null}
        </form>
      ) : null}
    </div>
  )
}
