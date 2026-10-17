# Accessibility Audit

Evidence for accessibility. Requirements: [docs/ACCESSIBILITY.md](../docs/ACCESSIBILITY.md).

## Automated evidence

The GEE OS automated gate (`./scripts/project accessibility` writing `.agent/evidence/accessibility.json`) is not set up in this project (Verified 10 October 2026). No axe or other automated scan has been run. Automated checks would cover only automatically testable rules, not complete WCAG compliance.

## Manual assurance

| Area | Method | Expected | Observed | Status | Evidence |
|---|---|---|---|---|---|
| Colour contrast of tokens | WCAG formula on token values | Text pairs at least 4.5:1, controls 3:1 | Table in DESIGN-SYSTEM.md | PARTIAL: calculated, not measured on rendered pages | [DESIGN-SYSTEM.md](../docs/DESIGN-SYSTEM.md#colour-and-contrast) |
| Keyboard and focus | Manual | Complete operability and visible focus | Not run | NOT TESTED | None |
| Reflow and 200% zoom | Manual at 320 to 1440px | No loss of content, no page overflow | Not run | NOT TESTED | None |
| Touch targets | Manual | 44px preferred, 48px primary form controls | Not run | NOT TESTED | None |
| Screen reader | Manual on phone and laptop | Labels, errors and status announced | Not run | NOT TESTED | None |
| Reduced motion | Manual | Static equivalents | Not run | NOT TESTED | None |

The 10 October 2026 rendered audit was BLOCKED (occupied browser profile, in-app browser unavailable). The old claim that both themes pass WCAG AA had no runtime evidence and is withdrawn.

## Audit fixes, 17 October 2026

Chromium (Playwright) against `npm run dev` on 5112 with the staging API on 8088, `feat/redesign-dark-luxury`. Changes are described in [UX-SPEC.md](../docs/UX-SPEC.md#public-navigation) and [DESIGN-SYSTEM.md](../docs/DESIGN-SYSTEM.md#colour-and-contrast).

| Check | Result |
|---|---|
| Home hero with two synthetic slides: one `h1`, one `h2`; pause stops advance for 9s; button 48 by 48px; slide counter live region `off` while moving, `polite` when paused | PASS |
| Paper success token `#166534` on ivory: 6.34:1 (was `#15803D` at 4.46:1) | PASS (calculated) |
| No sideways scroll at 320px on home, contact, book, company orders, track, account and the not-found page | PASS |
| Sign-in: show password is a button with `aria-label` and `aria-pressed`; field autocomplete set | PASS (source and rendered) |
| Console | PASS: 0 errors |

NOT TESTED: testimonial pause in the browser beyond source, screen readers, real phones, keyboard-only use of the new pause buttons.

## Phase 4 public foundation, 11 October 2026

Chromium (Playwright 1.63) against `npm run dev` with local staging, `feat/phase4-website`. Pages `/`, `/about`, `/contact`, `/track`, `/book` at 320, 390, 768, 1024 and 1440px, with the staff dark theme saved in the browser. Screenshots are kept outside the repository (agent scratchpad `phase4-shots/foundation/`).

| Check | Result |
|---|---|
| No horizontal scroll (`scrollWidth <= innerWidth`) | PASS, 25 of 25 |
| One `h1` per page | PASS |
| Header, footer, form and button targets at least 44px | PASS after the `/track` shop-order inputs moved to the shared 48px input |
| No text in amber `rgb(245, 158, 11)` | PASS |
| Public page stays light with the staff dark theme saved (`data-bs-theme="light"`, white surface), also after visiting `/today` in dark mode | PASS |
| First Tab reaches "Skip to main content"; focus outline 2px solid `rgb(23, 26, 32)` | PASS |
| Mobile menu: `aria-expanded`, focus moves into the sheet, page scroll locked, Escape closes and returns focus to the Menu button | PASS |
| Reduced motion: `document.getAnimations().length` is 0 and no content left hidden | PASS on all five pages |
| No request to api.iconify.design or heritclothing.com | PASS |
| Forbidden-claims pattern (HERIT10, 1200+, 18 countries, 98%, staff names, Free Lagos delivery, worldwide, Ajuwon) and "undefined", `[owner`, `{{` | PASS |
| Images have alt, width and height | PASS (the logo is the only image) |
| Screen reader, 200% zoom, real phones | NOT TESTED |

## Phase 4 CMS pages, 11 October 2026

Branch `feat/phase4-website`, local staging, Chromium through the Playwright MCP. Routes: `/`, `/services`, a service, `/work`, a project, `/company-orders`, `/about`, `/contact`, `/faqs`, `/privacy`, `/terms`, `/journal`, `/track`, `/book`, `/how-it-works` (unpublished: not-found page). Widths 320, 390, 768, 1024 and 1440px (75 page loads).

| Check | Result |
|---|---|
| No element wider than the viewport (measured per element, because `.hc` clips horizontal overflow and would hide it from a scroll-width test) | FAIL at 320px on Home: the hero button label "Request a measurement appointment" did not wrap and pushed the hero to 352px, clipped. Fixed (buttons wrap below 600px; hero grid column `minmax(0, 1fr)`); re-run PASS at all five widths, the wrapped button 56px tall |
| Header, footer and form controls at least 44px tall; inputs 52px | PASS |
| Exactly one `h1` in `main` | PASS |
| No text in amber `#F59E0B` | PASS |
| Every image has alt, width and height | PASS |
| No request to api.iconify.design | PASS (0) |
| Forbidden-claims pattern (BUILD-SPEC 4.11) and `undefined`, `[owner`, `{{` absent | PASS; the detector was proved by injecting a claim |
| Reduced motion: no running animations on Home | PASS (0) |
| Keyboard focus visible | PASS (2px solid outline) |
| Admin screens `robots=noindex, nofollow`; public pages indexable | PASS |

NOT TESTED: screen readers, 200% zoom, the empty-CMS run from BUILD-SPEC 4.11 (Home with nothing published), real photographs.
