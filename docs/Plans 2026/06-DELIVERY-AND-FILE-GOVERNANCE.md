# Delivery roadmap and file governance

## Working contract

This plan changes priorities, not implementation. No application code, existing rules, memories, deployment settings or schemas have been modified. Approving this plan should authorise a clearly scoped next task, not blanket production changes. Migration, publishing, merge and deletion remain explicit later actions.

Keep React/Vite JavaScript, Bootstrap and PHP/MySQL. Reuse existing helpers, client/job records and public CMS feeds. Do not convert to TypeScript/Laravel merely because older plans mention them. No new folder hierarchy is needed for each feature or audit.

## Delivery in dependency order

| Phase | Work / owner inputs | Completion evidence |
|---|---|---|
| 0: Agree the product | Already decided 10 October 2026: men's scope, Herit amber accent on a Tesla-style layout, removal of invented team, statistics, testimonials and offers. Still to confirm: exact men's garment range, public details, hours/location, capacity, payment/change terms and whether any retail stays. | One approved scope and decision table; every public claim either owner-confirmed or removed. |
| 1: Establish a safe baseline | Staging API and synthetic data (A01). Lint config covering JS/JSX (A13). Deploy waits for CI and both use one Node version (A14). Release manifest covering all endpoints in use (A02). Customer login throttle, generic errors and non-guessable reference (A03, A06). Remove production localhost CORS (A15). Blog update fix and HTML sanitising (A04, A21). Payment write in a transaction (A05). Backups and rollback route. | Local/staging writes isolated; lint reports real files; restore verified; key access/content tests pass. |
| 2: Connect daily records | Today, enquiry conversion, one Clients area, dated measurements, job snapshots, quotes, payment ledger, production history and delivery. | Owner completes a synthetic job from enquiry to handover with consistent records and recovery from errors. |
| 3: Appointments and client access | Persistent availability, slot conflict checks, cancellation/reschedule, contact verification, private messages, controlled update requests and feedback. | Two-device slot test; customer/company isolation; expired access; customer change does not silently change work. |
| 4: Website and shared CMS | Tesla-based tokens, real imagery, service/portfolio pages, true business details, verified links, sanitised publication, SEO and responsive checks. | Owner approves screenshots; publish/unpublish works; enquiry/booking usable on phone; no fabricated proof. |
| 5: Company-order pilot | Parent job/member list only where needed, sample approval, company quote/PO field, partial handover and wearer privacy. | One small agreed company/coordinated job scenario completed end to end; no capacity overpromise. |
| 6: Release and promotion | Approved staging sign-off, production manifest, backup, deploy/rollback, smoke checks, limited real pilot, final social drafts and verified accounts. | Release gate passes; real pilot reviewed; external publication individually authorised. |
| 7: Learn and simplify | Review friction, failed saves/reminders, enquiry conversion, overdue jobs and unused sections. Add only requested helpful features. | Remove confirmed unused runtime surface safely; no feature added without a repeated need. |

Suggested local batches: baseline checks; access/content safety; ledger integrity; enquiry/client/job flow; measurements; appointments; customer portal; design tokens/navigation; public services/portfolio; CMS settings; company workflow; release proof. Each batch has its own acceptance criteria and rollback. No automatic main push during development.

Do not give a launch date based on file counts. First reproduce the critical workflows in staging and measure their gaps. The roadmap is ordered by dependency rather than speculative calendar estimates. Public service copy and photo preparation can proceed while records are made safe, without exposing unready booking/payment controls.

## Owner usability review

Try these tasks on a phone without instruction: find today's fitting; add a walk-in client; reuse approved measurements; see which job is due tomorrow; record a verified payment; send a reply; mark collection; correct a mistaken entry. Proposed goals: routine status/payment actions within a minute, new enquiry/client within two minutes, and no repeated contact entry. These are acceptance targets to test, not guaranteed outcomes.

Watch where the owner hesitates. Simplify labels and screens before adding help text or training. Key actions must have immediate saving/saved feedback. Form failure retains entered values. Empty screens show one next step. Cross-device support means practical phone/tablet/laptop coverage, not an untested promise of every device.

