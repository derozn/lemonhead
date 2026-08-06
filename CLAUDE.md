# Lemonhead

UK childcare cost calculator with AI fee-sheet extraction. Portfolio-grade: the eval journey, experiment log, and ADRs are deliverables with the same priority as code.

`docs/spec.md` is the source of truth. `docs/design/phase1-design.md` and `docs/design/phase1-tasks.md` govern the current phase. Decisions live in `docs/decisions/` as numbered ADRs.

The AI-dev framework: `docs/ai/framework.md` (architecture), `docs/ai/rules.md` (tiered rules with detection greps), `docs/ai/routing.md` (which MCP server or external skill owns which work). Project flow skills: `/task` (one task-PR loop), `/plan-gate`, `/verify-rule` (mandatory before encoding any government figure), `/troubleshoot`, `/review`. Agents: reviewer (read-only), policy-analyst (advisory, cited, never computes), engine-dev, web-dev.

## Commands

| Command                         | What it does                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `pnpm validate`                 | Full gate: syncpack, lint, format check, spelling, typecheck, tests + coverage, knip. CI runs exactly this. |
| `pnpm test` / `pnpm test:watch` | Vitest, all packages                                                                                        |
| `pnpm coverage`                 | Tests with the 100% coverage gate on `packages/entitlements`                                                |
| `pnpm typecheck`                | Per-package `tsc --noEmit` plus root config                                                                 |
| `pnpm lint` / `pnpm format`     | ESLint (strict, type-checked) / Prettier                                                                    |

## Packages and boundaries

| Package                 | Rule                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/schemas`      | Zod schemas and inferred types only. Imports nothing from the workspace.                                                                                                              |
| `packages/entitlements` | Pure calculation engine. Imports only `@lemonhead/schemas`. No IO, no clock (`Date.now`/`new Date()` banned), no randomness. Caller supplies `asOfDate`. 100% test coverage enforced. |
| `apps/web` (task 10+)   | Next.js UI. Imports both packages.                                                                                                                                                    |

Boundaries and purity are lint-enforced in `eslint.config.mjs`; do not weaken those rules to make code fit.

## Hard rules

- Zero LLM arithmetic. Every monetary figure comes from `packages/entitlements`.
- Money is integer pence (branded type). Never floats.
- No `any`, no unchecked casts. Types derive from Zod schemas.
- Government rates/thresholds must be verified against gov.uk at encoding time and cited (URL + retrieval date) in the rule params file. Never trust training data for them.
- UC financial figures (`ucDetails`) are memory-only: never persisted, never transmitted.

## Workflow

- One task from `docs/design/phase1-tasks.md` per PR. Conventional commits; scopes are enforced by commitlint (`schemas`, `entitlements`, `web`, `docs`, `ci`, `repo`, `deps`, plus later-phase package names).
- `docs/build-log.md` gets an entry per meaningful event (bugs found, decisions made, numbers) in the same PR as the work; ADRs land in `docs/decisions/` when the decision is made, not at phase close-out. Both feed the final write-up (spec §10).
- Lefthook runs eslint+prettier on staged files at commit, typecheck at push.
- Tests land with the code they test. Show failures honestly.

## Brand (spec §1.3)

Product name "Lemonhead" appears in UI copy and marketing surfaces only; packages keep functional names. One citrus metaphor per surface, maximum. No "lemon = dud" framing near money copy. Trademark gate: nothing launches publicly under the name until clearance.
