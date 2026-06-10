# @strmlsys/booking-engine

Reusable booking engine that powers Spaboard's hosted booking page AND every
Tier 2 custom client website. **One source of truth** — bugfixes and features
propagate to every consumer.

## Install

Consumed straight from this **public repo as an HTTPS tarball** — it is *not*
published to npm, and you should **not** use the `github:` shorthand (see the
warning below). Add it to the host app's `package.json`:

```jsonc
{
  "dependencies": {
    "@strmlsys/booking-engine": "https://github.com/restreposimon/booking-engine/archive/refs/heads/main.tar.gz",
    "react": "^18 || ^19",
    "react-dom": "^18 || ^19"
  }
}
```

…then `npm install` (or `pnpm install` / `yarn`).

> ⚠️ **Do NOT use `github:restreposimon/booking-engine#main`.** npm rewrites
> `github:` / git dependencies to `git+ssh://git@github.com/…` in the lockfile,
> which fails on Vercel and most CI with `Permission denied (publickey)` —
> the build machine has no SSH key. The HTTPS tarball above is fetched
> anonymously: no SSH key, no token, no `vercel.json`, nothing to configure.

### Required: transpile the package

The engine ships **raw TypeScript** (no build step), so the host app must
transpile it like first-party code. In Next.js, add to `next.config.mjs`:

```js
const nextConfig = { transpilePackages: ["@strmlsys/booking-engine"] }
export default nextConfig
```

Skip this and the build fails trying to parse `.tsx` from `node_modules`.

### Deploying (Vercel / any host)

No deploy config is needed — the public tarball installs anonymously during the
build. The **one** server-side prerequisite is the **CORS allowlist**: the
site's domain must be registered for the business on the Spaboard side, or the
API returns **403** to cross-origin calls. If the page loads but data fails with
a CORS / 403 error, that's the signal — the Spaboard operator adds the domain
(e.g. `https://clientsite.com`, plus `http://localhost:3000` for local dev).
This is a server-side allowlist entry, **not** a client-code fix — do not try to
work around it in the app.

## Quick start

```tsx
import { BookingFlow } from "@strmlsys/booking-engine"

export default function ReservarPage() {
  return (
    <BookingFlow
      businessId="casaverde"
      apiUrl="https://app.lumiagenda.co/api/public/v1"
    />
  )
}
```

That's it. The component handles service selection, calendar, time slots,
customer form, gift cards, payment redirect to Wompi, and the result page
handoff.

## The three drop-in flows

`<BookingFlow>` is the main entry point, but the engine ships two sibling
components for the other two pages a booking site needs. All three take the
same `businessId` / `apiUrl` / `theme` / `locale` props, share the same
security model, and render fully in both Spanish and English.

| Component | Renders | Typical route |
|---|---|---|
| `<BookingFlow>` | Service list → date → time → customer → payment | `/book/[slug]` |
| `<GiftCardFlow>` | Gift-card landing + purchase modal | `/book/[slug]/giftcards` |
| `<PaymentResultFlow>` | Post-Wompi success / pending / error screen | `/book/[slug]/result` |

```tsx
import { GiftCardFlow, PaymentResultFlow } from "@strmlsys/booking-engine"

// Gift-card purchase page
<GiftCardFlow businessId="casaverde" />

// The page Wompi redirects back to after payment (appointments AND gift cards)
<PaymentResultFlow businessId="casaverde" />
```

