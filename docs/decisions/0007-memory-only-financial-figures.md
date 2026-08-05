# ADR 0007: Financial figures live in browser memory only

**Status:** Accepted (owner decision, 2026-08-05). **Date:** 2026-08-05.

## Context

ADR 0006 means UC claimants type in net monthly earnings and their current award. Phase 1 persistence is localStorage, and plaintext household earnings on a shared family computer is a different GDPR posture than nursery prices.

## Decision

The money fields on the UC claimant branch are never transmitted (the whole engine is client-side pure TypeScript) and never persisted, not even to localStorage. The rest of the profile persists; the two figures are re-asked after a reload, with the previous projection summary retained.

## Consequences

A small re-entry annoyance for UC users buys the cleanest possible retention story: the sensitive figures exist only in a running tab. The web task's tests must prove the figures are absent from localStorage, not just assume it.
