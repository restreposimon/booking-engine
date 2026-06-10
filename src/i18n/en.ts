/**
 * English translations. Keys must mirror ./es.ts exactly — if you add a key
 * to one locale, add it to all locales.
 */
import type { Translations } from "./index"

export const en: Translations = {
  common: {
    back: "Back",
    close: "Close",
    cancel: "Cancel",
    confirm: "Confirm",
    continue: "Continue",
    loading: "Loading...",
    submit: "Submit",
    error_generic: "Something went wrong. Please try again.",
    retry: "Retry",
  },

  header: {
    booking_label: "Book",
    book_appointment: "Book your appointment",
    online_booking: "Online booking",
    buy_gift_card: "Buy a gift card",
  },

  page: {
    intro: "Choose a service and complete your booking in minutes.",
    category_label: "Category",
  },

  progress: {
    step_of: "Step {{current}} of {{total}}",
  },

  card: {
    book: "Book",
    read_more: "Read more",
    read_less: "Read less",
    duration_min: "min",
  },

  steps: {
    service: {
      pick_category_title: "Choose a category",
      pick_category_subtitle: "Let's start with the type of experience you're looking for.",
      back_to_categories: "Back to categories",
      category_pick_service_subtitle: "Choose the service you'd like to book.",
      uncategorized: "Other services",
      service_singular: "service",
      service_plural: "services",
      view_services: "View services →",
      select_this_service: "Select this service →",
      duration_minutes: "{{minutes}} minutes",
      no_services_in_category: "No services available in this category.",
    },
    date: {
      title: "Choose a date",
      subtitle: "Pick the day that works best for you.",
      loading_availability: "Loading availability...",
    },
    time: {
      title: "Choose a time",
      subtitle: "Pick your preferred available time.",
      staff_preference: "Staff preference",
      any_staff: "Any",
      available_slots: "Available times",
      loading_slots: "Loading times...",
      no_slots: "No times available for this date.",
      pick_another_date: "Pick another date",
      slot_available: "Available",
      slots_available: "{{count}} available",
    },
    customer: {
      title: "Your details",
      subtitle: "We need a few details to confirm your booking.",
      name_label: "Full name",
      name_placeholder: "Jane Smith",
      email_label: "Email address",
      email_placeholder: "jane@example.com",
      phone_label: "Phone number",
      phone_placeholder_co: "300 123 4567",
      phone_placeholder_generic: "Number",
      country_code_label: "Country code",
      dob_label: "Date of birth",
      dob_day: "Day",
      dob_month: "Month",
      dob_year: "Year",
      months_short: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ],
      gift_card_title: "Have a gift card?",
      gift_card_placeholder: "Enter the code",
      gift_card_apply: "Apply",
      gift_card_validating: "Validating...",
      gift_card_applied: "✓ Card applied — {{amount}}",
      review_reservation: "Review booking",
    },
    payment: {
      title: "Confirm and pay",
      subtitle: "Review the details before proceeding to payment.",
      service: "Service",
      date: "Date",
      time: "Time",
      guest: "Guest",
      location: "Location",
      subtotal: "Subtotal",
      gift_card_discount: "Gift card",
      total_service: "Service total",
      payment_option: "Payment option",
      pay_deposit: "Pay deposit",
      pay_remaining_on_arrival: "Pay now, {{amount}} on arrival",
      covered_by_gift_card: "Covered by your gift card",
      total_to_pay_now: "Total to pay now",
      pending_on_arrival: "Pending on arrival",
      proceed_to_payment: "Proceed to payment",
      confirm_reservation: "Confirm booking",
      redirecting: "Redirecting...",
      preparing_payment: "Preparing your payment...",
      redirecting_to_gateway: "Redirecting you to the secure payment page...",
      price: "Price",
      policies_title: "Important information",
      policy_punctuality:
        "Please arrive on time for your appointment — no more than 15 minutes late. If you arrive late, we'll gladly reschedule you for another day to avoid any inconvenience.",
      policy_no_refund:
        "We do not offer refunds. We're happy to reschedule your appointment or apply the amount paid to another service.",
      pay_full: "Pay in full",
      nothing_on_arrival: "Nothing due on arrival",
    },
  },

  result: {
    success_appointment: "Payment successful! Your booking is confirmed. A confirmation email is on its way.",
    success_gift_card: "Payment successful! Your gift card is confirmed. A confirmation email is on its way.",
    error: "Payment could not be processed. Please try again or contact support if the problem persists.",
    pending_appointment: "Your payment is being processed. You'll receive an email confirmation once verified.",
    pending_gift_card: "Your payment is being processed. You'll receive an email confirmation once your gift card is verified.",
    no_transaction: "No transaction information received. Please check your payment status in your account.",
    back_home: "Back to Home",
    try_again: "Try Again",
    success_title: "Payment Successful!",
    error_title: "Payment Error",
    pending_title: "Payment Processing",
    processing_title: "Verifying your payment",
    verifying: "We're confirming your payment with the gateway. This only takes a moment.",
  },

  calendar: {
    months_long: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    days_short: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
    previous_month: "Previous month",
    next_month: "Next month",
    day_label: "{{day}} of {{month}}",
    day_unavailable_suffix: " unavailable",
    date_locale: "en-US",
  },

  test_mode: {
    banner_title: "Test mode",
    banner_desc:
      "This test transaction will NOT process a real charge. Use card {{card}} with any CVV and a future date to simulate an approved payment.",
    test_card: "4242 4242 4242 4242",
  },

  gift_card: {
    page_title: "Gift cards",
    page_intro:
      "Buy a gift card for a loved one, or get one for yourself and use it later when booking.",
    buy_button: "Buy a gift card",
    back_to_booking: "Back to booking",
    modal_title: "Buy a gift card",
    choose_type: "Choose the gift type",
    gift_for_someone: "Gift for someone",
    for_myself: "For myself",
    optional_service: "Optional: gift a specific package or service",
    generic_amount: "Generic amount",
    amount_placeholder: "Amount in COP",
    recipient_name: "Recipient name",
    recipient_email: "Recipient email",
    recipient_phone: "Recipient phone",
    message_optional: "Message (optional)",
    self_note: "This gift card will be issued to your own contact information.",
    your_name: "Your name",
    your_email: "Your email",
    your_phone: "Your phone",
    go_to_payment: "Go to payment",
    preparing: "Preparing...",
    error_generic: "Could not create the gift card",
  },
}
