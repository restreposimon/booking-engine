/**
 * Shape adapters: convert the neutral public API types (`Business`, `Service`)
 * into the legacy `PublicSpa` / `PublicService` shapes the internal components
 * (BookingModal, PaymentStep, GiftCardModal, …) were originally written
 * against. Keeps the refactor surface small — we feed the components the same
 * shape they expect instead of rewriting every `spa.foo` reference.
 *
 * Shared by BookingFlow and GiftCardFlow so the mapping lives in one place.
 */

import type { Business, Service } from "../types"
import type { PublicService, PublicSpa } from "./internal-types"

export function businessToSpa(business: Business): PublicSpa {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    logo_url: business.logo_url,
    phone: business.phone,
    email: business.email,
    address: business.address,
    website: business.website,
    instagram_url: business.instagram_url,
    payment_requirement: business.payment_requirement,
    deposit_percentage: business.deposit_percentage,
    deposit_fixed_amount_cop: business.deposit_fixed_amount,
  }
}

export function serviceToPublicService(service: Service): PublicService {
  return {
    id: service.id,
    spa_id: service.business_id,
    name: service.name,
    description: service.description,
    duration_minutes: service.duration_minutes,
    price_cop: service.price,
    category: service.category,
    photo_url: service.photo_url,
    staff_required_count: service.staff_required_count,
    require_room: service.require_room,
  }
}
