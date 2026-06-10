# Adding the booking engine to a website

Works in any **Next.js (App Router)** site. ~5 minutes. **No tokens, no secrets,
no backend** — the site only ever talks to the hosted API.

## 1. Install

```bash
npm i @strmlsys/booking-engine
```

## 2. `next.config.mjs` — transpile the package

The engine ships raw TypeScript/JSX source, so Next must compile it:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@strmlsys/booking-engine"],
};
export default nextConfig;
```

## 3. `app/globals.css` — let Tailwind v4 style it

The engine styles itself with Tailwind utility classes and ships no CSS, and
Tailwind v4 ignores `node_modules` by default. Add this right under
`@import "tailwindcss";`:

```css
@source "../node_modules/@strmlsys/booking-engine/src";
```

## 4. The three pages

Each is a client component. Set `businessId` to **this client's slug** and
`theme` to match the site's look. Full working reference: the **glow-nails** repo.

`app/reservar/page.tsx`:

```tsx
"use client"
import { BookingFlow } from "@strmlsys/booking-engine"

const theme = {
  primary: "#38322a", background: "#e8e0d0", surface: "#faf6ec",
  text: "#2c2823", primaryForeground: "#f3eee1", radius: "0px",
}

export default function Page() {
  return (
    <BookingFlow
      businessId="glownails"
      apiUrl="https://app.lumiagenda.co/api/public/v1"
      locale="es"
      theme={theme}
      paymentRedirectUrl={typeof window !== "undefined" ? `${window.location.origin}/result` : undefined}
      onBuyGiftCard={() => { window.location.href = "/giftcards" }}
    />
  )
}
```

`app/giftcards/page.tsx` → `<GiftCardFlow businessId=… apiUrl=… locale="es" theme={theme} giftCardRedirectUrl={origin + "/result"} bookingUrl="/reservar" />`

`app/result/page.tsx` → `<PaymentResultFlow businessId=… apiUrl=… locale="es" theme={theme} backUrl="/reservar" />`

Then add a **Book** link to the site's nav pointing at `/reservar`.

## 5. Auto-updates — `.github/dependabot.yml`

So the site automatically gets new engine versions (as reviewable PRs):

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

## 6. CORS (provider side — not in the site)

The site's domain (and `http://localhost:3000` for dev) must be on the
**business's allowlist** in the hosted API, or the service list returns **403**.
That's configured per-business on the provider (Spaboard) side — there's nothing
to set in the website itself.

## Theme keys

Pass any subset of:
`primary`, `background`, `surface`, `text`, `muted`, `border`,
`primaryForeground`, `fontDisplay`, `fontBody`, `radius`.

## Components

| Component | Page | Purpose |
| --- | --- | --- |
| `BookingFlow` | `/reservar` | service → date/time → details → payment |
| `GiftCardFlow` | `/giftcards` | buy a gift card |
| `PaymentResultFlow` | `/result` | post-payment result (reads status from the URL) |
