# HeritOS documentation

Documentation follows the GEE OS Full Product hierarchy (GEE OS 0.10.1). Each fact has one home; other files link to it. The approved plan of record stays in [Plans 2026/](Plans%202026/READ-ME-FIRST.md); live status and later decisions are in [ROADMAP.md](08-change-management/ROADMAP.md) and [DECISIONS.md](08-change-management/DECISIONS.md), which win where they differ (D-012).

## Index

| Folder | File | Owns |
|---|---|---|
| 00-foundation | [PROJECT-CONTEXT.md](00-foundation/PROJECT-CONTEXT.md) | Problem, confirmed business, boundaries, fact register, external references |
| 01-product | [PRODUCT-SPEC.md](01-product/PRODUCT-SPEC.md) | Promise, first-release proof, scope and priorities, requirements, services to confirm, fate of each existing area, open owner decisions |
| | [BUSINESS-RULES.md](01-product/BUSINESS-RULES.md) | Canonical terms and rules BR-01 to BR-36 |
| | [USER-JOURNEYS.md](01-product/USER-JOURNEYS.md) | Journeys J-01 to J-08 with acceptance |
| | [USER-ROLES.md](01-product/USER-ROLES.md) | Who uses HeritOS and why |
| | [CONTENT.md](01-product/CONTENT.md) | Website positioning, claims removed, site architecture, company hook, copy and photography rules, SEO, performance, analytics |
| | [SOCIAL.md](01-product/SOCIAL.md) | Social profile drafts, visual kit, publishing rhythm, moderation, setup acceptance |
| 02-architecture | [ARCHITECTURE.md](02-architecture/ARCHITECTURE.md) | Runtime, decision, endpoint pattern, routes, CMS projection, repository layout |
| | [API-SPEC.md](02-architecture/API-SPEC.md) | Endpoint inventory, server role gates, deploy route, lookups |
| | [DATA-MODEL.md](02-architecture/DATA-MODEL.md) | Tables and schemas, codes and references, target record model |
| | [INTEGRATIONS.md](02-architecture/INTEGRATIONS.md) | External services and their boundaries |
| 03-design | [DESIGN-SYSTEM.md](03-design/DESIGN-SYSTEM.md) | Tokens, contrast, type, spacing, motion, Tesla reference and deviations |
| | [UX-SPEC.md](03-design/UX-SPEC.md) | Navigation, screens, required states, forms |
| | [ACCESSIBILITY.md](03-design/ACCESSIBILITY.md) | Target, focus, touch targets, reduced motion, test widths |
| 04-pwa | [PWA-SPEC.md](04-pwa/PWA-SPEC.md) | Manifest and service worker today |
| | [OFFLINE-SPEC.md](04-pwa/OFFLINE-SPEC.md) | Offline behaviour; writes blocked offline |
| | [SYNC-SPEC.md](04-pwa/SYNC-SPEC.md) | N/A: no background sync (D-016) |
| | [UPDATE-STRATEGY.md](04-pwa/UPDATE-STRATEGY.md) | Cache versioning and update path |
| 05-security | [SECURITY.md](05-security/SECURITY.md) | Threats, controls, private files and content safety |
| | [AUTH-MODEL.md](05-security/AUTH-MODEL.md) | Staff and customer sign-in, target customer access, session hardening |
| | [PERMISSIONS.md](05-security/PERMISSIONS.md) | Resource-by-role rules; client and server enforcement |
| | [DATA-PRIVACY.md](05-security/DATA-PRIVACY.md) | Nigeria privacy position, data categories, retention, rights, AI |
| 06-quality | [TEST-STRATEGY.md](06-quality/TEST-STRATEGY.md) | Commands and results, coverage plan, baseline audit record |
| 07-operations | [DEPLOYMENT.md](07-operations/DEPLOYMENT.md) | Hosting, environments, CI and deploy, server config, schema import, branches, release, rollback, troubleshooting |
| | [LOCAL-STAGING.md](07-operations/LOCAL-STAGING.md) | Local setup and local staging |
| | [BACKUP-RECOVERY.md](07-operations/BACKUP-RECOVERY.md) | Backup targets, restore, runbook list |
| | [MONITORING.md](07-operations/MONITORING.md) | Logs, uptime, review rhythm |
| | [EMAIL-SPEC.md](07-operations/EMAIL-SPEC.md) | Sending and reading email |
| | [NOTIFICATIONS-SPEC.md](07-operations/NOTIFICATIONS-SPEC.md) | Current WhatsApp sends and planned job templates |
| 08-change-management | [DECISIONS.md](08-change-management/DECISIONS.md) | Dated decisions D-001 to D-019; removed files |
| | [ROADMAP.md](08-change-management/ROADMAP.md) | Phases, findings A01 to A24 with status, deletion candidates |
| 09-release | [LAUNCH-CHECKLIST.md](09-release/LAUNCH-CHECKLIST.md) | Launch verification matrix and checklist |
| | [PRODUCTION-CHECK.md](09-release/PRODUCTION-CHECK.md) | Production checks around a release |
| | [RELEASE-REPORT.md](09-release/RELEASE-REPORT.md) | Release decision and criteria |
| Plans 2026 | [READ-ME-FIRST.md](Plans%202026/READ-ME-FIRST.md) and seven numbered files | Approved plan of record (read-only reference) |