`<GiftCardFlow>` also accepts an optional `testMode` prop (routes purchases
through Wompi's sandbox) plus `bookingUrl` / `giftCardRedirectUrl` overrides.

`<PaymentResultFlow>` reads the Wompi status straight from the URL query
string, so it needs no server-side data and stays fast even if the API is
slow — it only fires a best-effort `saveTransaction` call (the signed webhook
is the real source of truth, so a failure here never blocks the success
screen).

## Configuration

### Required props

| Prop | Type | Description |
|---|---|---|
| `businessId` | `string` | The slug of the business this flow books for. Must exist in Spaboard's DB. |
| `apiUrl` | `string` | Base URL of Spaboard's public v1 API. May also be supplied via `NEXT_PUBLIC_SPABOARD_API_URL`. |

### Optional props

| Prop | Type | Description |
|---|---|---|
| `theme` | `PartialBookingTheme` | Visual tokens — colors, fonts, radius. Missing keys fall back to defaults. |
| `locale` | `"es" \| "en"` | UI language. Defaults to `"es"`. |
| `paymentRedirectUrl` | `string` | Where Wompi redirects after payment. Defaults to `${origin}/book/${businessId}/result?appointment_id=...`. Tier 2 sites should point this at their own result page. |
| `onBuyGiftCard` | `() => void` | Click handler for the "Buy a gift card" link. If omitted, the link is hidden. |
| `loadingFallback` | `ReactNode` | Custom loading UI while the business is being fetched. |
| `errorFallback` | `(error) => ReactNode` | Custom error UI. |

### Environment variables

If you set these on the host site, they're picked up automatically:

```
NEXT_PUBLIC_SPABOARD_API_URL=https://app.lumiagenda.co/api/public/v1
NEXT_PUBLIC_BUSINESS_SLUG=casaverde   # optional convention; you still pass it via businessId prop
```

Both values are public, safe to commit. No secrets ever live in a Tier 2
client site — Spaboard's server holds every key.

## Theming

```tsx
<BookingFlow
  businessId="casaverde"
  theme={{
    primary: "#2D5016",
    background: "#f5f5dc",
    surface: "#ffffff",
    text: "#1a1a1a",
    muted: "rgba(0,0,0,0.55)",
    border: "rgba(0,0,0,0.1)",
    primaryForeground: "#ffffff",
    fontDisplay: "'Cormorant Garamond', serif",
    fontBody: "system-ui, sans-serif",
    radius: "4px",
  }}
/>
```

Themes are applied as CSS custom properties on a wrapper element
(`--be-primary`, `--be-radius`, etc.). The engine's components reference
those vars, so a single wrapper styles the entire flow.

## Localization

```tsx
<BookingFlow businessId="casaverde" locale="en" />
```

Two locales ship today: `"es"` (Spanish, default) and `"en"` (English).
Every user-facing string is translated — across all three flows: the
calendar and time picker, the multi-step booking modal, the payment summary
and policies, the gift-card purchase modal, the result screen, and the
sandbox test-mode banner. There are no hardcoded strings in any locale.

Add more by translating `src/i18n/es.ts` → `src/i18n/<locale>.ts` and
registering in `src/i18n/index.ts`. `es.ts` is the `as const` source of
truth; every other locale's type is checked against it, so a missing key is
a compile error.

## Architecture

The engine is just React + a thin SDK. No state management, no global
context — drop it into any React app, server-rendered or client-rendered,
Next.js or otherwise.

```
@strmlsys/booking-engine
├── src/
│   ├── components/
│   │   ├── BookingFlow.tsx          # top-level booking — fetches business, themes, renders BookingPage
│   │   ├── BookingPage.tsx          # service list + landing
│   │   ├── BookingModal.tsx         # multi-step modal (services → date → time → customer → payment)
│   │   ├── BookingProgress.tsx      # progress indicator
│   │   ├── PaymentStep.tsx          # Wompi redirect + summary
│   │   ├── GiftCardFlow.tsx         # top-level gift-card — fetches business, renders GiftCardPage
│   │   ├── GiftCardPage.tsx         # gift-card landing
│   │   ├── GiftCardModal.tsx        # multi-step gift-card purchase modal
│   │   ├── PaymentResultFlow.tsx    # top-level result screen (themed wrapper, no fetch)
│   │   ├── PaymentResult.tsx        # post-Wompi success / pending / error UI
│   │   ├── PublicHeader.tsx         # branding strip
│   │   ├── ServiceCard.tsx          # service preview
│   │   └── adapters.ts              # Business/Service → internal PublicSpa/PublicService
│   ├── sdk/                         # createClient() + typed methods
│   ├── i18n/                        # es.ts, en.ts, getTranslations()
│   ├── theme/                       # default tokens + resolveTheme + themeToCssVars
│   ├── types/                       # Business, Service, etc.
│   └── utils/                       # currency formatting, interpolation
└── package.json
```

### Talking directly to the API

For very custom flows where the default UI doesn't fit, use the SDK:

```tsx
import { createClient } from "@strmlsys/booking-engine"

const client = createClient({
  apiUrl: "https://app.lumiagenda.co/api/public/v1",
  businessId: "casaverde",
})

const { business, services } = await client.getBusiness()
const { dates } = await client.getAvailableDates({ serviceId, startDate, endDate })
const result = await client.createAppointment({ ... })
```

Every method is typed; errors throw `ApiError` with `status`, `code`, `message`,
`details`.

### Lower-level components

Power users can compose with the sub-components instead of `<BookingFlow>`:

```tsx
import { BookingPage, createClient } from "@strmlsys/booking-engine"

const client = createClient({ apiUrl, businessId })
const { business, services, wompi_public_key } = await client.getBusiness()

<BookingPage
  slug={businessId}
  spa={...}  // map business to PublicSpa shape
  services={...}
  client={client}
  wompiPublicKey={wompi_public_key}
  translations={getTranslations("es")}
/>
```

This is the same path Spaboard's own `/book/[slug]` page uses (server-side
data loading + client component rendering).

## Security model

The engine holds **zero secrets** — no API keys, no database credentials,
nothing. It only ever calls Spaboard's hosted public API, and **every
security decision is made server-side**: authentication, authorization,
input validation, abuse/bot protection, rate limiting, and payment
verification all live on Spaboard's servers, never in this package.

Because a Tier 2 site carries no secrets and makes no trust decisions of its
own, there's nothing sensitive to leak in its source. The specifics of the
server-side protections are documented privately, not here.

## Updating

There are no version numbers to bump — every site installs from the `main`
tarball, so **`npm install` always pulls the latest engine code**. To ship an
engine update to a client site, reinstall and redeploy (CI reinstalls on every
deploy):

```bash
npm install   # re-fetches the main tarball
```

Because the engine is the single source of truth, a fix made once in this repo
reaches every site on its next install — no per-site code changes. (The repo is
mirrored automatically from the Spaboard monorepo; never edit it directly, your
changes get overwritten on the next sync.)

## License

Proprietary — STRMLSYS. Not for redistribution.

## Documentation

- **[Adding the engine to a website](docs/adding-to-a-site.md)** — consumer setup: install, config, the three pages.
- **[Maintaining & releasing](RELEASING.md)** — edit the engine, cut a release, rotate the npm token.
