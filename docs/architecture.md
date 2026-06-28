# One Home Architecture

## Overview

One Home is the connected front door for the Dood Labs ecosystem.

It brings together identity, profiles, community activity, private memories, creator tools, and arcade experiences without making people feel like they are entering separate disconnected products.

The intended hierarchy is:

```text
One Home
  -> Ember
  -> Dood Labs
  -> Dood ID
  -> Rooms and experiences
```

## Core Components

### One Home

One Home is the primary user experience and navigation layer.

It is where a visitor can:

* Explore as a guest
* Create or update a profile
* Connect a wallet
* Enter community rooms
* Visit Night Shots
* Play arcade games
* Return to their personal activity and identity

### Ember

Ember is the friendly guide inside One Home.

Ember helps orient visitors based on where they are in the experience:

```text
Visitor
  -> Wallet connected
  -> Profile created
  -> Dood ID connected
  -> Returning community member
```

Ember is intended to guide people without being intrusive or making the experience feel overly technical.

### Dood ID

Dood ID is the identity direction for the ecosystem.

The goal is one connected identity that can support:

* Profile information
* Wallet connections
* Community activity
* Game activity
* Future tickets, badges, rooms, and memories

The system is being designed so identity can become more portable and privacy-aware over time.

### Night Shots

Night Shots is the privacy-focused memory and journaling project within One Home.

Its current prototype includes local support for:

* Photo memories
* Written stories
* Private journals
* Favorites
* Search
* Gallery views
* Sharing controls
* Themes
* Recycle bin and restore behavior

Private memory data should not be treated like public social content by default.

### Arcade

The arcade is a collection of browser-based games connected to One Home.

Games currently live as complete projects under:

```text
games/
```

Each game can support two future ways to play:

1. Play inside the Dood Labs Game Room.
2. Open the hosted game page separately.

The Game Room should always provide clear navigation back to:

```text
Return to Arcade
Return to One Home
```

## Current Repository Layout

```text
apps/
  one-home/       Current Dood Labs and One Home application
  night-shots/    Night Shots prototype source

games/
  Complete browser game projects

docs/
  Project architecture, privacy, roadmap, and Midnight notes

packages/
  Future shared identity, user interface, and utility modules
```

## Data and Privacy Direction

The long-term architecture separates public ecosystem activity from private personal content.

Examples of public activity may include:

* New profile created
* Public game activity
* Community announcements
* Public projects or drops

Examples of private content include:

* Night Shots photos
* Personal journals
* Private memory descriptions
* Sharing permissions
* Sensitive identity-linked activity

The architecture is being prepared for privacy-preserving controls so people can decide what is public, shared, or private.

## Current Build Priorities

1. Keep One Home stable as the front door.
2. Preserve one connected identity direction across experiences.
3. Make Night Shots review-ready as a privacy-focused project.
4. Keep game source self-hosted inside the repository.
5. Restore reliable in-app game play and return navigation.
6. Define practical Midnight privacy milestones for personal memories and sharing controls.
