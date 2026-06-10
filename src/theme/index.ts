/**
 * Theme tokens for the booking engine.
 *
 * Applied via CSS custom properties on a wrapper element. Consumers pass a
 * partial theme via the `theme` prop on `<BookingFlow>`; missing keys fall
 * back to the defaults below (Spaboard's existing beige + black look).
 *
 * Tokens are intentionally minimal — adding more is cheap but each one is a
 * commitment that every future component must respect. Only add tokens when
 * a real client needs them.
 */

export interface BookingTheme {
  /** Main accent color. Used for selected buttons, primary CTAs, focus rings. */
  primary: string

  /** Canvas / background color behind the content. */
  background: string

  /** Surface color for cards, inputs, the right modal panel. */
  surface: string

  /** Body text color. */
  text: string

  /** Secondary text (labels, captions, helper text). */
  muted: string

  /** Hairline / divider color. */
  border: string

  /** Foreground color drawn on top of `primary` (e.g. button label color). */
  primaryForeground: string

  /** CSS font-family for the headline / "serif" elements. */
  fontDisplay: string

  /** CSS font-family for body text / form elements. */
  fontBody: string

  /** Border radius for buttons, cards, inputs. Pass a CSS length, e.g. "0.5rem" or "4px". */
  radius: string
}

/** Default theme matches Spaboard's existing booking page. */
export const defaultTheme: BookingTheme = {
  primary: "#000000",
  background: "#f9f9f4",
  surface: "#ffffff",
  text: "#000000",
  muted: "rgba(0,0,0,0.55)",
  border: "rgba(0,0,0,0.1)",
  primaryForeground: "#f5f5dc",
  fontDisplay:
    'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
  fontBody:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  radius: "0.75rem",
}

/** Public-facing partial theme — consumers may override any subset. */
export type PartialBookingTheme = Partial<BookingTheme>

/**
 * Merge a partial theme with the defaults, returning a fully-populated theme.
 * Safe to call with `undefined` (returns defaults).
 */
export function resolveTheme(partial?: PartialBookingTheme): BookingTheme {
  return { ...defaultTheme, ...(partial ?? {}) }
}

/**
 * Convert a resolved theme to a CSS custom-property style object that can be
 * spread onto a wrapper element. All booking-engine components read from
 * these vars, so a single wrapper styles the entire flow.
 *
 *   <div style={themeToCssVars(theme)}>
 *     <BookingFlow ... />
 *   </div>
 */
export function themeToCssVars(theme: BookingTheme): React.CSSProperties {
  return {
    // Use a `--be-*` (booking-engine) prefix to avoid colliding with the
    // host site's own CSS variables.
    "--be-primary": theme.primary,
    "--be-background": theme.background,
    "--be-surface": theme.surface,
    "--be-text": theme.text,
    "--be-muted": theme.muted,
    "--be-border": theme.border,
    "--be-primary-fg": theme.primaryForeground,
    "--be-font-display": theme.fontDisplay,
    "--be-font-body": theme.fontBody,
    "--be-radius": theme.radius,
  } as React.CSSProperties
}