Outside `docs/`:

| File | Role |
|---|---|
| [../qa/](../qa/) | Audit evidence: functional, security, accessibility, performance, regression, UX, PWA |
| [../CHANGELOG.md](../CHANGELOG.md) | Notable changes |
| [../KNOWN-ISSUES.md](../KNOWN-ISSUES.md) | Open findings and issues |
| [../AGENTS.md](../AGENTS.md), [../CLAUDE.md](../CLAUDE.md), [../CODEX.md](../CODEX.md) | Agent entry points |
| [../README.md](../README.md) | Repository front page |
| [../.agent/PROJECT.yml](../.agent/PROJECT.yml), [../.agent/CURRENT-TASK.md](../.agent/CURRENT-TASK.md), [../.agent/MCP-PROFILE.yml](../.agent/MCP-PROFILE.yml) | GEE OS routing, current task, integration authority |
| [../php-api/README.md](../php-api/README.md) | Server file notes |
| [../scripts/staging/](../scripts/staging/) | Local staging scripts ([LOCAL-STAGING.md](07-operations/LOCAL-STAGING.md)) |
| Source code | The evidence of what is built. Documentation is checked against it. |

## Confidence labels

Statements carry one of four labels: **Verified** (checked in the repository, file and line cited), **Owner-confirmed** (stated by the owner, with the date), **Proposed** (agreed direction whose exact detail still needs the owner or a test), **Unknown** (needs the owner, the live server or a test). Runtime claims use PASS, FAIL, PARTIAL, NOT APPLICABLE, NOT TESTED or BLOCKED.

## Sections marked N/A

| File | Reason |
|---|---|
| [04-pwa/SYNC-SPEC.md](04-pwa/SYNC-SPEC.md) | No offline queue or background sync; the approved plan keeps the PWA an offline shell and blocks writes offline (D-016) |

Every other template section is filled; where a fact is not yet known it says Unknown or NOT TESTED rather than N/A.

## Source map

Where each section of the former flat files now lives (moved 10 October 2026, D-012).

