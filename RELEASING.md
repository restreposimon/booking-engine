# Maintaining & releasing `@strmlsys/booking-engine`

This repo is the **single source of truth** for the booking engine. You edit the
engine here, cut a release, and it's published to the **public npm registry** as
`@strmlsys/booking-engine`. Every website (Glow Nails and every future client
site) installs it from npm — so **one release reaches every site**.

> ⚠️ Do **not** edit copies of this code that live in other projects (e.g. the
> `packages/booking-engine` folder inside the Spaboard monorepo). Change it
> **here**, release, and let everything else pull the new version from npm.
> Two editable copies = drift and confusion. One source of truth.

## How a change reaches your sites

```
edit code here → bump version → cut a GitHub Release → the "Publish to npm" Action runs `npm publish`
   → new version live on npm → Dependabot opens an "update" PR on each site → merge → site redeploys
```

Nothing is silent or automatic: each site's update arrives as a **PR you can
review**, and that site's build must pass before it goes live.

## Cutting a release (the normal flow)

1. Make your changes on `main` (directly or via a PR).
2. Bump the version in `package.json` using **semver**:
   - **patch** `1.0.0 → 1.0.1` — bug fix, no API change.
   - **minor** `1.0.0 → 1.1.0` — new feature, backwards-compatible.
   - **major** `1.0.0 → 2.0.0` — a breaking change to props/behavior.
   - Shortcut: `npm version patch|minor|major` bumps `package.json` **and** creates the matching git tag.
3. Commit & push (if you didn't use `npm version`, commit the bump manually).
4. On GitHub → **Releases → Draft a new release** → pick/create the tag
   **`vX.Y.Z`** (must match `package.json`) → **Publish release**.
5. The **Publish to npm** workflow runs automatically. Watch it under the repo's
   **Actions** tab — green check = it's on npm.

That's the whole job. Sites pick it up via Dependabot.

## Testing a change *before* you publish

Sites install the **published** version, so an unpublished local edit won't show
up on its own. To try a work-in-progress against a real site locally:

```bash
# in THIS repo
npm link
# in the site you're testing (e.g. the glow-nails repo)
npm link @strmlsys/booking-engine
npm run dev          # the site now uses your local engine code
```

Run `npm unlink @strmlsys/booking-engine` in the site when you're done. (Or
publish a pre-release like `1.1.0-beta.0` and install just that in one site.)

## The publish token (`NPM_TOKEN`) — and rotating it

Publishing uses the **`NPM_TOKEN`** repo secret
(*Settings → Secrets and variables → Actions*). It's a **granular** npm token, so
it **expires about every 90 days** (that's npm's max for granular tokens).

**This only ever affects publishing a new version — it never affects live sites**
(they install from public npm with no token at all). If a release fails with an
auth/401 error, the token has expired. To rotate (~2 min):

1. npmjs.com → **Access Tokens → Generate New Token → Granular**
   - Permissions: **Read and write**, scoped to your `@strmlsys` packages.
   - ✅ **Check "Bypass two-factor authentication (2FA)."**
   - Leave **Allowed IP ranges** empty.
2. Copy it → this repo → **Settings → Secrets and variables → Actions** → update
   **`NPM_TOKEN`**.
3. Re-run the failed release: **Actions → the failed run → Re-run jobs**.

> Don't want to rotate ever? Swap `NPM_TOKEN` for a **classic "Automation"
> token** — it has no expiry. Trade-off: it's broader-scoped than a granular
> token, so the granular one is the more secure choice.

## Security notes

- The package is **public**, but it holds **no secrets** — it's just UI that
  talks to the hosted API. Safe to be public.
- Keep **2FA enabled** on the npm account; it's the main thing guarding publishes.
- Many sites auto-install this package, so treat the npm account + token as
  sensitive. Don't enable blind auto-merge of dependency PRs — review them.

See [`docs/adding-to-a-site.md`](docs/adding-to-a-site.md) for the consumer-side
setup (how to drop the engine into a new website).
