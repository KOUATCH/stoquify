# Notification UI Experience

## Enterprise Visual Standard

Build a quiet operational interface:

- stable dimensions
- clear hierarchy
- compact cards
- readable timestamps
- professional icons
- restrained color
- no decorative clutter
- no large marketing-style panels

Use app design tokens and existing dashboard conventions first.

## Core Surfaces

Modern notification systems usually need:

- toast stack for immediate feedback
- notification bell with unread count
- notification center or inbox
- settings/preferences panel
- per-notification actions
- filters by status, category, and priority

## Card Anatomy

Each notification card should be able to show:

- icon
- title
- message
- category
- priority or severity badge
- delivery/read state
- timestamp
- optional source label
- optional action button
- dismiss/read controls

Keep text safe and plain. Do not render untrusted HTML.

## State Coverage

Implement clear states:

- loading
- empty
- unread
- read
- dismissed
- queued
- delivered
- failed
- high priority
- sound on/off
- preferences unavailable

## Accessibility

Use semantic buttons, labels, focus-visible states, keyboard-reachable controls, and ARIA labels for icon-only controls.

Do not rely on color alone for priority or status.
