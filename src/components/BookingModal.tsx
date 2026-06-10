"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { format } from "date-fns"
import { X, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { BookingProgress } from "./BookingProgress"
import { PaymentStep } from "./PaymentStep"
import { formatCurrency as formatCurrencyFromCents, interpolate } from "../utils/format"
import type {
  BookingData,
  PublicService,
  PublicSpa,
} from "./internal-types"
import type { BookingClient } from "../sdk"
import type { Translations } from "../i18n"

interface BookingModalProps {
  isOpen: boolean
  slug: string
  spa: PublicSpa
  services: PublicService[]
  preselectedService?: PublicService | null
  onClose: () => void
  client: BookingClient
  wompiPublicKey: string | null
  translations: Translations
  paymentRedirectUrl?: string
}

interface AvailabilitySlot {
  start_time: string
  end_time: string
  available_staff_ids: string[]
  available_staff_names: string[]
  available_room_ids: string[]
  staff_count?: number
}

const TOTAL_STEPS = 5

const COUNTRIES = [
  { code: "+57", flag: "🇨🇴" },
  { code: "+1", flag: "🇺🇸" },
  { code: "+34", flag: "🇪🇸" },
  { code: "+52", flag: "🇲🇽" },
  { code: "+54", flag: "🇦🇷" },
  { code: "+55", flag: "🇧🇷" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+33", flag: "🇫🇷" },
]

function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd")
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

function formatToE164(countryCode: string, phoneNumber: string): string {
  return countryCode + phoneNumber.replace(/\D/g, "")
}

function parseFromE164(e164: string): { countryCode: string; phoneNumber: string } {
  if (!e164) return { countryCode: "+57", phoneNumber: "" }
  const sorted = COUNTRIES.map((c) => c.code).sort((a, b) => b.length - a.length)
  for (const code of sorted) {
    if (e164.startsWith(code)) return { countryCode: code, phoneNumber: e164.substring(code.length) }
  }
  return { countryCode: "+57", phoneNumber: e164.replace(/^\+57/, "") }
}

export function BookingModal({
  isOpen,
  slug,
  spa,
  services,
  preselectedService,
  onClose,
  client,
  wompiPublicKey,
  translations,
  paymentRedirectUrl,
}: BookingModalProps) {
  const t = translations
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedStaffId, setSelectedStaffId] = useState("any")
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const hasAutoSelectedRef = useRef(false)

  const [booking, setBooking] = useState<BookingData>({
    service: preselectedService ?? null,
    date: null,
    timeSlot: null,
    customer: { name: "", email: "", phone: "", dateOfBirth: "" },
    giftCard: null,
  })

  // Gift card local state
  const [giftCode, setGiftCode] = useState("")
  const [giftValidating, setGiftValidating] = useState(false)
  const [giftError, setGiftError] = useState<string | null>(null)

  // Phone helpers
  const [countryCode, setCountryCode] = useState("+57")
  const [localPhone, setLocalPhone] = useState("")
  const phoneInternalUpdate = useRef(false)

  // DOB helpers
  const [dob, setDob] = useState({ day: "", month: "", year: "" })

  // Reset when opening
  useEffect(() => {
    if (!isOpen) return
    setStep(1)
    setError(null)
    setAvailableDates([])
    setSlots([])
    setBooking({
      service: preselectedService ?? null,
      date: null,
      timeSlot: null,
      customer: { name: "", email: "", phone: "", dateOfBirth: "" },
      giftCard: null,
    })
    setCurrentMonth(new Date())
    setSelectedStaffId("any")
    setSelectedCategory(preselectedService?.category ?? null)
    hasAutoSelectedRef.current = false
    setGiftCode("")
    setGiftError(null)
    setCountryCode("+57")
    setLocalPhone("")
    setDob({ day: "", month: "", year: "" })
  }, [isOpen, preselectedService])

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return
    const scrollY = window.scrollY
    document.body.style.overflow = "hidden"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    return () => {
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  // Escape-to-close (basic modal keyboard affordance)
  useEffect(() => {
    if (!isOpen) return
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation()
        closeAndReset()
      }
    }
    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Auto-load dates when preselected service on open
  useEffect(() => {
    if (!isOpen || !preselectedService || hasAutoSelectedRef.current) return
    hasAutoSelectedRef.current = true
    void loadDates(preselectedService.id, new Date())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preselectedService])

  // Reload dates when month changes on step 2
  useEffect(() => {
    if (step !== 2 || !booking.service) return
    void loadDates(booking.service.id, currentMonth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  // Phone sync
  useEffect(() => {
    if (phoneInternalUpdate.current) {
      phoneInternalUpdate.current = false
      return
    }
    const e164 = formatToE164(countryCode, localPhone)
    if (e164 !== booking.customer.phone) {
      setBooking((prev) => ({ ...prev, customer: { ...prev.customer, phone: e164 } }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, localPhone])

  const categories = useMemo(() => {
    const set = new Set<string>()
    services.forEach((s) => {
      if (s.category) set.add(s.category)
    })
    return Array.from(set)
  }, [services])

  const uncategorized = useMemo(
    () => services.filter((s) => !s.category),
    [services]
  )

  const categoryServices = useMemo(() => {
    if (selectedCategory === null) return []
    if (selectedCategory === "") return uncategorized
    return services.filter((s) => s.category === selectedCategory)
  }, [selectedCategory, services, uncategorized])

  async function loadDates(serviceId: string, monthDate: Date) {
    setBusy(true)
    setError(null)
    try {
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 2, 0)
      const data = await client.getAvailableDates({
        serviceId,
        startDate: toDateString(start),
        endDate: toDateString(end),
      })
      const normalizedDates = (data.dates || [])
        .map((item) => String(item).split("T")[0] ?? "")
        .filter(Boolean)
      setAvailableDates(normalizedDates)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error_generic)
    } finally {
      setBusy(false)
    }
  }

  async function loadSlots(serviceId: string, date: string) {
    setBusy(true)
    setError(null)
    try {
      const data = await client.getAvailability({ serviceId, date })
      setSlots((data.slots as AvailabilitySlot[]) || [])
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error_generic)
    } finally {
      setBusy(false)
    }
  }

  async function applyGiftCode() {
    if (!giftCode.trim()) {
      setBooking((prev) => ({ ...prev, giftCard: null }))
      return
    }
    setGiftValidating(true)
    setGiftError(null)
    try {
      const payload = await client.redeemGiftCard(giftCode.trim())
      if (!payload.valid) {
        setGiftError((payload.reason as string) || t.common.error_generic)
        setBooking((prev) => ({ ...prev, giftCard: null }))
      } else {
        const maxApplicable = Math.min(
          (payload.remaining_amount_cop as number) ?? 0,
          booking.service?.price_cop ?? 0
        )
        setBooking((prev) => ({
          ...prev,
          giftCard: { code: giftCode.trim(), amount: maxApplicable, valid: true },
        }))
      }
    } catch (err) {
      setGiftError(err instanceof Error ? err.message : t.common.error_generic)
      setBooking((prev) => ({ ...prev, giftCard: null }))
    } finally {
      setGiftValidating(false)
    }
  }

  const staffMembers = useMemo(() => {
    const map = new Map<string, string>()
    slots.forEach((slot) => {
      const ids = slot.available_staff_ids || []
      const names = slot.available_staff_names || []
      ids.forEach((id, idx) => {
        if (!map.has(id)) map.set(id, names[idx] || "Personal")
      })
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [slots])

  const filteredSlots = useMemo(() => {
    if (selectedStaffId === "any") return slots
    return slots.filter((slot) => (slot.available_staff_ids || []).includes(selectedStaffId))
  }, [slots, selectedStaffId])

  function closeAndReset() {
    setStep(1)
    onClose()
  }

  function updateDob(field: "day" | "month" | "year", value: string) {
    const next = { ...dob, [field]: value }
    setDob(next)
    if (next.day && next.month && next.year) {
      const d = new Date(parseInt(next.year), parseInt(next.month) - 1, parseInt(next.day))
      if (!isNaN(d.getTime())) {
        setBooking((prev) => ({
          ...prev,
          customer: { ...prev.customer, dateOfBirth: d.toISOString().split("T")[0] ?? "" },
        }))
      }
    }
  }

  // Calendar computation
  const calendar = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    return {
      year,
      month,
      daysInMonth: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay(),
    }
  }, [currentMonth])

  const isFormValid =
    booking.customer.name.trim() &&
    booking.customer.phone.trim() &&
    booking.customer.dateOfBirth.trim()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t.header.book_appointment}
    >
      <div
        className="absolute inset-0 bg-[#1c1917]/90 backdrop-blur-md transition-opacity"
        onClick={closeAndReset}
      />

      <div className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none bg-[#f9f9f4] shadow-2xl sm:h-[92vh] sm:rounded-xl md:h-[88vh] md:flex-row animate-in fade-in zoom-in duration-300">
        {/* Left panel — summary */}
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-black/5 bg-[#f0f0eb] p-8 md:flex md:w-1/3 md:overflow-y-auto">
          <div className="relative z-10">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-black/40">
              {t.header.booking_label}
            </p>
            <h2 className="mb-10 font-serif text-3xl leading-tight text-black">
              {spa.name}
            </h2>

            <div className="space-y-6">
              {booking.service ? (
                <div className="animate-in slide-in-from-left duration-500">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                    {t.steps.payment.service}
                  </p>
                  <p className="font-serif text-xl text-black">{booking.service.name}</p>
                  <p className="mt-1 text-sm font-light text-black/60">
                    {formatCurrencyFromCents(booking.service.price_cop)}
                  </p>
                </div>
              ) : null}

              {booking.date ? (
                <div className="animate-in slide-in-from-left duration-500 delay-100">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                    {t.steps.payment.date}
                  </p>
                  <p className="font-serif text-lg text-black">
                    {new Date(booking.date + "T00:00:00").toLocaleDateString(t.calendar.date_locale, {
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </p>
                </div>
              ) : null}

              {booking.timeSlot ? (
                <div className="animate-in slide-in-from-left duration-500 delay-200">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">{t.steps.payment.time}</p>
                  <p className="font-serif text-lg text-black">
                    {formatTimeDisplay(booking.timeSlot.startTime)} -{" "}
                    {formatTimeDisplay(booking.timeSlot.endTime)}
                  </p>
                </div>
              ) : null}

              {booking.customer.name ? (
                <div className="animate-in slide-in-from-left duration-500 delay-300">
                  <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                    {t.steps.payment.guest}
                  </p>
                  <p className="font-serif text-lg text-black">{booking.customer.name}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative z-10">
            <BookingProgress currentStep={step} totalSteps={TOTAL_STEPS} translations={translations} />
          </div>
        </div>

        {/* Right panel */}
        <div className="relative flex flex-1 flex-col bg-white">
          {/* Mobile header */}
          <div className="flex items-center justify-between border-b border-black/5 p-4 md:hidden">
            <h2 className="font-serif text-lg text-black">{t.header.book_appointment}</h2>
            <button
              onClick={closeAndReset}
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2"
              aria-label={t.common.close}
            >
              <X size={22} />
            </button>
          </div>

          {/* Mobile progress */}
          <div className="border-b border-black/5 px-4 py-3 md:hidden">
            <BookingProgress currentStep={step} totalSteps={TOTAL_STEPS} translations={translations} />
          </div>

          {/* Desktop close */}
          <button
            onClick={closeAndReset}
            className="absolute right-6 top-6 z-20 hidden h-11 w-11 items-center justify-center rounded-full bg-black/5 text-black/40 transition-all hover:bg-black/10 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 md:flex"
            aria-label={t.common.close}
          >
            <X size={20} />
          </button>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-12 md:pr-20">
            {error ? (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            ) : null}

            {/* STEP 1: Service selection */}
            {step === 1 && (
              <div className="flex h-full flex-col">
                <div className="mb-6 md:mb-10">
                  {selectedCategory !== null ? (
                    <div className="space-y-4">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="mb-2 inline-flex min-h-11 items-center gap-2 text-sm text-black/60 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2"
                      >
                        <ArrowLeft size={16} />
                        <span>{t.steps.service.back_to_categories}</span>
                      </button>
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-black/40">
                          {t.page.category_label}
                        </p>
                        <h3 className="mb-2 font-serif text-3xl text-black">
                          {selectedCategory === "" ? t.steps.service.uncategorized : selectedCategory}
                        </h3>
                        <p className="text-sm font-light tracking-wide text-black/60">
                          {t.steps.service.category_pick_service_subtitle}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="mb-2 font-serif text-3xl text-black">
                        {t.steps.service.pick_category_title}
                      </h3>
                      <p className="text-sm font-light tracking-wide text-black/60">
                        {t.steps.service.pick_category_subtitle}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                  {selectedCategory === null ? (
                    <>
                      {categories.map((cat) => {
                        const count = services.filter((s) => s.category === cat).length
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className="group w-full rounded-xl border border-black/10 bg-white p-6 text-left transition-all duration-300 hover:border-black/30 hover:shadow-md md:p-8"
                          >
                            <div className="mb-3 flex items-start justify-between">
                              <h4 className="font-serif text-lg tracking-wide text-black md:text-xl">
                                {cat}
                              </h4>
                              <span className="text-sm font-light text-black/60">
                                {count}{" "}
                                {count === 1
                                  ? t.steps.service.service_singular
                                  : t.steps.service.service_plural}
                              </span>
                            </div>
                            <div className="mt-6 flex items-center text-[10px] uppercase tracking-[0.2em] text-black transition-transform group-hover:translate-x-2">
                              {t.steps.service.view_services}
                            </div>
                          </button>
                        )
                      })}
                      {uncategorized.length > 0 && (
                        <button
                          onClick={() => setSelectedCategory("")}
                          className="group w-full rounded-xl border border-black/10 bg-white p-6 text-left transition-all duration-300 hover:border-black/30 hover:shadow-md md:p-8"
                        >
                          <div className="mb-3 flex items-start justify-between">
                            <h4 className="font-serif text-lg tracking-wide text-black md:text-xl">
                              {t.steps.service.uncategorized}
                            </h4>
                            <span className="text-sm font-light text-black/60">
                              {uncategorized.length}{" "}
                              {uncategorized.length === 1
                                ? t.steps.service.service_singular
                                : t.steps.service.service_plural}
                            </span>
                          </div>
                          <div className="mt-6 flex items-center text-[10px] uppercase tracking-[0.2em] text-black transition-transform group-hover:translate-x-2">
                            {t.steps.service.view_services}
                          </div>
                        </button>
                      )}
                    </>
                  ) : categoryServices.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-black/10 py-12 text-center">
                      <p className="text-sm text-black/60">
                        {t.steps.service.no_services_in_category}
                      </p>
                    </div>
                  ) : (
                    <>
                      {categoryServices.map((service) => {
                        const isSelected = booking.service?.id === service.id
                        return (
                          <button
                            key={service.id}
                            onClick={() => {
                              setBooking((prev) => ({ ...prev, service }))
                              void loadDates(service.id, currentMonth)
                            }}
                            className={`group w-full rounded-xl border p-6 text-left transition-all duration-300 md:p-8 ${
                              isSelected
                                ? "border-black bg-black text-[#f5f5dc] shadow-xl"
                                : "border-black/10 bg-white hover:border-black/30 hover:shadow-md"
                            }`}
                          >
                            <div className="mb-3 flex items-start justify-between">
                              <h4
                                className={`font-serif text-lg tracking-wide md:text-xl ${
                                  isSelected ? "text-[#f5f5dc]" : "text-black"
                                }`}
                              >
                                {service.name}
                              </h4>
                              <span
                                className={`text-sm font-light ${
                                  isSelected ? "text-[#f5f5dc]/80" : "text-black/60"
                                }`}
                              >
                                {formatCurrencyFromCents(service.price_cop)}
                              </span>
                            </div>
                            <div
                              className={`mb-4 text-xs uppercase tracking-widest ${
                                isSelected ? "text-[#f5f5dc]/60" : "text-black/40"
                              }`}
                            >
                              {interpolate(t.steps.service.duration_minutes, {
                                minutes: service.duration_minutes,
                              })}
                            </div>
                            {service.description ? (
                              <p
                                className={`text-sm font-light leading-relaxed ${
                                  isSelected ? "text-[#f5f5dc]/80" : "text-black/60"
                                }`}
                              >
                                {service.description.length > 140
                                  ? service.description.slice(0, 140) + "..."
                                  : service.description}
                              </p>
                            ) : null}
                            <div
                              className={`mt-6 flex items-center text-[10px] uppercase tracking-[0.2em] transition-transform group-hover:translate-x-2 ${
                                isSelected ? "text-[#f5f5dc]" : "text-black"
                              }`}
                            >
                              {t.steps.service.select_this_service}
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: Date selection (calendar) */}
            {step === 2 && (
              <div className="flex h-full flex-col">
                <div className="mb-4 text-center md:mb-6 md:text-left">
                  <h3 className="mb-2 font-serif text-3xl text-black">{t.steps.date.title}</h3>
                  <p className="text-sm font-light tracking-wide text-black/60">
                    {t.steps.date.subtitle}
                  </p>
                </div>

                <div className="flex flex-1 items-center justify-center">
                  <div className="w-full min-w-0 max-w-2xl rounded-xl border border-black/10 bg-white p-2 shadow-sm sm:p-3 md:p-4">
                    {/* Calendar header */}
                    <div className="mb-3 flex items-center justify-between md:mb-4">
                      <button
                        onClick={() =>
                          setCurrentMonth(new Date(calendar.year, calendar.month - 1, 1))
                        }
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                        aria-label={t.calendar.previous_month}
                      >
                        <ChevronLeft className="h-5 w-5 text-black" />
                      </button>
                      <h4 className="flex-1 text-center font-serif text-base text-black md:text-lg">
                        {t.calendar.months_long[calendar.month]}{" "}
                        <span className="text-black/40">{calendar.year}</span>
                      </h4>
                      <button
                        onClick={() =>
                          setCurrentMonth(new Date(calendar.year, calendar.month + 1, 1))
                        }
                        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                        aria-label={t.calendar.next_month}
                      >
                        <ChevronRight className="h-5 w-5 text-black" />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div className="mb-2 grid grid-cols-7 gap-0">
                      {t.calendar.days_short.map((d) => (
                        <div
                          key={d}
                          className="py-0.5 text-center text-[9px] font-bold tracking-widest text-black/40"
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-0 sm:gap-1">
                      {Array.from({ length: calendar.startingDayOfWeek }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square min-w-0" />
                      ))}
                      {Array.from({ length: calendar.daysInMonth }).map((_, i) => {
                        const date = new Date(calendar.year, calendar.month, i + 1)
                        const dateStr = toDateString(date)
                        const available = availableDates.includes(dateStr)
                        const selected = booking.date === dateStr
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const past = date < today
                        const disabled = past || !available
                        const dayLabel =
                          interpolate(t.calendar.day_label, {
                            day: i + 1,
                            month: t.calendar.months_long[calendar.month] ?? "",
                          }) + (disabled ? t.calendar.day_unavailable_suffix : "")

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (disabled) return
                              setBooking((prev) => ({ ...prev, date: dateStr, timeSlot: null }))
                              if (booking.service) void loadSlots(booking.service.id, dateStr)
                            }}
                            disabled={disabled}
                            aria-label={dayLabel}
                            aria-pressed={selected}
                            className={`flex aspect-square min-w-0 items-center justify-center rounded-full text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 ${
                              selected
                                ? "scale-110 bg-black font-bold text-[#f5f5dc] shadow-md"
                                : available && !past
                                  ? "border border-transparent bg-black/[0.02] font-medium text-black hover:border-black/20 hover:bg-black/5"
                                  : "cursor-not-allowed text-black/20"
                            }`}
                          >
                            {i + 1}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {busy ? (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-black/50">
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    <span>{t.steps.date.loading_availability}</span>
                  </div>
                ) : null}

                <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4 sm:pt-6">
                  <button
                    onClick={() => setStep(1)}
                    className="flex min-h-11 items-center border-b border-black pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2"
                  >
                    {t.common.back}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Time selection */}
            {step === 3 && (
              <div className="flex h-full flex-col">
                <div className="mb-6 text-center md:text-left">
                  <h3 className="mb-2 font-serif text-3xl text-black">{t.steps.time.title}</h3>
                  <p className="text-sm font-light tracking-wide text-black/60">
                    {t.steps.time.subtitle}
                  </p>
                </div>

                <div className="flex flex-1 flex-col gap-8">
                  {staffMembers.length > 0 && (
                    <div>
                      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                        {t.steps.time.staff_preference}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedStaffId("any")}
                          aria-pressed={selectedStaffId === "any"}
                          className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 ${
                            selectedStaffId === "any"
                              ? "border-black bg-black text-[#f5f5dc]"
                              : "border-black/10 bg-transparent text-black hover:border-black"
                          }`}
                        >
                          {t.steps.time.any_staff}
                        </button>
                        {staffMembers.map((staff) => (
                          <button
                            key={staff.id}
                            onClick={() => setSelectedStaffId(staff.id)}
                            aria-pressed={selectedStaffId === staff.id}
                            className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 ${
                              selectedStaffId === staff.id
                                ? "border-black bg-black text-[#f5f5dc]"
                                : "border-black/10 bg-transparent text-black hover:border-black"
                            }`}
                          >
                            {staff.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
                      {t.steps.time.available_slots}
                    </p>
                    {filteredSlots.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-black/10 py-12 text-center">
                        {busy ? (
                          <div className="flex items-center justify-center gap-2 text-black/50">
                            <svg
                              className="h-4 w-4 animate-spin"
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
                            <span>{t.steps.time.loading_slots}</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-black/60">
                              {t.steps.time.no_slots}
                            </p>
                            <button
                              onClick={() => setStep(2)}
                              className="text-xs uppercase tracking-[0.2em] text-black underline-offset-4 hover:underline"
                            >
                              {t.steps.time.pick_another_date}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                        {filteredSlots.map((slot) => {
                          const key = `${slot.start_time}-${(slot.available_staff_ids || []).join("-")}`
                          const isSelected = booking.timeSlot?.startTime === slot.start_time
                          const staffCount = slot.staff_count ?? slot.available_staff_ids?.length ?? 1
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                setBooking((prev) => ({
                                  ...prev,
                                  timeSlot: {
                                    startTime: slot.start_time,
                                    endTime: slot.end_time,
                                    staffId: slot.available_staff_ids?.[0] || "",
                                    staffName: slot.available_staff_names?.[0] || "Personal",
                                    staffIds: slot.available_staff_ids || [],
                                    roomId: slot.available_room_ids?.[0] || null,
                                  },
                                }))
                                setStep(4)
                              }}
                              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 ${
                                isSelected
                                  ? "scale-[1.02] transform border-black bg-black text-[#f5f5dc] shadow-lg"
                                  : "border-black/10 bg-white text-black hover:border-black hover:shadow-md"
                              }`}
                            >
                              <span
                                className={`text-sm font-bold ${
                                  isSelected ? "text-[#f5f5dc]" : "text-black"
                                }`}
                              >
                                {formatTimeDisplay(slot.start_time)}
                              </span>
                              {selectedStaffId === "any" && staffCount > 1 ? (
                                <span
                                  className={`text-[10px] uppercase tracking-wider ${
                                    isSelected ? "opacity-80" : "opacity-40"
                                  }`}
                                >
                                  {interpolate(t.steps.time.slots_available, {
                                    count: staffCount,
                                  })}
                                </span>
                              ) : (
                                <span
                                  className={`text-[10px] uppercase tracking-wider ${
                                    isSelected ? "opacity-80" : "opacity-40"
                                  }`}
                                >
                                  {t.steps.time.slot_available}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4 sm:pt-6">
                  <button
                    onClick={() => setStep(2)}
                    className="flex min-h-11 items-center border-b border-black pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2"
                  >
                    {t.common.back}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Customer info */}
            {step === 4 && (
              <div className="flex h-full flex-col">
                <div className="mb-8">
                  <h3 className="mb-2 font-serif text-3xl text-black">{t.steps.customer.title}</h3>
                  <p className="text-sm font-light tracking-wide text-black/60">
                    {t.steps.customer.subtitle}
                  </p>
                </div>

                <div className="flex-1 space-y-8">
                  <div className="grid gap-6">
                    <div className="group">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 transition-colors group-focus-within:text-black">
                        {t.steps.customer.name_label}
                      </label>
                      <input
                        type="text"
                        value={booking.customer.name}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            customer: { ...prev.customer, name: e.target.value },
                          }))
                        }
                        autoComplete="name"
                        autoCapitalize="words"
                        enterKeyHint="next"
                        inputMode="text"
                        className="w-full border-b border-black/10 bg-transparent pb-2 font-serif text-lg text-black transition-colors placeholder:text-black/10 focus:border-black focus:outline-none"
                        placeholder={t.steps.customer.name_placeholder}
                        required
                      />
                    </div>

                    <div className="group">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 transition-colors group-focus-within:text-black">
                        {t.steps.customer.email_label}
                      </label>
                      <input
                        type="email"
                        value={booking.customer.email}
                        onChange={(e) =>
                          setBooking((prev) => ({
                            ...prev,
                            customer: { ...prev.customer, email: e.target.value },
                          }))
                        }
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        enterKeyHint="next"
                        inputMode="email"
                        className="w-full border-b border-black/10 bg-transparent pb-2 font-serif text-lg text-black transition-colors placeholder:text-black/10 focus:border-black focus:outline-none"
                        placeholder={t.steps.customer.email_placeholder}
                      />
                    </div>

                    <div className="group">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 transition-colors group-focus-within:text-black">
                        {t.steps.customer.phone_label}
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            autoComplete="tel-country-code"
                            aria-label={t.steps.customer.country_code_label}
                            className="min-w-[90px] cursor-pointer appearance-none border-b border-black/10 bg-transparent pb-2 pr-8 font-serif text-base text-black transition-colors focus:border-black focus:outline-none"
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2">
                            <svg
                              className="h-4 w-4 text-black/40"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                        <input
                          type="tel"
                          value={localPhone}
                          onChange={(e) => setLocalPhone(e.target.value)}
                          autoComplete="tel-national"
                          inputMode="tel"
                          enterKeyHint="next"
                          aria-label={t.steps.customer.phone_label}
                          className="flex-1 border-b border-black/10 bg-transparent pb-2 font-serif text-lg text-black transition-colors placeholder:text-black/10 focus:border-black focus:outline-none"
                          placeholder={
                            countryCode === "+57"
                              ? t.steps.customer.phone_placeholder_co
                              : t.steps.customer.phone_placeholder_generic
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-black/40 transition-colors group-focus-within:text-black">
                        {t.steps.customer.dob_label}
                      </label>
                      <div className="flex items-center gap-3">
                        <select
                          value={dob.day}
                          onChange={(e) => updateDob("day", e.target.value)}
                          autoComplete="bday-day"
                          aria-label={t.steps.customer.dob_day}
                          className="flex-1 cursor-pointer appearance-none border-b border-black/10 bg-transparent pb-2 pr-6 font-serif text-lg text-black transition-colors focus:border-black focus:outline-none"
                          required
                        >
                          <option value="">{t.steps.customer.dob_day}</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <select
                          value={dob.month}
                          onChange={(e) => updateDob("month", e.target.value)}
                          autoComplete="bday-month"
                          aria-label={t.steps.customer.dob_month}
                          className="flex-1 cursor-pointer appearance-none border-b border-black/10 bg-transparent pb-2 pr-6 font-serif text-lg text-black transition-colors focus:border-black focus:outline-none"
                          required
                        >
                          <option value="">{t.steps.customer.dob_month}</option>
                          {t.steps.customer.months_short.map((m, i) => (
                            <option key={i} value={i + 1}>
                              {m}
                            </option>
                          ))}
                        </select>
                        <select
                          value={dob.year}
                          onChange={(e) => updateDob("year", e.target.value)}
                          autoComplete="bday-year"
                          aria-label={t.steps.customer.dob_year}
                          className="flex-1 cursor-pointer appearance-none border-b border-black/10 bg-transparent pb-2 pr-6 font-serif text-lg text-black transition-colors focus:border-black focus:outline-none"
                          required
                        >
                          <option value="">{t.steps.customer.dob_year}</option>
                          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(
                            (y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-dashed border-black/10 pt-8">
                    <h4 className="mb-4 font-serif text-lg">{t.steps.customer.gift_card_title}</h4>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={giftCode}
                        onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        inputMode="text"
                        aria-label={t.steps.customer.gift_card_title}
                        className="min-h-11 flex-1 rounded-lg border-none bg-black/[0.03] px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-black/20"
                        placeholder={t.steps.customer.gift_card_placeholder}
                      />
                      <button
                        onClick={() => void applyGiftCode()}
                        disabled={giftValidating || !giftCode.trim()}
                        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-black px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f5f5dc] transition-all hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:opacity-50"
                      >
                        {giftValidating
                          ? t.steps.customer.gift_card_validating
                          : t.steps.customer.gift_card_apply}
                      </button>
                    </div>
                    {giftError ? (
                      <p role="alert" className="mt-2 text-xs text-red-600">
                        {giftError}
                      </p>
                    ) : null}
                    {booking.giftCard?.valid ? (
                      <p className="mt-2 text-xs text-green-700">
                        {interpolate(t.steps.customer.gift_card_applied, {
                          amount: formatCurrencyFromCents(booking.giftCard.amount),
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between gap-3 border-t border-black/10 pt-4 sm:pt-6">
                  <button
                    onClick={() => setStep(3)}
                    className="flex min-h-11 items-center border-b border-black pb-1 text-[10px] uppercase tracking-[0.2em] transition-opacity hover:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2"
                  >
                    {t.common.back}
                  </button>
                  <button
                    onClick={() => setStep(5)}
                    disabled={!isFormValid}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-6 py-3 text-[10px] uppercase tracking-[0.2em] text-[#f5f5dc] shadow-lg transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-2 disabled:opacity-50 disabled:hover:scale-100 sm:px-8"
                  >
                    {t.steps.customer.review_reservation}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Payment */}
            {step === 5 && booking.service && booking.timeSlot && booking.date ? (
              <PaymentStep
                slug={slug}
                spa={spa}
                bookingData={booking}
                onBack={() => setStep(4)}
                onComplete={closeAndReset}
                client={client}
                wompiPublicKey={wompiPublicKey}
                translations={translations}
                paymentRedirectUrl={paymentRedirectUrl}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
