export interface PublicSpa {
  id: string
  name: string
  slug: string
  logo_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  instagram_url: string | null
  payment_requirement: "full" | "percentage" | "fixed" | "none"
  deposit_percentage: number
  deposit_fixed_amount_cop: number
}

export interface PublicService {
  id: string
  spa_id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cop: number
  category: string | null
  photo_url: string | null
  staff_required_count: number | null
  require_room: boolean | null
}

export interface BookingData {
  service: PublicService | null
  date: string | null
  timeSlot: {
    startTime: string
    endTime: string
    staffId: string
    staffName: string
    staffIds?: string[]
    roomId: string | null
  } | null
  customer: {
    name: string
    email: string
    phone: string
    dateOfBirth: string
  }
  giftCard: {
    code: string
    amount: number
    valid: boolean
  } | null
}
