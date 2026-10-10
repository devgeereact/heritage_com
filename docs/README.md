# HeritOS documentation

Documentation follows the GEE OS "Standard application" profile: one flat `docs/` folder, root `qa/` for evidence, and `CHANGELOG.md` and `KNOWN-ISSUES.md` at the root. Each fact has one home; other files link to it. The only subfolder is [Plans 2026/](Plans%202026/READ-ME-FIRST.md), the approved plan of record, kept unchanged until the project is finished. Live status and later decisions are in [ROADMAP.md](ROADMAP.md) and [DECISIONS.md](DECISIONS.md), which win where they differ (D-012, D-020).

## Index

| File | Owns |
|---|---|
| [PRODUCT-SPEC.md](PRODUCT-SPEC.md) | Context and confirmed business facts, product promise, scope and priorities, requirements, services to confirm, fate of each existing area, open owner decisions, user roles |
| [BUSINESS-RULES.md](BUSINESS-RULES.md) | Canonical terms and rules BR-01 to BR-36 |
| [USER-JOURNEYS.md](USER-JOURNEYS.md) | Journeys J-01 to J-08 with acceptance |
| [CONTENT.md](CONTENT.md) | Website positioning, claims removed, site architecture, copy and photography rules, SEO, performance targets, analytics |
| [SOCIAL.md](SOCIAL.md) | Social profile drafts, visual kit, publishing rhythm, moderation, setup acceptance |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Runtime, endpoint pattern, routes, CMS projection, repository layout, integrations, PWA, offline and update behaviour |
| [DATA-MODEL.md](DATA-MODEL.md) | Tables and schema files, codes and references, target record model |
| [API-SPEC.md](API-SPEC.md) | Endpoint inventory, server role gates, deploy route per file, action contracts, settings keys |
| [SECURITY.md](SECURITY.md) | Threats and controls, private files and content safety, authentication, permissions |
| [DATA-PRIVACY.md](DATA-PRIVACY.md) | Nigeria privacy position, data categories, retention, rights, AI |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Tokens, contrast, type, spacing, motion, Tesla reference and deviations |
| [UX-SPEC.md](UX-SPEC.md) | Navigation (target and as built), screens, required states, forms |
| [ACCESSIBILITY.md](ACCESSIBILITY.md) | Target, focus, touch targets, reduced motion, test widths |
| [TEST-STRATEGY.md](TEST-STRATEGY.md) | Commands and latest results, coverage plan, baseline audit record |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Hosting, CI and deploy, server config, schema import order, release, rollback, backup and recovery, monitoring, troubleshooting |
| [LOCAL-STAGING.md](LOCAL-STAGING.md) | Local setup, local staging and the end-to-end script |
| [NOTIFICATIONS-SPEC.md](NOTIFICATIONS-SPEC.md) | WhatsApp sends, planned job templates, email |
| [ROADMAP.md](ROADMAP.md) | Phases with status, findings A01 to A24 with status, deletion candidates |
| [DECISIONS.md](DECISIONS.md) | Dated decisions D-001 onwards; files removed by decision |
| [Plans 2026/](Plans%202026/READ-ME-FIRST.md) | Approved plan of record (read-only) |

Outside `docs/`:

| File | Role |
|---|---|
| [../qa/](../qa/) | Evidence: [functional and usability](../qa/FUNCTIONAL-AUDIT.md), [security](../qa/SECURITY-AUDIT.md), [accessibility](../qa/ACCESSIBILITY-AUDIT.md), [performance and PWA](../qa/PERFORMANCE-AUDIT.md), [regression](../qa/REGRESSION-AUDIT.md), and the [launch checklist](../qa/LAUNCH-CHECKLIST.md) with the production check and release decision |
| [../CHANGELOG.md](../CHANGELOG.md) | Notable changes, by pull request |
| [../KNOWN-ISSUES.md](../KNOWN-ISSUES.md) | Open findings and issues |
| [../AGENTS.md](../AGENTS.md), [../CLAUDE.md](../CLAUDE.md), [../CODEX.md](../CODEX.md) | Agent entry points |
| [../.claude/rules/docs-sync.md](../.claude/rules/docs-sync.md) | The rule that keeps these files current |
| [../README.md](../README.md) | Repository front page |
| [../.agent/PROJECT.yml](../.agent/PROJECT.yml), [../.agent/CURRENT-TASK.md](../.agent/CURRENT-TASK.md), [../.agent/MCP-PROFILE.yml](../.agent/MCP-PROFILE.yml) | GEE OS routing, current task, integration authority |
| [../php-api/README.md](../php-api/README.md) | Server file notes |
| [../scripts/staging/](../scripts/staging/) | Local staging scripts ([LOCAL-STAGING.md](LOCAL-STAGING.md)) |
| Source code | The evidence of what is built. Documentation is checked against it. |

