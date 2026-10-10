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
