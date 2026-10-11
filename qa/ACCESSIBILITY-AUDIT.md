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
