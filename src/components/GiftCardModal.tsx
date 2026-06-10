"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X } from "lucide-react"
import { formatCurrency, interpolate } from "../utils/format"
import type { PublicService } from "./internal-types"
import type { BookingClient } from "../sdk"
import type { Translations } from "../i18n"

interface GiftCardModalProps {
  slug: string
  isOpen: boolean
  services: PublicService[]
  onClose: () => void
  client: BookingClient
  wompiPublicKey: string | null
  translations: Translations
  /**
   * Override the URL Wompi redirects to after a gift-card payment. Defaults to
   * `${origin}/book/${slug}/result?payment_id=...&type=gift_card` (Spaboard's
   * convention). Tier 2 client sites can point this at their own result page.
   * The `{payment_id}` placeholder is interpolated; if your URL has no
   * placeholder it's appended as a query param (alongside `type=gift_card`).
   */
  giftCardRedirectUrl?: string
}

/**
 * Result shape returned by `prepare_gift_card_purchase` (via
 * `client.createGiftCard`). Only the fields the Wompi form needs are read
 * here; the SDK's `GiftCardResult` type permits the rest.
 */
interface PreparedGiftCard {
  payment_id: string | null
  amount_in_cents: number
  wompi_public_key: string | null
  wompi_reference: string | null
  wompi_signature: string | null
}

const TOTAL_GIFT_STEPS = 4

function buildGiftRedirectUrl(
  origin: string,
  slug: string,
  paymentId: string | null | undefined,
  override?: string
): string {
  const id = paymentId ?? ""
  if (override) {
    if (override.includes("{payment_id}")) {
      return override.replace("{payment_id}", id)
    }
    const sep = override.includes("?") ? "&" : "?"
    return `${override}${sep}payment_id=${id}&type=gift_card`
  }
  return `${origin}/book/${slug}/result?payment_id=${id}&type=gift_card`
}

