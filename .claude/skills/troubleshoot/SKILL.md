---
name: troubleshoot
description: Root-cause protocol for any failing test, build, CI run, or unexpected behaviour where the fix is not already obvious. Stops symptom-patching and retry loops.
---

# /troubleshoot — STOP, then think

## Protocol

1. **STOP.** No edits, no re-runs "to see if it happens again".
2. **Observe.** Capture the exact error, the smallest reproduction, and what changed since it last worked (`git diff`, recent commits).
3. **Hypothesise.** Write at least two plausible causes. One hypothesis is a guess wearing a lab coat.
4. **Investigate cheapest-first.** Pick the check that discriminates between hypotheses at the lowest cost (a grep beats a test run beats a rebuild). Run it. Eliminate.
5. **Root cause.** State it in one sentence. If you cannot, return to 3.
6. **Fix the cause**, not the symptom.
7. **Verify.** The original reproduction passes AND `pnpm validate` is green.
8. **Learn.** If the bug was meaningful (shipped, subtle, or systemic), one build-log line: what, why, prevention.

## Banned moves

- Retry loops: "attempt 1... attempt 2... attempt 3" is observation-free hoping.
- Timeout inflation: "it timed out, increase the wait" treats time as the cause.
- Weakening a coverage threshold to pass.
- Disabling or downgrading a lint rule to pass.
- Deleting or skipping a failing test.
- "Fixed it but not sure why" — that is step 5 unfinished.

## Output format

```
Error: <exact message>
Expected: <what should happen>
Cause: <one sentence, root>
Fix: <what changed and where>
Prevention: <test/lint/hook now guarding it, or "none needed because ...">
```
