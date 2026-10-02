# One Home

**One Home** is Dood Labs’ connected ecosystem for identity, creativity, community, games, and personal memory.

Built for the **Midnight Build Club**, this repository brings the current One Home experience, the Night Shots privacy-focused memory project, and a growing collection of self-hosted arcade games into one organized codebase.

## What is One Home?

One Home is designed to feel like a front door instead of a disconnected list of tools.

It connects:

* **Dood Labs** — the builder and ecosystem layer.
* **Dood ID** — a portable identity and profile direction.
* **Ember** — the friendly guide experience inside One Home.
* **Night Shots** — a private memory, journaling, and photo-story project.
* **Rollies Arcade** — a collection of playable browser-based games.
* **Community spaces** — future areas for creators, projects, events, and shared discovery.

The goal is to make digital spaces feel more personal, understandable, and user-owned.

## Why Midnight

Privacy should not be an extra feature added after an app is built.

Night Shots is the privacy-focused part of the One Home vision. It is being organized for a future where personal memories, journals, sharing permissions, and identity-aware experiences can use privacy-preserving technology where it matters most.

Midnight is the right direction for this work because One Home needs a privacy layer that can support meaningful user control without turning personal stories, memories, or activity into public data by default.

## Current Prototype Status

This repository contains active prototype work.

| Area                         | Current Status                               |
| ---------------------------- | -------------------------------------------- |
| One Home / Dood Labs         | Active front-door and ecosystem prototype    |
| Night Shots                  | Active local memory and journaling prototype |
| Dood ID / Identity           | In progress                                  |
| Ember guide system           | In progress                                  |
| Arcade integration           | Active                                       |
| Self-hosted game library     | Active                                       |
| Midnight privacy integration | Planned and under exploration                |

## Repository Structure

```text
One-Home/
├── apps/
│   ├── one-home/        # Current Dood Labs / One Home application
│   └── night-shots/     # Night Shots prototype source
│
├── games/               # Self-hosted browser game projects
│   ├── autumns-bakery/
│   ├── burger-money/
│   ├── catch-and-fry/
│   ├── duckyverse/
│   ├── horde-yard/
│   ├── hydro-pong/
│   ├── monster-truck-jump/
│   ├── peanut-house-escape/
│   ├── rollies/
│   ├── skate-n-surf/
│   ├── smash-house/
│   ├── taco-toss/
│   └── wiener-yeeter/
│
├── docs/                # Architecture, privacy, roadmap, and Midnight notes
├── packages/            # Future shared identity, UI, and utility modules
└── assets/              # Future shared public assets
```

## Game Library

The current arcade library includes:

* Rollies
* Autumns Bakery
* Catch and Fry
* Hydro Pong
* Burger Money
* Monster Truck Jump
* DuckyVerse
* Horde Yard
* Smash House
* Taco Toss
* Peanut House Escape
* Surf and Skate
* Wiener Yeeter

Each game is kept as a complete project inside this repository so One Home can evolve toward reliable in-app game experiences while still allowing hosted game pages when appropriate.

## Near-Term Roadmap

1. Document the One Home architecture and privacy direction.
2. Organize the Night Shots prototype into a review-ready privacy roadmap.
3. Connect arcade game routes to their self-hosted source folders.
4. Restore reliable in-app game play with clear return-to-arcade and return-to-One-Home navigation.
5. Continue Dood ID, profile, and Ember integration.
6. Define the first practical Midnight privacy milestones for Night Shots.

## Project Principles

* People should understand where they are and what they can do.
* Privacy should be intentional, not hidden behind complicated settings.
* Games and creative tools should feel welcoming, not overwhelming.
* Identity should help people connect without forcing them to give up control.
* The platform should grow through real prototypes, not promises alone.

## Built By

**Dood Labs / One Home**

Created as a growing creator, gaming, identity, and privacy ecosystem for the Midnight Build Club.
