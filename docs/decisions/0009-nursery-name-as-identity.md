# ADR 0009: The nursery name is the saved-list identity

**Status:** Accepted (owner-delegated implementation decision, 2026-08-07).

## Context

The comparison view (FR4, pulled into Phase 1.5 by the revisit) turned the single saved nursery into a list. The list needs an identity for upsert, delete, the active pointer, and React keys. The choice was a generated id or the nursery's name.

## Decision

The name is the key. A manually entered list of a handful of nurseries does not need id plumbing, and the name is what the user recognises in the switcher bar. The known trade-off, two genuinely different nurseries sharing a name, is handled by refusing the collision at save time with a plain error ("already saved, select it from the bar to edit it") rather than by silent overwrite or hidden ids. Renames pass the previous name so the entry updates in place; a rename that collides with another saved nursery is refused the same way.

## Alternatives rejected

Generated ids: correct in general, but they add plumbing the manual-entry era cannot justify, and they hide the collision instead of surfacing it (two "Busy Bees" entries the user cannot tell apart in the bar is worse than a refusal naming the clash).

## Consequences

Save paths must check `nurseryNameTaken` before writing, and the storage tests pin the refusal behaviour. The layers split deliberately: at the storage level, add-mode save with an existing name stays an upsert (name is identity, and edit-in-place depends on it); storage refuses only a rename onto a different entry, and the form guard is what protects add mode in the UI. The review that forced this ADR found the first cut silently merging colliding entries, which made delete destroy two nurseries at once; the refusal-at-save rule exists because of that bug.

## Revisit trigger

Phase 3 extraction, or any import path where nursery records arrive without a human watching the name field. Machine-created entries need generated ids; this decision covers the manual-entry era only.