export function GiftCardModal({
  slug,
  isOpen,
  services,
  onClose,
  client,
  wompiPublicKey,
  translations,
  giftCardRedirectUrl,
}: GiftCardModalProps) {
  const t = translations
  const formRef = useRef<HTMLFormElement>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prepared, setPrepared] = useState<PreparedGiftCard | null>(null)
  const [origin, setOrigin] = useState("")

  const [giftedServiceId, setGiftedServiceId] = useState("")
  const [amount, setAmount] = useState("100000")
  const [isGifted, setIsGifted] = useState(true)
  const [recipientName, setRecipientName] = useState("")
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [message, setMessage] = useState("")
  const [purchaserName, setPurchaserName] = useState("")
  const [purchaserEmail, setPurchaserEmail] = useState("")
  const [purchaserPhone, setPurchaserPhone] = useState("")

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  // Auto-submit the hidden Wompi form once a payment is prepared.
  useEffect(() => {
    if (!prepared || !formRef.current) return
    formRef.current.submit()
  }, [prepared])

  // Reset on open.
  useEffect(() => {
    if (!isOpen) return
    setStep(1)
    setError(null)
    setPrepared(null)
  }, [isOpen])

  // Body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return
    const scrollY = window.scrollY
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  const isTestMode =
    (prepared?.wompi_public_key?.startsWith("pub_test_") ?? false) ||
    (wompiPublicKey?.startsWith("pub_test_") ?? false)

  async function handlePrepare() {
    setError(null)
    setLoading(true)
    try {
      const selectedService = services.find((s) => s.id === giftedServiceId)
      // `amount` is in PESOS (COP) — same unit as `price_cop`. The RPC
      // converts to Wompi cents and returns `amount_in_cents`.
      const amountCop = selectedService ? selectedService.price_cop : Number(amount)

      const data = (await client.createGiftCard({
        amount: amountCop,
        purchaserName,
        purchaserEmail,
        purchaserPhone,
        isGifted,
        recipientName: isGifted ? recipientName : undefined,
        recipientEmail: isGifted ? recipientEmail : undefined,
        recipientPhone: isGifted ? recipientPhone : undefined,
        message: isGifted ? message : undefined,
        giftedServiceId: giftedServiceId || undefined,
      })) as unknown as PreparedGiftCard

      if (data.wompi_public_key && data.wompi_reference) {
        setPrepared(data)
      } else {
        // No payment needed (edge case) — just close.
        onClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.gift_card.error_generic)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const inputClass =
    "min-h-11 w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black focus:bg-white"
  const primaryBtn =
    "inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f5f5dc] shadow-lg transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:hover:scale-100"
  const ghostBtn =
    "flex min-h-11 items-center border-b border-black pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.gift_card.modal_title}
    >
      <div
        className="absolute inset-0 bg-[#1c1917]/90 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-none bg-[#f9f9f4] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-xl animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
              {interpolate(t.progress.step_of, { current: step, total: TOTAL_GIFT_STEPS })}
            </p>
            <h2 className="font-serif text-2xl text-black">{t.gift_card.modal_title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common.close}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isTestMode ? (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
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

          {/* STEP 1 — gift type */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-sm font-light text-black/60">{t.gift_card.choose_type}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsGifted(true)}
                  aria-pressed={isGifted}
                  className={`rounded-xl border p-5 text-left transition-all ${
                    isGifted
                      ? "border-black bg-black text-[#f5f5dc] shadow-lg"
                      : "border-black/10 bg-white text-black hover:border-black/40"
                  }`}
                >
                  <span className="font-serif text-lg">{t.gift_card.gift_for_someone}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsGifted(false)}
                  aria-pressed={!isGifted}
                  className={`rounded-xl border p-5 text-left transition-all ${
                    !isGifted
                      ? "border-black bg-black text-[#f5f5dc] shadow-lg"
                      : "border-black/10 bg-white text-black hover:border-black/40"
                  }`}
                >
                  <span className="font-serif text-lg">{t.gift_card.for_myself}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — service or amount */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                  {t.gift_card.optional_service}
                </label>
                <select
                  className={`${inputClass} cursor-pointer appearance-none`}
                  value={giftedServiceId}
                  onChange={(e) => setGiftedServiceId(e.target.value)}
                >
                  <option value="">{t.gift_card.generic_amount}</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {formatCurrency(service.price_cop)}
                    </option>
                  ))}
                </select>
              </div>
              {!giftedServiceId ? (
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                    {t.gift_card.generic_amount}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                    className={inputClass}
                    placeholder={t.gift_card.amount_placeholder}
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* STEP 3 — recipient details (gifted) or self note */}
          {step === 3 && (
            <div className="space-y-4">
              {isGifted ? (
                <>
                  <input
                    className={inputClass}
                    placeholder={t.gift_card.recipient_name}
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    autoComplete="name"
                  />
                  <input
                    className={inputClass}
                    type="email"
                    placeholder={t.gift_card.recipient_email}
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <input
                    className={inputClass}
                    type="tel"
                    placeholder={t.gift_card.recipient_phone}
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    autoComplete="tel"
                  />
                  <textarea
                    className={`${inputClass} min-h-24 resize-none`}
                    placeholder={t.gift_card.message_optional}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-black/10 p-4 text-sm font-light leading-relaxed text-black/60">
                  {t.gift_card.self_note}
                </p>
              )}
            </div>
          )}

          {/* STEP 4 — purchaser details */}
          {step === 4 && (
            <div className="space-y-4">
              <input
                className={inputClass}
                placeholder={t.gift_card.your_name}
                value={purchaserName}
                onChange={(e) => setPurchaserName(e.target.value)}
                autoComplete="name"
              />
              <input
                className={inputClass}
                type="email"
                placeholder={t.gift_card.your_email}
                value={purchaserEmail}
                onChange={(e) => setPurchaserEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                className={inputClass}
                type="tel"
                placeholder={t.gift_card.your_phone}
                value={purchaserPhone}
                onChange={(e) => setPurchaserPhone(e.target.value)}
                autoComplete="tel"
              />
              {error ? (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-3 border-t border-black/10 px-6 py-4">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={ghostBtn}>
              {t.common.back}
            </button>
          ) : (
            <span />
          )}
          {step < TOTAL_GIFT_STEPS ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className={primaryBtn}>
              {t.common.continue}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !!prepared}
              onClick={() => void handlePrepare()}
              className={primaryBtn}
            >
              {loading || prepared ? t.gift_card.preparing : t.gift_card.go_to_payment}
            </button>
          )}
        </div>
      </div>

      {/* Hidden Wompi checkout form — auto-submitted once prepared. */}
      {prepared ? (
        <form ref={formRef} method="GET" action="https://checkout.wompi.co/p/" className="hidden">
          <input type="hidden" name="public-key" value={prepared.wompi_public_key ?? ""} />
          <input type="hidden" name="currency" value="COP" />
          <input type="hidden" name="amount-in-cents" value={String(prepared.amount_in_cents)} />
          <input type="hidden" name="reference" value={prepared.wompi_reference ?? ""} />
          {prepared.wompi_signature ? (
            <input type="hidden" name="signature:integrity" value={prepared.wompi_signature} />
          ) : null}
          <input
            type="hidden"
            name="redirect-url"
            value={buildGiftRedirectUrl(origin, slug, prepared.payment_id, giftCardRedirectUrl)}
          />
          <input type="hidden" name="customer-data[full-name]" value={purchaserName} />
          {purchaserEmail ? (
            <input type="hidden" name="customer-data[email]" value={purchaserEmail} />
          ) : null}
        </form>
      ) : null}
    </div>
  )
}