## How the docs stay current

Every agent, Claude or Codex, follows [.claude/rules/docs-sync.md](../.claude/rules/docs-sync.md); [AGENTS.md](../AGENTS.md#keep-the-docs-current) carries the short version. In brief:

1. Before starting, read [ROADMAP.md](ROADMAP.md), [../KNOWN-ISSUES.md](../KNOWN-ISSUES.md), the Unreleased part of [../CHANGELOG.md](../CHANGELOG.md) and [../.agent/CURRENT-TASK.md](../.agent/CURRENT-TASK.md), so nothing already done is redone.
2. In the same commit as a change, update the one file that owns the changed fact (the "Owns" column above), add a CHANGELOG line and move the ROADMAP status.
3. `node scripts/check-docs.mjs` runs in CI and fails on broken links or anchors, em dashes in live docs, and mentions of `docs/` or `qa/` paths that do not exist.

## Confidence labels

Statements carry one of four labels: **Verified** (checked in the repository, file and line cited), **Owner-confirmed** (stated by the owner, with the date), **Proposed** (agreed direction whose exact detail still needs the owner or a test), **Unknown** (needs the owner, the live server or a test). Runtime claims use PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED or BLOCKED.

## Not applicable

| Topic | Reason |
|---|---|
| Background sync | The PWA is an offline shell that blocks writes offline; no queue or sync is planned (D-016). Stated once in [ARCHITECTURE.md](ARCHITECTURE.md#pwa-offline-and-updates) |

## Source map

Where each earlier file now lives. The numbered folders `00-foundation` to `09-release` (10 October 2026, D-012) were flattened on 10 October 2026 (D-020); history is in Git.

| Former file | Now |
|---|---|
| 00-foundation/PROJECT-CONTEXT.md | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#context) |
| 01-product/PRODUCT-SPEC.md, BUSINESS-RULES.md, USER-JOURNEYS.md, CONTENT.md, SOCIAL.md | Same names in `docs/` |
| 01-product/USER-ROLES.md | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#user-roles) |
| 02-architecture/ARCHITECTURE.md, API-SPEC.md, DATA-MODEL.md | Same names in `docs/` |
| 02-architecture/INTEGRATIONS.md | [ARCHITECTURE.md](ARCHITECTURE.md#integrations) |
| 03-design/DESIGN-SYSTEM.md, UX-SPEC.md, ACCESSIBILITY.md | Same names in `docs/` |
| 04-pwa/PWA-SPEC.md, OFFLINE-SPEC.md, UPDATE-STRATEGY.md, SYNC-SPEC.md | [ARCHITECTURE.md](ARCHITECTURE.md#pwa-offline-and-updates) |
| 05-security/SECURITY.md, DATA-PRIVACY.md | Same names in `docs/` |
| 05-security/AUTH-MODEL.md, PERMISSIONS.md | [SECURITY.md](SECURITY.md#authentication), [SECURITY.md](SECURITY.md#permissions) |
| 06-quality/TEST-STRATEGY.md | `docs/TEST-STRATEGY.md` |
| 07-operations/DEPLOYMENT.md, LOCAL-STAGING.md, NOTIFICATIONS-SPEC.md | Same names in `docs/` |
| 07-operations/BACKUP-RECOVERY.md, MONITORING.md | [DEPLOYMENT.md](DEPLOYMENT.md#backup-and-recovery), [DEPLOYMENT.md](DEPLOYMENT.md#monitoring) |
| 07-operations/EMAIL-SPEC.md | [NOTIFICATIONS-SPEC.md](NOTIFICATIONS-SPEC.md#email) |
| 08-change-management/ROADMAP.md, DECISIONS.md | Same names in `docs/` |
| 09-release/LAUNCH-CHECKLIST.md, PRODUCTION-CHECK.md, RELEASE-REPORT.md | [qa/LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md) (the profile keeps the launch checklist in `qa/`) |
| qa/UX-AUDIT.md | [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#usability) |
| qa/PWA-AUDIT.md | [qa/PERFORMANCE-AUDIT.md](../qa/PERFORMANCE-AUDIT.md#pwa) |
| Earlier flat files (PRODUCT, ARCHITECTURE, DESIGN, OPERATIONS, CONTENT-AND-SOCIAL, ROADMAP, GEE-OS) | [DECISIONS.md](DECISIONS.md#files-removed-by-decision) |

## Plans 2026 coverage

Every section of the plan of record has a live home. The plan itself is not edited, apart from the pointer at the top of READ-ME-FIRST.md.

| Plan file: section | Live home |
|---|---|
| READ-ME-FIRST: recommendation | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#product-promise) |
| READ-ME-FIRST: confidence labels | This file |
| READ-ME-FIRST: owner decisions; decisions to approve | [DECISIONS.md](DECISIONS.md) D-001 to D-011, D-018 |
| READ-ME-FIRST: evidence in brief | [TEST-STRATEGY.md](TEST-STRATEGY.md) |
| 01: baseline, verdict, findings A01 to A24 | [ROADMAP.md](ROADMAP.md#findings) |
| 01: keep, simplify or defer | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#what-happens-to-each-existing-area) |
| 01: plan drift | [DECISIONS.md](DECISIONS.md) D-004, D-017 |
| 01: immediate interpretation; 02: product boundary | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#boundaries) |
| 02: daily navigation | [UX-SPEC.md](UX-SPEC.md) |
| 02: enquiry to delivery, clients and measurements, appointments, jobs and company orders, quotes and payments, delivery, communication | [USER-JOURNEYS.md](USER-JOURNEYS.md), [BUSINESS-RULES.md](BUSINESS-RULES.md) |
| 02: reference-based customer access | [SECURITY.md](SECURITY.md#customers), [USER-JOURNEYS.md](USER-JOURNEYS.md#j-07-customer-access) |
| 02: complete practical feature list | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#scope) |
| 03: positioning, site architecture, company hook, content quality and photography, SEO and performance | [CONTENT.md](CONTENT.md) |
| 03: service recommendations | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#services-to-confirm) |
| 03: CMS links and publication; acceptance | [ARCHITECTURE.md](ARCHITECTURE.md#cms-and-public-projection) |
| 03: shared Tesla-based guide; motion | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [ACCESSIBILITY.md](ACCESSIBILITY.md) |
| 04: principles and record model | [DATA-MODEL.md](DATA-MODEL.md#target-record-model), [DATA-PRIVACY.md](DATA-PRIVACY.md) |
| 04: access and session requirements | [SECURITY.md](SECURITY.md#authentication) |
| 04: private files and CMS safety | [SECURITY.md](SECURITY.md#private-files-and-content-safety) |
| 04: Nigeria privacy and operating policies | [DATA-PRIVACY.md](DATA-PRIVACY.md) |
| 04: environments, deployment, backups, monitoring | [DEPLOYMENT.md](DEPLOYMENT.md) |
| 04: launch verification matrix | [qa/LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md) |
| 05: all sections | [SOCIAL.md](SOCIAL.md) |
| 06: working contract | [DECISIONS.md](DECISIONS.md) D-007, D-011 |
| 06: delivery in dependency order | [ROADMAP.md](ROADMAP.md#phases) |
| 06: owner usability review | [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md#usability) |
| 06: release decision | [qa/LAUNCH-CHECKLIST.md](../qa/LAUNCH-CHECKLIST.md#release-decision) |
| 06: worktree and branch audit | [DEPLOYMENT.md](DEPLOYMENT.md#branches-worktrees-and-machines) |
| 06: folder audit | [ARCHITECTURE.md](ARCHITECTURE.md#repository-layout) |
| 06: proposed flat docs; post-approval migration | [DECISIONS.md](DECISIONS.md) D-012, D-018, D-020 |
| 06: remaining owner decisions | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#remaining-owner-decisions) |
| 07: confirmed owner context; external research | [PRODUCT-SPEC.md](PRODUCT-SPEC.md#context) |
| 07: local coverage; verification record; limits | [TEST-STRATEGY.md](TEST-STRATEGY.md) |
| 07: old-plan decisions to retire | [DECISIONS.md](DECISIONS.md) D-017 |
| 07: database table inventory | [DATA-MODEL.md](DATA-MODEL.md#table-inventory) |
| 07: API source inventory | [API-SPEC.md](API-SPEC.md#endpoint-inventory) |
| 07: application page inventory | [ARCHITECTURE.md](ARCHITECTURE.md#route-inventory) (the pre-A18 list stays in the plan file) |
| TESLA-DESIGN-REFERENCE | Kept as reference; adopted values and deviations in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md#what-the-tesla-reference-contributes) |
