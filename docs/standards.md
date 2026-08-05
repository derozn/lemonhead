# Codebase standards

The web-side conventions Phase 1 deferred, plus the documentation policy. Engine-side law lives in `docs/ai/rules.md` and CLAUDE.md; this file covers what lint can't fully own. Draft for owner review in the framework PR; amend freely.

## React and JSX

- Function components only; no classes. `'use client'` only where interaction demands it.
- Props that cross the engine boundary use the Zod-inferred types (`FeeSchedule`, `FamilyProfile`, `CostProjection`), never hand-rolled duplicates.
- Component files kebab-case (`nursery-form.tsx`), one exported component per file, colocated `*.test.tsx`.
- Form state pattern: string drafts in state, `safeParse` on submit, schema messages rendered verbatim (they were written to be user-facing).
- Enforced by lint: `eslint-plugin-react-hooks` (recommended) across `apps/web`.

## Accessibility

- Enforced by lint: `eslint-plugin-jsx-a11y` (recommended) across `apps/web`.
- Beyond lint, per feature: every input reachable and operable by keyboard; visible focus; labels always (the wrapping-label pattern in use is fine); a screen-reader pass on any new flow before its phase closes.
- The projection view's expandable detail must be a real button (it is), not a clickable div.

## CSS

- The single global sheet (`globals.css`) stands until the Phase 4 UI build; at that point the decision is CSS Modules per component, with the token block (`--lemon`, `--ink`, etc.) staying global.
- No inline style objects except for genuinely dynamic values.
- New colours join the token block or don't ship.

## Error-message and UI copy

- Plain English, actionable, numbers-first: say what to do ("Enter your award from your UC statement"), not what failed internally.
- No citrus metaphors near money or errors (brand rule, spec §1.3); at most one per surface anywhere else.
- Assumptions and flags are shown honestly ("shown as £0 until a price is added"), never hidden to look polished.
- Figures render through `pounds()`; no ad-hoc formatting.

## ADR versus build-log

- **ADR** (`docs/decisions/`, numbered): the decision constrains future code, reverses or refines a prior ADR, or an interviewer would ask "why did you do it this way".
- **Build-log** (`docs/build-log.md`): events, numbers, bugs found, lessons, rejected approaches.
- Both ride the PR that caused them (the PR guard enforces the build-log half; the reviewer agent checks the ADR half). Never batched at phase close.
