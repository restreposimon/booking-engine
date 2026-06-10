import { interpolate } from "../utils/format"
import type { Translations } from "../i18n"

interface BookingProgressProps {
  currentStep: number
  totalSteps?: number
  translations: Translations
}

export function BookingProgress({
  currentStep,
  totalSteps = 5,
  translations: t,
}: BookingProgressProps) {
  const progress = (currentStep / totalSteps) * 100
  const stepOfText = interpolate(t.progress.step_of, {
    current: currentStep,
    total: totalSteps,
  })

  return (
    <div className="w-full">
      <div className="mb-2 flex items-end justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-black/40">
          {stepOfText}
        </span>
      </div>
      <div className="h-[2px] w-full overflow-hidden rounded-full bg-black/10">
        <div
          className="h-full bg-black transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
