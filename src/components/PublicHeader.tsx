import type { PublicSpa } from "./internal-types"
import type { Translations } from "../i18n"

interface PublicHeaderProps {
  spa: PublicSpa
  translations: Translations
}

/**
 * Booking-page header. Plain <img> instead of next/image so the package
 * stays framework-agnostic — works in any React app, Next.js or otherwise.
 * Next.js sites that want image optimization can wrap their own header.
 */
export function PublicHeader({ spa, translations: t }: PublicHeaderProps) {
  return (
    <header className="border-b border-black/5 bg-[#f9f9f4]/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 sm:py-6 md:px-10 md:py-8">
        <div className="flex items-center gap-4">
          {spa.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spa.logo_url}
              alt={spa.name}
              width={48}
              height={48}
              loading="eager"
              className="h-12 w-12 flex-shrink-0 rounded-full border border-black/10 object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-black/10 bg-white font-serif text-xl text-black">
              {spa.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-black/40">
              {t.header.booking_label}
            </p>
            <h1 className="truncate font-serif text-xl leading-tight tracking-tight text-black sm:text-2xl md:text-3xl">
              {spa.name}
            </h1>
          </div>
        </div>
        <span className="hidden text-[10px] uppercase tracking-[0.2em] text-black/40 md:block">
          {t.header.online_booking}
        </span>
      </div>
    </header>
  )
}
