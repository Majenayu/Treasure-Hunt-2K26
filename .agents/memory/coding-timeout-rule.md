---
name: Coding timeout scoring
description: The live event rule for an expired timed Coding mission.
---

An expired timed Coding mission completes automatically and awards 20% of its available points, even when no correct answer was submitted.

**Why:** The event needs a predictable route progression when a team runs out of time, and wrong submissions must never reduce its score.

**How to apply:** Preserve this behavior in server scoring, client timer expiry, and any future automated tests.