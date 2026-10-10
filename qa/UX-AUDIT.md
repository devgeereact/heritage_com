# UX Audit

Evidence for usability. Specification: [docs/03-design/UX-SPEC.md](../docs/03-design/UX-SPEC.md).

## Owner usability review (planned)

Try these on a phone without instruction: find today's fitting; add a walk-in client; reuse approved measurements; see which job is due tomorrow; record a verified payment; send a reply; mark a collection; correct a mistaken entry.

Proposed goals to test, not guaranteed outcomes: routine status and payment actions within a minute; a new enquiry or client within two minutes; no repeated contact entry. Watch where the owner hesitates and simplify labels and screens before adding help text. Key actions show saving and saved immediately; a failed form keeps what was typed; empty screens show one next step. Cross-device support means practical phone, tablet and laptop coverage.

## Findings

| Journey or screen | Device | Finding | Evidence | Severity | Recommendation | Status |
|---|---|---|---|---|---|---|
| Enquiries error state | Any | Technical upload instruction shown to the owner (A17) | `enquiries/page.jsx:61-63` (audit) | Medium | Plain message and Retry | Fixed on `feat/phase1b-staging`; browser NOT TESTED |
| Tailoring and Groups error states | Any | Same upload instruction pattern remains (K-02) | `tailoring/page.jsx:207-210`, `tailoring/groups/page.jsx:152` | Medium | Same fix as A17 | Fixed on `feat/phase2-daily-records`: plain message and Retry (`LoadError`); error state not rendered in the browser run |
| Public home page | Mobile and desktop | Invented statistics, staff, testimonials and offers (A07) | HomePage.jsx:62-99, 218 | High | Remove in Phase 4 | Open |
| Owner usability review | Phone | Not run | None | Unknown | Run after Phase 2 | NOT TESTED |
| Rendered screens | 390px and 1280px | Phase 2 owner journey captured end to end | Headless Chromium screenshots, 10 Oct 2026 (agent scratchpad) | Unknown | Keep capturing per phase | PASS for the Phase 2 journey; other screens NOT TESTED |
| Phone sidebar opened by itself | 390px | Every route change toggled the off-canvas sidebar, so in-page links and the new bottom bar opened it over the page and blocked taps | Browser run, 10 Oct 2026 | High | Close on navigation only | Fixed (`LeftSideBarToggle.jsx`) and re-run PASS |
| Ledger rows on phones | 390px | Entry text squeezed into a narrow column beside the action buttons | Screenshot, 10 Oct 2026 | Low | Wrap actions below the text | Fixed and re-checked |
| Job tabs on phones | 390px | Tab strip scrolls sideways; later tabs are off screen | Screenshot, 10 Oct 2026 | Low | Keep the active tab scrolled into view | Fixed; owner review still needed |
| Quote card after acceptance | 1280px | Card briefly hidden while the quote reloads | Screenshot, 10 Oct 2026 | Low | Keep the card while reloading | Fixed |
| Today | 390px and 1280px | Blocks with work first, counts, one-tap rows, one next step when empty, no charts | Screenshots, 10 Oct 2026 | None | Owner to confirm block order | Built; owner review NOT TESTED |

Check comprehension, hierarchy, navigation, calls to action, forms, feedback, error recovery, trust, overflow, touch behaviour and the next step.
