"use client"

import { useMemo, useState } from "react"
import { PublicHeader } from "./PublicHeader"
import { ServiceCard } from "./ServiceCard"
import { BookingModal } from "./BookingModal"
import type { PublicService, PublicSpa } from "./internal-types"
import type { BookingClient } from "../sdk"
import type { Translations } from "../i18n"

interface BookingPageProps {
  slug: string
  spa: PublicSpa
  services: PublicService[]
  client: BookingClient
  wompiPublicKey: string | null
  translations: Translations
  /**
   * Optional click handler for the "Buy a gift card" link. The package itself
   * doesn't know how the host site routes — Spaboard uses /book/[slug]/giftcards;
   * a Tier 2 site may have its own gift-card page. If omitted, the link is hidden.
   */
  onBuyGiftCard?: () => void
  /** Forwarded to PaymentStep — see BookingFlow docs. */
  paymentRedirectUrl?: string
}

export function BookingPage({
  slug,
  spa,
  services,
  client,
  wompiPublicKey,
  translations,
  onBuyGiftCard,
  paymentRedirectUrl,
}: BookingPageProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<PublicService | null>(null)
  const t = translations

  const byCategory = useMemo(() => {
    return services.reduce(
      (acc, service) => {
        const category = service.category || "General"
        acc[category] = acc[category] || []
        acc[category].push(service)
        return acc
      },
      {} as Record<string, PublicService[]>
    )
  }, [services])

  return (
    <div className="min-h-screen bg-[#f9f9f4] text-black">
      <PublicHeader spa={spa} translations={t} />

      <section className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <div className="mb-16 flex flex-col gap-6 md:mb-20 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-black/40">
              {t.header.booking_label}
            </p>
            <h2 className="font-serif text-[44px] leading-[1.05] tracking-tight text-black md:text-[64px]">
              {spa.name}
            </h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-black/60 md:text-base">
              {t.page.intro}
            </p>
          </div>
          {onBuyGiftCard ? (
            <button
              onClick={onBuyGiftCard}
              className="self-start border-b border-black pb-1 text-[10px] uppercase tracking-[0.2em] text-black transition-opacity hover:opacity-60 md:self-end"
            >
              {t.header.buy_gift_card} →
            </button>
          ) : null}
        </div>

        <div className="space-y-20 md:space-y-24">
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category}>
              <div className="mb-10 border-b border-black/10 pb-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                  {t.page.category_label}
                </p>
                <h3 className="mt-1 font-serif text-3xl tracking-tight text-black md:text-4xl">
                  {category}
                </h3>
              </div>
              <div className="space-y-16">
                {items.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    eyebrow={category}
                    translations={t}
                    onBook={() => {
                      setSelected(service)
                      setOpen(true)
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <BookingModal
        isOpen={open}
        slug={slug}
        spa={spa}
        services={services}
        preselectedService={selected}
        onClose={() => setOpen(false)}
        client={client}
        wompiPublicKey={wompiPublicKey}
        translations={t}
        paymentRedirectUrl={paymentRedirectUrl}
      />
    </div>
  )
}
