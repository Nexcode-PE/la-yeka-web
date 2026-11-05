# Remediation report

## Executive summary

The repository was reviewed on 2026-11-04. Client and admin production builds passed. The API TypeScript check initially failed because the local Prisma Client had not been generated from the current schema. Regenerating Prisma Client resolved those errors without a schema or data change.

No database migration was applied and no deployment was made as part of this remediation.

## Findings matrix

| Finding | Status | Evidence / action |
| --- | --- | --- |
| Prisma Client and API type safety | Resolved locally | `prisma generate` followed by root TypeScript check passes. Root scripts now require generation before type checks. |
| Zod dependency advisory | Resolved | pnpm override pins Zod to 4.6.7; `pnpm audit --prod --json` reports zero vulnerabilities. |
| JWT stored in browser storage | Blocked | HttpOnly cookie design requires a shared domain or an API proxy for the separately deployed client and admin applications. Existing sessions were not changed without that infrastructure decision. |
| Distributed rate limit | Blocked | Requires a managed shared store/WAF credentials. The existing in-memory limiter remains only as a local fallback. |
| Private Yape vouchers | Blocked | Existing Blob objects are public. A private object store/signed download design and a migration plan for current URLs are required before changing production data. |
| Automated checks / CI | Implemented | GitHub Actions generates Prisma, type-checks, tests, builds both frontends and audits production dependencies. |
| Monolithic modules | Pending | Refactor is intentionally staged to avoid a high-risk rewrite while operational work is in progress. |
| Dashboard aggregation | Pending | Current dashboard aggregates period orders in application memory. |
| Admin refresh polling | Pending | Current 10-second polling is functional but should be replaced by cursor polling or an event service at scale. |
| Order state machine | Implemented | API now accepts only the sequential lifecycle or cancellation, with optimistic concurrent update protection. |
| Double cash opening | Pending migration | Additive PostgreSQL partial unique index was created in a migration but intentionally not applied. API handles unique-conflict responses. |
| Claims/audit pagination | Pending | Current endpoints retain fixed limits. |
| Deprecated business values | Pending decision | Delivery fields and legacy payment enum values require historical-data review before removal. |
| Package manager / versions | In progress | pnpm is formalized, versions are pinned and a redundant npm lockfile is pending removal after final CI verification. |
| Temporary files | Pending review | `fc.js`, `fcart.js` and `fix_cart_tmp.py` have no import references but are not deleted automatically. |

## Verified commands

- `node packages/database/node_modules/prisma/build/index.js generate --config packages/database/prisma.config.ts`
- `node node_modules/typescript/bin/tsc --noEmit --project tsconfig.json`
- `node apps/api/node_modules/tsx/dist/cli.mjs --test apps/api/src/domain/order-state.test.ts`
- client and admin production builds
- `pnpm audit --prod --json` (zero current advisories after the override)

## Deployment plan

1. Review and apply the additive migration using `pnpm db:migrate:deploy` in a maintenance window.
2. Verify exactly one active cash shift can be opened.
3. Configure a shared rate-limit provider and private voucher storage before enabling those remediation items.
4. Run CI on a pull request, then deploy a preview first.
5. Verify login, order creation, payment voucher upload, cash opening and dashboard values after deployment.

## Residual risks

- Browser-stored sessions remain exposed to XSS until the domain/session architecture is changed.
- Public vouchers must not be treated as private until storage is migrated.
- Current polling and memory aggregation need redesign before high-volume operation.
