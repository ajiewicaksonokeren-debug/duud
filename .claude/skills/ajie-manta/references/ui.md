# UI, frontend, landing page, mobile

The project's own design system wins on look (tokens, radius, borders, fonts). If a default conflicts with it, keep the design and mention the conflict once.

## Layout & breakpoints (mobile-first, `min-width`)
| Name | Width | Use |
|---|---|---|
| base | 360 | smallest phone that must work perfectly; also check 320 doesn't break |
| app frame | 480 | mobile-app column when the product is phone-first |
| tablet | 768 | |
| laptop | 1024 | |
| desktop | 1280 | content container max 1200–1280 |
| wide | 1440 | screenshot check; nothing stretches beyond container |
- Screenshot every UI change at **360, 390, 768, 1024, 1440**. Zero horizontal scroll at any width.
- Side gutter 16px (mobile) · 24px (tablet) · 32px (desktop).
- Height: `min-height: 100vh; min-height: 100dvh;` (dvh avoids the mobile address-bar jump; vh is the fallback).
- Notch/home bar (Capacitor): `env(safe-area-inset-*)` on any fixed top/bottom bar.
- Spacing scale (4px base): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. No random values.

## Typography
- Body 16px, line-height 1.5; headings line-height 1.1–1.2; fluid headings with `clamp()`.
- Minimum 12px for any text a user must read (10–11px only for decorative uppercase mono labels).
- Line length 45–75 characters (`max-width: 65ch` on prose).
- **Inputs ≥16px font-size** — below 16px iOS Safari zooms in on focus.

## Touch & interaction
- Touch targets ≥44×44px (Apple HIG; Material says 48dp), ≥8px between targets.
- Real `<button>`/`<a>`, never clickable `<div>`. Visible `:focus-visible` outline.
- Motion 150–300ms; honour `prefers-reduced-motion: reduce`.
- States for every data view: loading · empty · error · success. Buttons disabled + label change while submitting; no double submit.

## Color & accessibility
- Contrast WCAG AA: 4.5:1 normal text, 3:1 large text (≥24px or ≥19px bold) and UI borders/icons.
- Never color alone for meaning (add icon/text). Every image has `alt` (`alt=""` if decorative). `<html lang="id">`.
- Form fields have a `<label>`; errors shown inline next to the field.

## Images & performance (Core Web Vitals "good")
- LCP ≤2.5s · INP ≤200ms · CLS ≤0.1.
- Images: explicit `width`/`height` (or `aspect-ratio`), WebP/AVIF, `srcset`, `loading="lazy"` below the fold, hero ≤200KB.
- No heavy library for something CSS/stdlib does. Fonts: max 2 families, `font-display: swap`.

## Landing page extras
- `<title>` ≤60 chars · meta description ≤160 chars · one `<h1>`.
- OG/Twitter tags, OG image 1200×630. Favicon + apple-touch-icon 180×180.
- One primary CTA visible above the fold at 360px.

## Forms & mobile keyboard
- `type`/`inputmode`/`autocomplete` correct: phone/e-wallet → `type="tel" inputmode="numeric" autocomplete="tel"`; email → `type="email"`; OTP → `inputmode="numeric" autocomplete="one-time-code"`.
- Validate on client for UX and on server for truth.

## Mobile store assets
- Play Store icon 512×512 PNG · feature graphic 1024×500 · screenshots min 320px side, 16:9 or 9:16.
- App Store icon 1024×1024 PNG, no transparency.
