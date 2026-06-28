# One Home Roadmap

## Purpose

This roadmap describes the current direction for One Home, Night Shots, Dood ID, Ember, and the arcade library.

The focus is on building real, working pieces in the right order instead of adding complexity before the foundation is stable.

## Current Foundation

The repository now includes:

* The current One Home / Dood Labs application
* Night Shots prototype source
* A self-hosted collection of 13 browser games
* Initial architecture, privacy, and Midnight documentation
* A shared project structure for future development

## Phase 1: Stabilize One Home

Priority: Highest

Goals:

1. Keep the current One Home front door stable.
2. Preserve the working Dood Labs application without rewriting functioning areas.
3. Keep profile, wallet, and identity work protected while other areas are organized.
4. Simplify navigation so visitors understand where they are.
5. Keep One Home feeling like a welcoming place instead of a crowded dashboard.

Key outcomes:

* Clear entry choices for guests, profiles, wallets, and rooms.
* Reliable navigation between One Home, Arcade, and Night Shots.
* Cleaner mobile experience.
* Stable public-facing Ember guide experience.

## Phase 2: Restore Reliable Arcade Play

Priority: Highest

Goals:

1. Make every active game playable from inside Dood Labs.
2. Preserve the option to open each game on its own hosted page.
3. Add clear return navigation from every game.

Required game navigation:

```text
Play Inside Dood Labs
Open Hosted Game Page
Return to Arcade
Return to One Home
```

Key outcomes:

* Games open inside the Game Room without leaving the Dood Labs experience.
* Users can still choose a dedicated hosted game page when preferred.
* Arcade pages show more games at once without feeling overwhelming.
* Featured games and full library views are easier to understand.

## Phase 3: Organize Night Shots for Privacy Review

Priority: High

Goals:

1. Keep Night Shots as the Memory Room inside One Home.
2. Preserve private-by-default memories and journals.
3. Separate source code from personal photos, journals, backups, and live data.
4. Prepare a practical privacy roadmap for Midnight exploration.

Key outcomes:

* Clear Create Memory, Gallery, Journal, and sharing flows.
* Private data remains excluded from public repositories.
* Future privacy milestones are defined around access, sharing, and ownership.
* Night Shots can be reviewed as a focused privacy-centered prototype.

## Phase 4: Connect Identity and Ember

Priority: High

Goals:

1. Continue the one connected identity direction across One Home experiences.
2. Keep Dood ID, profiles, wallets, activity, rooms, and future progress connected.
3. Use Ember to guide people through the experience based on what they have completed.

Identity direction:

```text
One Wallet
  -> One Profile
  -> One Dood ID
  -> One Ember
  -> One Connected Experience
```

Key outcomes:

* Profile and wallet flows remain understandable.
* Users can return to their activity, rooms, games, and memories.
* Ember can provide useful next-step guidance without becoming intrusive.
* Future tickets, badges, and room progress have a clear home.

## Phase 5: Shared Modules

Priority: Medium

Future shared modules may include:

* Identity helpers
* Shared user interface components
* Shared navigation patterns
* Shared event and activity utilities
* Shared privacy permission tools
* Arcade launch and return controls

These should only be extracted after the current working code is stable and the shared behavior is confirmed.

## Phase 6: Midnight Exploration

Priority: Planned

The first Midnight-focused exploration should center on the parts of One Home where privacy matters most.

Potential milestones:

1. Private Night Shots memory ownership.
2. Private journal access controls.
3. Selective sharing without exposing unrelated data.
4. Privacy-aware identity-linked activity.
5. Proof of access, membership, or permissions without unnecessary disclosure.

The goal is practical privacy progress, not adding complexity for its own sake.

## Ongoing Project Rules

* Preserve working features before reorganizing them.
* Do not upload secrets, keys, private photos, journals, or user exports.
* Keep game projects complete and self-hosted.
* Make user navigation clear at every step.
* Build from working prototypes, not promises alone.
* Keep One Home, Night Shots, and the arcade connected under one understandable ecosystem.
