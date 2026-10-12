# Apple-inspired Herit design implementation

Date: 12 October 2026. Owner-selected reference: [GetDesign Apple analysis](https://getdesign.md/apple/design-md). Local implementation only; no production deployment.

## Outcome and scope

The shared palette, public UI kit and CMS shell now follow the Apple-inspired Herit adaptation in [DESIGN-SYSTEM.md](../docs/DESIGN-SYSTEM.md#2026-direction-quiet-confidence), D-026. The home slider is replaced by one editorial headline and one CMS image, falling back to published work and then to a text-only layout. Public actions use pills; image cards use 18px radii, CMS controls 8px and CMS cards 12px. The public footer uses the quiet alternate surface. CMS navigation, topbar, forms, tables and status badges share the tokens. The sidebar has a legible live-text HeritOS lockup.

Website hub summaries come from actual CMS list responses. They count content slots, published items and items with drafts, with fixed page keys included in slots. The new View website action opens the public home. Existing API contracts, roles, editing and publishing safeguards remain unchanged. No dependency was added. Earlier uncommitted Phase 4 work was preserved around the visual adaptation.

## Verification

- PASS: `npm run build`.
- PASS: `npm run lint`, 0 errors. 85 existing warnings remain. The included token guard passes for 5 stylesheets and 57 public scripts.
- PASS: PHP helper suite, 323 checks. No PHP files changed.
- PASS: local browser layout at 320, 390, 768, 1024 and 1440px for Home and Website hub, without page overflow.
- PASS: Website list, Home editor, business details, image library and Today at 390 and 1440px.
- PASS: one hero message, menu open and Escape/focus return, reduced-motion entrance disabled, and text-only hero with an intercepted empty CMS home response at 320px. The empty response check is a browser fixture, not an empty database deployment.
- PASS: saving the unchanged synthetic Home draft does not alter the public headline; the saved draft renders in preview; publishing it succeeds and retains the original public headline and introduction.
- PASS: unexpected browser console errors and runtime exceptions absent in the checked routes.
- PARTIAL: an existing React Helmet `UNSAFE_componentWillMount` strict-mode warning appears on CMS routes. `src/components/PageTitle.jsx` still uses the existing `react-helmet` dependency. Tracked as K-07; not fixed by this styling task.
- PASS: the CMS theme toggle renders the dark Website hub with workspace `#262320`, sidebar `#1C1A17` and selected navigation `#2B2112`. Light selected navigation is `#FFF1D6`; widths 320, 390 and 1440 have no horizontal overflow. Screenshots were captured after theme transitions settled.
- PARTIAL: other dark screens and full rendered contrast were not audited.
- NOT TESTED: screen readers, physical phones, all staff roles, 200% zoom, real garment photography and production. This is not an accessibility certification or release decision.
- NOT APPLICABLE: fresh schema imports and backend API end-to-end suites for this frontend-only change. Their scripts assume plain staging data; current staging contains the pre-existing demo dataset. The actual CMS save/preview/publish journey was exercised in the browser instead.

Detailed run: [browser results](design-2026/apple-browser-results.json). A temporary synthetic-admin token was created for each run and revoked at the end. No credentials were saved in these artefacts. Publishing in the check affected local staging only and restored the unchanged public Home content.

## Screenshots

These are actual local browser screenshots with pre-existing, labelled demo illustrations and synthetic content, not production photographs.

- [Home desktop](design-2026/apple-home-1440.png) and [Home phone](design-2026/apple-home-390.png).
- [Website CMS desktop](design-2026/apple-cms-1440.png) and [Website CMS phone](design-2026/apple-cms-390.png).
- [Home editor with saved-draft preview](design-2026/apple-cms-editor-1440.png).
- [Dark CMS hub](design-2026/apple-cms-dark-1440.png).

The first browser check exposed a 3px topbar overflow at 320px. Corrected with flexible title space, ellipsis for long titles and compact 44px account controls; rerun passed. Screenshots scroll the public page first to load lazy images and complete once-only reveals before capture.

## Next action

Owner reviews [local website](http://127.0.0.1:5112/) and [local CMS](http://127.0.0.1:5112/website). Replace demo imagery and copy through the CMS with real publishable material before production. No push, merge or deployment was performed for this task.

## Earlier guideline-only deliverable

The record below describes the initial concept before the owner selected Apple. The implementation evidence above supersedes its statement that runtime styling is unchanged.


Date: 12 October 2026. Scope: replacement design guideline and illustrative image for the website and CMS. No runtime styling was changed by this task.

## Deliverables

- [Canonical guideline](../docs/DESIGN-SYSTEM.md#2026-direction-quiet-confidence), with colour roles, type sizes, spacing, cards, borders, component states, landing and CMS layouts, responsive rules and implementation acceptance.
- [Concept image](design-2026/herit-website-cms-concept.png), generated using the built-in image generation tool, inspected visually and copied into the project. It shows the website, CMS, component strip and phone concepts together.

## Evidence

Source inspection: `src/assets/tokens/_tokens-map.scss`, `tokens.scss`, public `Hero.jsx` and Website hub `page.jsx`. Current implementation uses the earlier palette, 4px controls and the D-025 slider. The new proposal deliberately remains separate from the as-built record.

Current design research: [Linear's March 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh), used for predictable action placement and calm navigation, and [web.dev responsive accessibility guidance](https://web.dev/articles/accessible-responsive-design), used for reflow and readable controls. These are sources of principles, not a copied visual specification.

### Calculated target contrast

PASS: the following pairs were calculated using sRGB relative luminance and `(lighter + 0.05) / (darker + 0.05)`. Text requires 4.5:1 here; control boundaries require 3:1. This proves these colour pairs only, not rendered accessibility.

| Pair | Foreground / background | Ratio | Result |
|---|---|---|---|
| Primary on white | `#20221F` / `#FFFFFF` | 16.03:1 | PASS, text |
| Body on canvas | `#41453E` / `#F7F7F2` | 9.11:1 | PASS, text |
| Muted on canvas | `#61655E` / `#F7F7F2` | 5.53:1 | PASS, text |
| Primary on amber | `#20221F` / `#F59E0B` | 7.46:1 | PASS, text |
| Primary on amber hover | `#20221F` / `#D97706` | 5.03:1 | PASS, text |
| Accent text on canvas | `#995108` / `#F7F7F2` | 5.53:1 | PASS, text |
| Control border on white | `#858A80` / `#FFFFFF` | 3.53:1 | PASS, boundary |
| Control border on canvas | `#858A80` / `#F7F7F2` | 3.29:1 | PASS, boundary |
| Success | `#246342` / `#EDF6EF` | 6.48:1 | PASS, text |
| Warning | `#854D0E` / `#FFF4DC` | 6.27:1 | PASS, text |
| Danger | `#A12B2B` / `#FFF0EE` | 6.54:1 | PASS, text |
| Neutral status | `#61655E` / `#F0F1EC` | 5.24:1 | PASS, text |

Documentation check: PASS, `node scripts/check-docs.mjs` (47 Markdown files, 453 text files scanned).

## Visual inspection

PASS: the generated sample contains a legible compact website header, split editorial hero with African menswear, service cards and compact footer; the CMS has a light sidebar, summary tiles, content table, status labels and details panels. The palette and hierarchy convey the intended direction.

PARTIAL: generated lettering and font rendering are illustrative. Public body and some footer text in the image do not exactly follow the specified Inter rules. Contact information, dates, record counts, service copy and photography are fictional. The CMS phone sketch includes bottom navigation, while the guideline preserves the current drawer. The image is a visual reference, not a product specification or production content. The guideline resolves these differences explicitly.

NOT TESTED: responsive runtime behaviour, CMS save/preview/publish flows under this new design, screen readers, keyboard interaction, real photography and the proposed palette in dark mode. No frontend or backend code was modified for this task, so runtime tests and a build were NOT APPLICABLE to this documentation/image deliverable.

## Image generation brief

Built-in image generation, new image, opaque background. Produce a landscape, front-facing 2026 concept board for Herit Clothing and its HeritOS CMS, with two desktop screens and small phone previews. Use warm ivory `#F7F7F2`, white panels, charcoal `#20221F`, muted olive-grey `#61655E`, borders `#E1E3DC`, amber `#F59E0B` with charcoal button labels. Pair Inter UI and body with Source Serif 4 public headings. Show “Made to fit. Made for you.”, “Men’s tailoring in Lagos.”, “Request a fitting” and “Explore our work”, alongside illustrative African menswear photography, service cards and a compact footer. Show Website CMS navigation, real-world content editing patterns, illustrative counts, a content table, labelled Published and Draft statuses, details and recent changes. Include palette swatches, typography and control examples. Use purposeful 8px spacing rhythm, 24px card padding, 44 to 48px controls, 8px control radius, 12px CMS cards and 16px public cards. Avoid glass, glows, gratuitous gradients, random charts and perspective device renders. Label the board “PROPOSED DIRECTION / DEMO CONTENT”.

## Next action

Review the concept, then implement shared tokens and controls, CMS surfaces, and website surfaces in separate coherent batches. Keep current business rules and role gates. Verify observable behaviour against the guideline before claiming the new design is implemented.
