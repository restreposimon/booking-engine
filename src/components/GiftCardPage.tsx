"use client"

import { useState } from "react"
import { PublicHeader } from "./PublicHeader"
import { GiftCardModal } from "./GiftCardModal"
import type { PublicService, PublicSpa } from "./internal-types"
import type { BookingClient } from "../sdk"
import type { Translations } from "../i18n"

interface GiftCardPageProps {
  slug: string
  spa: PublicSpa
  services: PublicService[]
  client: BookingClient
  wompiPublicKey: string | null
  translations: Translations
  /** Forwarded to GiftCardModal — see its docs. */
  giftCardRedirectUrl?: string
  /**
   * Where the "Back to booking" link points. Defaults to `/book/${slug}`
   * (Spaboard's convention). Tier 2 sites with their own routing should
   * override this.
   */
  bookingUrl?: string
}

export function GiftCardPage({
  slug,
  spa,
  services,
  client,
  wompiPublicKey,
  translations,
  giftCardRedirectUrl,
  bookingUrl,
}: GiftCardPageProps) {
  const [open, setOpen] = useState(false)
  const t = translations
  const backHref = bookingUrl ?? `/book/${slug}`

  return (
    <div className="min-h-screen bg-[#f9f9f4] text-black">
      <PublicHeader spa={spa} translations={t} />

      <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-black/40">
          {t.gift_card.page_title}
        </p>
        <h2 className="max-w-2xl font-serif text-[44px] leading-[1.05] tracking-tight text-black md:text-[64px]">
          {t.gift_card.page_title}
        </h2>
        <p className="mt-5 max-w-xl text-sm font-light leading-relaxed text-black/60 md:text-base">
          {t.gift_card.page_intro}
        </p>

        <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <button
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-black px-10 py-3 text-[10px] uppercase tracking-[0.2em] text-black transition-all hover:bg-black hover:text-[#f9f9f4]"
          >
            {t.gift_card.buy_button}
          </button>
          <a
            href={backHref}
            className="border-b border-black pb-1 text-[10px] uppercase tracking-[0.2em] text-black transition-opacity hover:opacity-60"
          >
            ← {t.gift_card.back_to_booking}
          </a>
        </div>
      </section>

      <GiftCardModal
        slug={slug}
        isOpen={open}
        services={services}
        onClose={() => setOpen(false)}
        client={client}
        wompiPublicKey={wompiPublicKey}
        translations={t}
        giftCardRedirectUrl={giftCardRedirectUrl}
      />
    </div>
  )
}
