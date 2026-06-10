"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react"
import type { BookingClient } from "../sdk"
import type { ReferenceType } from "../types"
import type { Translations } from "../i18n"

type Status = "loading" | "success" | "error" | "pending"
type ErrorReason = "no_transaction" | "declined"

const WOMPI_BASE = {
  test: "https://sandbox.wompi.co/v1",
  prod: "https://production.wompi.co/v1",
} as const

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface PaymentResultProps {
  slug: string
  client: BookingClient
  translations: Translations
  /**
   * Where the action button links. Defaults to `/book/${slug}` (Spaboard's
   * convention). Tier 2 sites with their own routing should override this.
   */
  backUrl?: string
}

/**
 * The screen the customer lands on after Wompi redirects back. Wompi's
 * redirect only appends `id` (the transaction id) and `env` — it does NOT
 * include the transaction status — so we read the real status straight from
 * Wompi's public transactions endpoint (CORS-enabled, no auth needed). We
 * poll briefly because a card transaction may still be APPROVING for a second
 * or two after the redirect fires.
 *
 * Status resolves to success / declined-error / pending. The webhook remains
 * the source of truth for the booking itself — `saveTransaction` here is a
 * best-effort nudge, so its failure is intentionally swallowed.
 */
export function PaymentResult({ slug, client, translations, backUrl }: PaymentResultProps) {
  const t = translations
  const [status, setStatus] = useState<Status>("loading")
  const [errorReason, setErrorReason] = useState<ErrorReason>("declined")
  const [referenceType, setReferenceType] = useState<ReferenceType>("appointment")

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    const transactionId = params.get("id")
    const appointmentId = params.get("appointment_id")
    const paymentId = params.get("payment_id")
    const type = params.get("type")
    const env = params.get("env") === "test" ? "test" : "prod"

    const refType: ReferenceType = type === "gift_card" ? "gift_card" : "appointment"
    setReferenceType(refType)
    const referenceId = refType === "gift_card" ? paymentId : appointmentId

    if (!transactionId) {
      setErrorReason("no_transaction")
      setStatus("error")
      return
    }

    // Best-effort — the webhook is the real source of truth. Swallow any
    // failure so the customer always sees a clean result screen.
    const recordTransaction = () => {
      if (!referenceId) return
      void client
        .saveTransaction(referenceId, {
          wompiTransactionId: transactionId,
          referenceType: refType,
        })
        .catch(() => {})
    }

    async function resolveStatus() {
      // Poll Wompi for the real status. Cards usually finalize within a
      // second; PSE / bank flows can sit at PENDING much longer.
      const maxAttempts = 5
      for (let attempt = 0; attempt < maxAttempts && !cancelled; attempt++) {
        let wompiStatus: string | undefined
        try {
          const res = await fetch(`${WOMPI_BASE[env]}/transactions/${transactionId}`, {
            headers: { Accept: "application/json" },
          })
          if (res.ok) {
            const json = (await res.json()) as { data?: { status?: string } }
            wompiStatus = json.data?.status
          }
        } catch {
          // Network / CORS hiccup — retry, then fall through to pending.
        }

        if (cancelled) return

        if (wompiStatus === "APPROVED" || wompiStatus === "APPROVED_PARTIAL") {
          recordTransaction()
          setStatus("success")
          return
        }
        if (wompiStatus === "DECLINED" || wompiStatus === "VOIDED" || wompiStatus === "ERROR") {
          setErrorReason("declined")
          setStatus("error")
          return
        }

        // PENDING / unknown — wait and re-check (except after the last try).
        if (attempt < maxAttempts - 1) await delay(2000)
      }

      // Still unresolved after polling: the payment is genuinely processing
      // (or we couldn't reach Wompi). Record it and let the webhook + the
      // confirmation email take it from here — no infinite spinner.
      if (cancelled) return
      recordTransaction()
      setStatus("pending")
    }

    void resolveStatus()
    return () => {
      cancelled = true
    }
  }, [client])

  const backHref = backUrl ?? `/book/${slug}`

  const title =
    status === "success"
      ? t.result.success_title
      : status === "error"
        ? t.result.error_title
        : status === "pending"
          ? t.result.pending_title
          : t.result.processing_title

  const message =
    status === "loading"
      ? t.result.verifying
      : status === "success"
        ? referenceType === "gift_card"
          ? t.result.success_gift_card
          : t.result.success_appointment
        : status === "pending"
          ? referenceType === "gift_card"
            ? t.result.pending_gift_card
            : t.result.pending_appointment
          : errorReason === "no_transaction"
            ? t.result.no_transaction
            : t.result.error

  const buttonLabel = status === "error" ? t.result.try_again : t.result.back_home

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f9f9f4] px-6 py-16 text-black">
      <div className="w-full max-w-lg rounded-xl border border-black/5 bg-white p-8 text-center shadow-sm md:p-12">
        <div className="flex justify-center">
          {status === "loading" ? (
            <Loader2 className="h-12 w-12 animate-spin text-black/40" aria-hidden="true" />
          ) : null}
          {status === "success" ? (
            <CheckCircle2 className="h-12 w-12 text-green-600" aria-hidden="true" />
          ) : null}
          {status === "error" ? (
            <XCircle className="h-12 w-12 text-red-600" aria-hidden="true" />
          ) : null}
          {status === "pending" ? (
            <Clock className="h-12 w-12 text-amber-600" aria-hidden="true" />
          ) : null}
        </div>

        <h2 className="mt-6 font-serif text-3xl tracking-tight text-black">{title}</h2>
        <p className="mt-3 text-sm font-light leading-relaxed text-black/60">{message}</p>

        <a
          href={backHref}
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full border border-black px-10 py-3 text-[10px] uppercase tracking-[0.2em] text-black transition-all hover:bg-black hover:text-[#f9f9f4]"
        >
          {buttonLabel}
        </a>
      </div>
    </div>
  )
}
