# Accessibility Specification

This file owns the accessibility target and the keyboard, focus, touch-target, zoom, reduced-motion and test-matrix rules. Colour contrast values are in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#colour-and-contrast). Evidence is recorded in [qa/ACCESSIBILITY-AUDIT.md](../../qa/ACCESSIBILITY-AUDIT.md). No conformance is claimed: rendered-page and device testing is NOT TESTED.

- **Target standard and jurisdiction:** WCAG 2.2 AA as the product target (Plans 2026, approved 10 October 2026). Nigerian legal accessibility duties: Unknown, not researched.
- **Keyboard and focus:** everything operable by keyboard. Focus is always visible through `:focus-visible`, using a 2px `#171A20` outline; the admin already uses the primary colour (`heritos-admin.css:191`). Never an amber ring on white, which would fail 3:1. Focus is never obscured by sticky headers or actions. Modals trap focus while open and return it on close.
- **Semantic structure and labels:** persistent visible labels on every field; no placeholder-only fields; icons accompany labels for important tasks; headings in order; landmarks for header, navigation, main and footer.
- **Contrast and non-colour cues:** text pairs from the measured table only; `#8E8E8E` for control borders only; status always as text plus icon plus colour.
- **Touch targets and zoom:** 44px preferred minimum, 48px for primary form controls. WCAG 2.2 AA asks for 24px with exceptions; the larger size is a deliberate usability choice. Text enlarged to 200% and reflow at narrow widths without loss. Tables may scroll horizontally inside their own container where essential; the page itself never overflows. Sticky actions never cover inputs or the phone keyboard.
- **Screen-reader announcements:** saving, saved and failed states and form error summaries are announced. Exact mechanism: Proposed, to define with the Phase 2 forms.
- **Reduced motion:** see below.
- **Test devices and widths:** 320, 375 or 390, 768, 1024 and 1440 CSS pixels, portrait and landscape; keyboard only; a representative screen reader on phone and laptop (devices Unknown).

## Reduced motion

`prefers-reduced-motion` gets static equivalents. Content is visible without JavaScript animation. Anything that moves on its own has a visible pause control; hover-only pause does not count. The W3C interaction-animation criterion is AAA; reduced motion is a product requirement here regardless. Public CSS already has some reduced-motion and focus rules (Plans 2026, 07), which is a starting point, not proof.

Automated checks alone are insufficient; manual keyboard and assistive-technology checks are required before any accessibility claim.