## Release decision

GO only when there is evidence for all core gates: safe environment, owner access/recovery, customer isolation, persistent conflict-safe appointments, measurement snapshots, payment integrity, truthful website, accessible mobile forms, private-file protection, tested backup restoration, release manifest and rollback. Zero unresolved P0 findings. Optional deferred retail/marketing features need not pass if absent from public navigation and disabled safely.

Pilot with the owner and a small number of consenting customers first. Check that communications, confirmations and delivery records reflect actual business practice. Company orders start within confirmed capacity, with an agreed sample/quote and attainable dates. Increase volume only after the pilot demonstrates reliable service.

If a gate fails, disable the affected public action and keep a truthful enquiry channel rather than advertising working bookings/payments. Do not mark the entire project “production-ready” because npm run build succeeds.

## Worktree and branch audit

At inspection, git worktree list --porcelain reported one worktree: /Users/mrgee/WebstormProjects/heritage_com, branch main, HEAD d91951c7292316a5e9b18f04999ef5307a494b03. The only local branch is main; cached remote-tracking branch is origin/main. Initial tracked working tree was clean. The new plan folder is the only untracked task output.

Latest commit is “chore: save 8 October 2026 audit, polish and follow-up changes (#5)”. Therefore the historical fix/mac-lint-fake-backend branch is not a current local branch or worktree here. No local merge or worktree deletion candidate was found. Cached tracking state is not a live GitHub review; no fetch/pull, remote PR check or branch mutation was performed. Do not infer that all remote branches or another computer's checkout are clean.

Later approved cleanup: enumerate exact candidate branch/worktree, inspect dirty and ignored work, compare commits to the accepted base and confirm no unique work. Remove only a reviewed target. Preserve env files and secrets on their owning machine. Do not create extra worktrees by default; one isolated feature branch/worktree only when needed for safe concurrency.

## Folder audit and direction

| Current location | Purpose | Proposed handling |
|---|---|---|
| src/app/(admin), src/app/(public), src/app/(other) | App/public/auth/error features | Keep established structure. Consolidate duplicate runtime routes before considering file moves. |
| src/assets | Styles, fonts, logos and imagery | Keep assets; align tokens and audit unused kit assets by imports/build evidence. |
| src/components/hooks/context/helpers/routes/layout/utils/types | Shared implementation | Keep only real shared concerns; no speculative domain framework. Empty/misnamed types do not require a language rewrite. |
| php-api | API source and SQL history | Keep endpoint/schema files; do not move executable SQL to docs just for aesthetics. |
| php-api/tests | Existing focused CLI helper tests | Keep; wire into future CI. Technical docs can move to docs. |
| public | Static icons, manifest, robots, service worker | Keep web assets here; audit install/offline claims separately. |
| .github/workflows | CI/deployment automation | Keep machine-readable automation in place; future procedure docs in docs. |
| .agent | CURRENT-TASK.md, MCP-PROFILE.yml, PROJECT.yml (verified) | Preserve tooling-required paths; short pointers to permanent docs. |
| .claude (launch.json, rules/, settings.local.json; verified) | Tool-specific entry rule and local settings | Keep a thin adapter only if required; no duplicate product facts. settings.local.json stays local. |
| docs | Product/design/architecture/runbooks | All substantive human documentation flat here after approval. |
| docs/Plans 2026 | Temporary proposal package | Keep until accepted decisions migrated and verified; then explicitly approved removal. |
| Root AGENTS.md, README.md, CLAUDE.md, CODEX.md | Tool/repository entry points | Retain only required short entry points linking to docs. Product detail belongs in docs. |
| Root DESIGN-SYSTEM.md | Current design contract | Migrate approved replacement into docs/DESIGN.md and update every pointer before retiring old file. |
| Root HeritOS.html (39,721 bytes) and docs/HeritOS.html (29,658 bytes) | Two product spec artefacts; verified different content | Compare unique content; migrate accepted requirements; retire duplicates only after approval. Neither is active launch authority. |
| docs/brief.json | Older brand/product brief | Migrate useful approved facts to product/design docs. Keep JSON only if an actual consumer exists. |
| docs/features.md/nav-map.md/seo-analytics.md | Old broad product plans | Replace with approved scopes/maps in permanent docs; verify no lost requirement/redirect. |
| node_modules, dist | Dependencies/generated build | Ignored, regenerable. Do not move to docs or treat as source. |
| .idea, .DS_Store | Local IDE/OS state | Ignore; no business-document role. No deletion during planning. |
| .git | Repository metadata | Preserve; never hand-clean objects/worktree metadata. |
| package files, Vite/ESLint/TS configs, index.html | Build inputs | Stay at tool-required paths. Revisit obsolete TS configuration only with dependency/check evidence. |

“All markdown in docs” should mean all substantive documentation. AGENTS.md, root README.md and .agent/CURRENT-TASK.md have discovery roles and should remain short entry points. Moving those blindly would break the routing the owner also wants preserved. Tool-required exceptions are explicit and small, not a reason to spread duplicate plans around the repository.

## Proposed permanent documentation, flat under docs

- README.md: index and approved source map.
- PRODUCT.md: confirmed business scope, services, user journeys, terms and feature priorities.
- DESIGN.md: shared tokens, components, motion, responsiveness and content rules.
- ARCHITECTURE.md: current runtime, routes, API resources, data ownership and integration boundaries.
- OPERATIONS.md: setup, staging, schemas, CI, release, rollback, backup, restore and incident response.
- CONTENT-AND-SOCIAL.md: approved public copy, CMS publication, profiles and reusable content process.
- ROADMAP.md: remaining ordered work, acceptance criteria and verified status.

Keep privacy/legal documents in this flat folder only if maintained as business source content and consumed appropriately; do not create separate docs/audits, docs/plans, docs/design and docs/security trees. Temporary plans are the single permitted subfolder. Long-term test evidence can be concise linked records within OPERATIONS/ROADMAP or CI artefacts, not another permanent report folder.

## Post-approval instruction and memory migration

1. Record decisions accepted/rejected/deferred, including design deviations and actual deposit/change terms.
2. Create/update permanent docs using only accepted material. Map every useful old requirement to its new home or explicit deferral.
3. Trim AGENTS/CLAUDE/CODEX/adapters to routing and safety. One source for product facts; one for architecture; one for design; current scope only in the task contract.
4. Update .agent/PROJECT.yml and CURRENT-TASK.md for the next approved phase. The old migration exclusions and audit scope are historical; do not leave them contradicting the current approved task.
5. Review local hooks and rules for worktree, secret, commit and output protection using non-secret configuration only. Existing availability does not prove Codex uses Claude's hooks. Honour required controls directly where not mirrored.
6. Update the README links, docs index, HTML/JSON references, schema/deploy descriptions and tests/check commands. Replace false lint/test/completeness claims with evidence.
7. Search all active files for superseded stack, design, route and launch instructions. Check conflicts, broken links and ignored targets. Do not overwrite global machine memories with project history.
8. Compare plan requirements against permanent docs before removal. Put remaining actions in ROADMAP. Preserve accepted profile copy and the customised design guide.
9. Present the exact redundant files and temporary folder for deletion approval. After authorised removal, rerun link/instruction checks and record the final source map. Git history retains the rationale; the working tree retains one active truth.

This migration occurs after plan approval and before feature implementation rules are treated as binding. It should not become a broad GEE OS rewrite or an excuse to reorganise functioning source code.

## Remaining owner decisions

Confirm: exact men's garment range; business/public address and safe appointment location; hours/durations/buffers; realistic weekly job capacity; fabric supply options; fitting/change allowance; quote expiry/deposit policy; pickup/delivery area and charges; payment methods; company quantity/sample terms; real imagery/review permissions; sustainable Journal/Community cadence. Brand, name, location, men's-only scope, amber accent and removal of invented website claims are already confirmed (10 October 2026) and do not need asking again.
