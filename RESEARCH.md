# Same-City Mate Finder — Notes & Precedents (June 2026)

Idea: a private, friends-only signal of *which city you're in*, with a ping
when two of you overlap. Replaces "find out from an Instagram story the next
day". Explicitly **not** a Life360-style always-on tracker.

---

## 1. Precedents

| App | Model | Takeaway for pintr |
|---|---|---|
| **Life360** | Continuous precise family tracking | Great for "where are my kids", overkill and a bit creepy for mates. Background GPS = battery + permission friction + app-store apps. We don't need any of it for "same city". |
| **Zenly** | Beloved friend-map, precise, playful | Huge with young friend groups — then Snap bought it (2021) and shut it (Feb 2023), leaving a gap. Proved friends *like* a map, but the precise always-on model is expensive to run and privacy-fraught. |
| **Snap Map** | Opt-in location on a social map | "Ghost Mode" is the feature people actually cite — the ability to *vanish* is what makes sharing comfortable. We copy that as a first-class, one-tap thing. |
| **Find My / Google** | Precise, pairwise, utility | Reliable but joyless and precise-only; no "city" abstraction, no group ping. |
| **WhatsApp live location** | 15-min–8-hr precise share in a chat | The real incumbent for "I'm here now". Good enough that pintr must be *dramatically* lighter for the specific job — which is why we go coarse + ambient, not another live-pin. |

## 2. The design insight

For "are we in the same city for a pint", you do **not** need:

- background location (the hard, battery-hungry, permission-heavy part),
- metre-level precision (the creepy part),
- an app-store native app (the slow-to-ship part).

You need a **coarse, opt-in, ambient** presence signal. That collapses the
whole problem to: a city dimension, an append-only check-in ledger, and a
same-city match check — all of which are a comfortable Postgres/RLS problem
(the builder's home turf) rather than a mobile-GPS problem.

City-level also makes privacy the *default*, not a setting: even fully shared,
all anyone learns is "Andy's in London", which is roughly what a WhatsApp
status would say anyway.

## 3. Why "ghost mode" is core, not a toggle in a menu

Every successful friend-location product that survived contact with real users
leans on the ability to disappear (Snap's Ghost Mode is the canonical example).
People share *more* when leaving is one tap. So pintr makes invisibility:

- one tap from the home screen,
- total by default (you vanish, not "last seen 3 days ago"),
- enforced in the database (RLS), so it can't be defeated via the API.

## 4. Scope sanity

This is a < 10-person friends app. The graveyard of social-location startups is
about *cold start at scale* and *monetising cost-avoiders* — neither applies to
a group we can text. Build the smallest thing that produces a real pint, keep it
on free tiers, and only add levers (push, precise share, geofences) when a real
symptom shows up (SPEC §7).