| Old file and section | New home |
|---|---|
| README.md: file table, confidence labels | This file |
| README.md: superseded and deleted files | [DECISIONS.md](08-change-management/DECISIONS.md#files-removed-by-decision) |
| README.md: external references | [PROJECT-CONTEXT.md](00-foundation/PROJECT-CONTEXT.md#external-references) |
| GEE-OS.md: adoption note and source map | [DECISIONS.md](08-change-management/DECISIONS.md) D-019; this file |
| PRODUCT.md: intro, confirmed business, product boundary | [PROJECT-CONTEXT.md](00-foundation/PROJECT-CONTEXT.md) |
| PRODUCT.md: owner decisions | [DECISIONS.md](08-change-management/DECISIONS.md) D-001 to D-011, D-018 |
| PRODUCT.md: services to confirm, feature priorities, each existing area, remaining owner decisions | [PRODUCT-SPEC.md](01-product/PRODUCT-SPEC.md) |
| PRODUCT.md: daily navigation | [UX-SPEC.md](03-design/UX-SPEC.md#daily-navigation-app) |
| PRODUCT.md: journeys (steps and acceptance) | [USER-JOURNEYS.md](01-product/USER-JOURNEYS.md) |
| PRODUCT.md: journey rules (measurements, appointments, stages, quotes, payments, company, feedback) | [BUSINESS-RULES.md](01-product/BUSINESS-RULES.md) |
| PRODUCT.md: customer access mechanism | [AUTH-MODEL.md](05-security/AUTH-MODEL.md#customers) |
| PRODUCT.md: communication templates | [NOTIFICATIONS-SPEC.md](07-operations/NOTIFICATIONS-SPEC.md) |
| PRODUCT.md: superseded old-plan decisions | [DECISIONS.md](08-change-management/DECISIONS.md) D-017 |
| ARCHITECTURE.md: runtime, endpoint pattern, route inventory, CMS to website links | [ARCHITECTURE.md](02-architecture/ARCHITECTURE.md) |
| ARCHITECTURE.md: authentication and roles; access and session requirements | [AUTH-MODEL.md](05-security/AUTH-MODEL.md), [PERMISSIONS.md](05-security/PERMISSIONS.md), [USER-ROLES.md](01-product/USER-ROLES.md) |
| ARCHITECTURE.md: private files and content safety | [SECURITY.md](05-security/SECURITY.md#private-files-and-content-safety) |
| ARCHITECTURE.md: API inventory | [API-SPEC.md](02-architecture/API-SPEC.md) |
| ARCHITECTURE.md: table inventory, codes and references, data model target | [DATA-MODEL.md](02-architecture/DATA-MODEL.md) |
| ARCHITECTURE.md: integration boundaries | [INTEGRATIONS.md](02-architecture/INTEGRATIONS.md) |
| DESIGN.md: principles, tokens, contrast, themes, typography, spacing, surfaces, motion, Tesla reference, deviations, history | [DESIGN-SYSTEM.md](03-design/DESIGN-SYSTEM.md) |
| DESIGN.md: navigation, forms, status, data, modals | [UX-SPEC.md](03-design/UX-SPEC.md) |
| DESIGN.md: controls (sizes, focus), responsive and accessibility checks, reduced motion | [ACCESSIBILITY.md](03-design/ACCESSIBILITY.md) |
| DESIGN.md: writing in the interface; content and photography | [CONTENT.md](01-product/CONTENT.md) |
| OPERATIONS.md: hosting, CI and deploy, server configuration, database and schema files, branches, environments, release checklist, rollback, troubleshooting | [DEPLOYMENT.md](07-operations/DEPLOYMENT.md) |
| OPERATIONS.md: local setup, local staging | [LOCAL-STAGING.md](07-operations/LOCAL-STAGING.md) |
| OPERATIONS.md: staging smoke-check results | [qa/FUNCTIONAL-AUDIT.md](../qa/FUNCTIONAL-AUDIT.md) |
| OPERATIONS.md: checks table | [TEST-STRATEGY.md](06-quality/TEST-STRATEGY.md) |
| OPERATIONS.md: backup and restore; runbook list | [BACKUP-RECOVERY.md](07-operations/BACKUP-RECOVERY.md) |
| OPERATIONS.md: monitoring and incidents | [MONITORING.md](07-operations/MONITORING.md) |
| OPERATIONS.md: launch verification matrix; post-release checks | [LAUNCH-CHECKLIST.md](09-release/LAUNCH-CHECKLIST.md), [PRODUCTION-CHECK.md](09-release/PRODUCTION-CHECK.md) |
| OPERATIONS.md: privacy and Nigeria notes | [DATA-PRIVACY.md](05-security/DATA-PRIVACY.md) |
| CONTENT-AND-SOCIAL.md: positioning, claims, site architecture, company hook, copy rules, photography, SEO and performance, analytics | [CONTENT.md](01-product/CONTENT.md) |
| CONTENT-AND-SOCIAL.md: social identity, profiles, visual kit, publishing rhythm, conversion and moderation, setup acceptance | [SOCIAL.md](01-product/SOCIAL.md) |
| ROADMAP.md: phases, batches, findings, deletion candidates | [ROADMAP.md](08-change-management/ROADMAP.md) |
| ROADMAP.md: owner usability review | [qa/UX-AUDIT.md](../qa/UX-AUDIT.md) |
| ROADMAP.md: release decision | [RELEASE-REPORT.md](09-release/RELEASE-REPORT.md) |
| ROADMAP.md: baseline evidence | [TEST-STRATEGY.md](06-quality/TEST-STRATEGY.md#baseline-audit-record-10-october-2026) |

## Plans 2026 coverage

Every section of the plan of record has a live home. The plan itself is not edited, apart from the pointer at the top of READ-ME-FIRST.md.

| Plan file: section | Live home |
|---|---|
| READ-ME-FIRST: recommendation | [PROJECT-CONTEXT.md](00-foundation/PROJECT-CONTEXT.md), [PRODUCT-SPEC.md](01-product/PRODUCT-SPEC.md#product-promise) |
| READ-ME-FIRST: confidence labels | This file |
| READ-ME-FIRST: owner decisions; decisions to approve | [DECISIONS.md](08-change-management/DECISIONS.md) D-001 to D-011, D-018 |
| READ-ME-FIRST: evidence in brief | [TEST-STRATEGY.md](06-quality/TEST-STRATEGY.md) |
| 01: baseline and verdict | [ROADMAP.md](08-change-management/ROADMAP.md) |
| 01: findings A01 to A24 | [ROADMAP.md](08-change-management/ROADMAP.md#findings) |
| 01: keep, simplify or defer | [PRODUCT-SPEC.md](01-product/PRODUCT-SPEC.md#what-happens-to-each-existing-area) |
| 01: plan drift | [DECISIONS.md](08-change-management/DECISIONS.md) D-004, D-017 |
| 01: immediate interpretation | [PROJECT-CONTEXT.md](00-foundation/PROJECT-CONTEXT.md#boundaries) |
| 02: product boundary | [PROJECT-CONTEXT.md](00-foundation/PROJECT-CONTEXT.md#boundaries) |
| 02: daily navigation | [UX-SPEC.md](03-design/UX-SPEC.md) |
| 02: enquiry to delivery, clients and measurements, appointments, jobs and company orders, quotes and payments, delivery, communication | [USER-JOURNEYS.md](01-product/USER-JOURNEYS.md), [BUSINESS-RULES.md](01-product/BUSINESS-RULES.md) |
| 02: reference-based customer access | [AUTH-MODEL.md](05-security/AUTH-MODEL.md#customers), [USER-JOURNEYS.md](01-product/USER-JOURNEYS.md#j-07-customer-access) |
| 02: complete practical feature list | [PRODUCT-SPEC.md](01-product/PRODUCT-SPEC.md#scope) |
| 03: positioning, site architecture, company hook, content quality and photography, SEO and performance | [CONTENT.md](01-product/CONTENT.md) |
| 03: service recommendations | [PRODUCT-SPEC.md](01-product/PRODUCT-SPEC.md#services-to-confirm) |
| 03: CMS links and publication | [ARCHITECTURE.md](02-architecture/ARCHITECTURE.md#cms-and-public-projection) |
| 03: shared Tesla-based guide | [DESIGN-SYSTEM.md](03-design/DESIGN-SYSTEM.md), [UX-SPEC.md](03-design/UX-SPEC.md) |
| 03: motion and responsive behaviour | [DESIGN-SYSTEM.md](03-design/DESIGN-SYSTEM.md#motion), [ACCESSIBILITY.md](03-design/ACCESSIBILITY.md) |
| 03: acceptance | [ARCHITECTURE.md](02-architecture/ARCHITECTURE.md#cms-and-public-projection), [LAUNCH-CHECKLIST.md](09-release/LAUNCH-CHECKLIST.md) |
| 04: principles | [DATA-PRIVACY.md](05-security/DATA-PRIVACY.md), [DATA-MODEL.md](02-architecture/DATA-MODEL.md) |
| 04: record model | [DATA-MODEL.md](02-architecture/DATA-MODEL.md#target-record-model) |
| 04: access and session requirements | [AUTH-MODEL.md](05-security/AUTH-MODEL.md), [PERMISSIONS.md](05-security/PERMISSIONS.md) |
| 04: private files and CMS safety | [SECURITY.md](05-security/SECURITY.md#private-files-and-content-safety) |
| 04: Nigeria privacy and operating policies | [DATA-PRIVACY.md](05-security/DATA-PRIVACY.md) |
| 04: environments and deployment | [DEPLOYMENT.md](07-operations/DEPLOYMENT.md) |
| 04: backups and recovery | [BACKUP-RECOVERY.md](07-operations/BACKUP-RECOVERY.md) |
| 04: monitoring | [MONITORING.md](07-operations/MONITORING.md) |
| 04: launch verification matrix | [LAUNCH-CHECKLIST.md](09-release/LAUNCH-CHECKLIST.md) |
| 05: all sections | [SOCIAL.md](01-product/SOCIAL.md) |
| 06: working contract | [DECISIONS.md](08-change-management/DECISIONS.md) D-007, D-011 |
| 06: delivery in dependency order | [ROADMAP.md](08-change-management/ROADMAP.md#phases) |
| 06: owner usability review | [qa/UX-AUDIT.md](../qa/UX-AUDIT.md) |
| 06: release decision | [RELEASE-REPORT.md](09-release/RELEASE-REPORT.md) |
| 06: worktree and branch audit | [DEPLOYMENT.md](07-operations/DEPLOYMENT.md#branches-worktrees-and-machines) |
| 06: folder audit | [ARCHITECTURE.md](02-architecture/ARCHITECTURE.md#repository-layout) |
| 06: proposed flat docs; post-approval migration | Superseded by D-012 ([DECISIONS.md](08-change-management/DECISIONS.md)) |
| 06: remaining owner decisions | [PRODUCT-SPEC.md](01-product/PRODUCT-SPEC.md#remaining-owner-decisions) |
| 07: confirmed owner context; external research | [PROJECT-CONTEXT.md](00-foundation/PROJECT-CONTEXT.md) |
| 07: local coverage; verification record; limits | [TEST-STRATEGY.md](06-quality/TEST-STRATEGY.md) |
| 07: old-plan decisions to retire | [DECISIONS.md](08-change-management/DECISIONS.md) D-017 |
| 07: database table inventory | [DATA-MODEL.md](02-architecture/DATA-MODEL.md#table-inventory) |
| 07: API source inventory | [API-SPEC.md](02-architecture/API-SPEC.md#endpoint-inventory) |
| 07: application page inventory | [ARCHITECTURE.md](02-architecture/ARCHITECTURE.md#route-inventory) (the pre-A18 list stays in the plan file) |
| TESLA-DESIGN-REFERENCE | Kept as reference; adopted values and deviations in [DESIGN-SYSTEM.md](03-design/DESIGN-SYSTEM.md#what-the-tesla-reference-contributes) |
