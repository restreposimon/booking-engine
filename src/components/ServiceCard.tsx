"use client"

import { useState } from "react"
import { formatCurrency } from "../utils/format"
import type { PublicService } from "./internal-types"
import type { Translations } from "../i18n"

interface ServiceCardProps {
  service: PublicService
  onBook: () => void
  eyebrow?: string
  translations: Translations
}

const MAX_DESCRIPTION_LENGTH = 150

export function ServiceCard({ service, onBook, eyebrow, translations: t }: ServiceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const description = service.description || ""
  const shouldTruncate = description.length > MAX_DESCRIPTION_LENGTH
  const displayDescription =
    shouldTruncate && !isExpanded ? description.slice(0, MAX_DESCRIPTION_LENGTH) + "..." : description

  return (
    <article className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-6">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/60">{eyebrow}</p>
          ) : null}
          <h3 className="text-lg uppercase tracking-widest font-sans font-bold text-black">
            {service.name}
          </h3>
        </div>
        <span className="shrink-0 font-serif italic text-xs text-black/80">
          {service.duration_minutes} {t.card.duration_min}
        </span>
      </div>

      {description ? (
        <p className="max-w-xl text-sm font-light leading-relaxed text-black/70">
          {displayDescription}
        </p>
      ) : null}

      <div className="mt-1 flex items-center gap-6">
        {shouldTruncate ? (
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="border-b border-black/40 pb-0.5 text-[10px] uppercase tracking-[0.2em] text-black transition-colors hover:border-black"
          >
            {isExpanded ? t.card.read_less : t.card.read_more}
          </button>
        ) : null}
        <span className="font-serif text-base text-black">
          {formatCurrency(service.price_cop)}
        </span>
      </div>

      <button
        onClick={onBook}
        className="mt-3 self-start rounded-full border border-black px-10 py-3 text-[10px] uppercase tracking-[0.2em] text-black transition-all hover:bg-black hover:text-[#f9f9f4]"
      >
        {t.card.book}
      </button>
    </article>
  )
}
