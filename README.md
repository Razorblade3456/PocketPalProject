# PocketPal

A handmade habit companion built with React, TypeScript, Vite, Tailwind CSS, Motion and Lucide. The existing room, typography, pastel layout and glass jar are preserved. All three creatures use original code-driven SVG artwork; no assets or backend services are required.

## Run

Requires Node.js 22 or newer. Dependencies are already installed in the project.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Checks and production build:

```sh
npm test
npm run build
npm run preview
```

Deploy `dist/` to any static host. Automatic night runs from 7pm to 7am in the device's local timezone. Sound starts muted; reduced-motion preferences are respected.

## Three companions

Choose a companion during onboarding or in Settings, without resetting your name, care or history:

- **Mochi:** the original green felt monster, with pointed ears, a round belly and cheerful bounces. Neglect droops its ears, loosens stitches, and tears its cloth.
- **Pippin:** a cream and lavender felt moth with fuzzy antennae, sleepy eyes and little wings. It floats happily, wraps its wings when hurt, and develops sagging antennae and ragged wings as care falls.
- **Crumb:** a caramel woodland mushroom-bear with floppy ears, a stitched belly and triangular nose. It wiggles when excited, curls when sleepy, and develops a faded, torn cap and drooping ears.

The **Pet health & life stages** button opens an illustrated guide. Select any of the six stages to inspect your chosen creature. Previewing never changes care, tasks or progress. Dead pets have still bodies and X eyes; only their little ghost moves.

## Task outcomes and corrections

Each card has sage **+** (completed), dusty coral **−** (missed), an undo arrow, and an edit icon. Statuses are Pending, Completed and Missed. A completion gives **+10** to the task's care category and one jar ball. A miss takes **up to 8** from that category and adds no ball. Floating indicators show the actual stat change, including caps. Petting is affection rather than a care reward.

Undo returns a task occurrence to pending. Switching outcomes replaces its result rather than applying a second transaction. The jar, count and care recompute together. Health replays from an immutable checkpoint so a reward that hit 100 can be undone accurately. Care-setting changes and revivals are timestamped and ordered, including actions in the same millisecond. Historical outcomes retain their original task name, category and local date, even after the task is edited or deleted.

Open **Your little history → Every day's little things** to choose a date and correct completed, manually missed, automatically missed, or undone occurrences. An undone past occurrence stays pending; reopening does not automatically penalize it again. Achievements already earned remain unlocked, while streaks and jar counts follow the current positive results.

## Scheduling and automatic misses

Daily, weekly (on the starting weekday), selected-weekday and one-time schedules all use local calendar dates. Tasks still pending when their assigned day ends become missed during the next reconciliation, which runs on opening, focus and every 30 seconds while open. It also runs before schedule edits or deletions so past occurrences retain their old schedules. Multiple absent days are reconciled once. Dates advance by calendar day, including daylight-saving transitions. New tasks cannot be penalized for dates before their creation, even if their starting date is backdated.

No process runs while the browser is closed. On return, timestamps settle missed occurrences and passive care consistently. Reminders operate only while the app is open. Browser notifications require permission and HTTPS or localhost and cannot reliably arrive while closed.

## Health balance

All tuning values are exported as `BALANCE` in `src/model.ts`:

- Completion: +10 to the associated care meter; miss: up to −8.
- Missed-task damage: maximum **16 per care category per local day**, **24 total per local day**, distributed deterministically in occurrence order. Correcting an outcome also recomputes this cushion.
- A missed-task penalty cannot reduce a living, non-cozy meter below 1. Passive decay may eventually reach zero. One missed task alone cannot kill a pet.
- New users receive a 24-hour passive-decay grace period. At normal speed, food/happiness decay .85/hour, water 1.1/hour and cleanliness .65/hour. Speed settings are .5×, 1× and 2×. Missed-task effects remain fixed; they are capped separately from passive decay.
- The four-meter average determines Healthy >70, Tired >50, Unwell >30, Zombie-like >15, Critical >0, Dead at 0. Cozy mode defaults on and floors care at 5, preventing death.
- Revival sets every meter to 90 without deleting task history or rewards. Later correction of an occurrence before that revival keeps the historical correction, while the revival still resets subsequent care.

## Saving and migration

Data stays in localStorage under the existing `pocketpal-v1` key. The value now uses schema version 2, with one authoritative record per `(task ID, local date)`, task snapshots, a care checkpoint, and timestamped care-setting/revival events. Completion records are derived from positive outcomes. Refreshes do not stack effects.

Original version-1 saves and backups migrate automatically. Name, tasks, care, completed jars, settings and achievements are retained, and the original raw save is kept under `pocketpal-before-outcomes` when storage allows. Existing pals initially retain Mochi's shape. Automatic missed-task accounting begins on the upgrade day: old unrecorded days do not receive surprise penalties.

Old saves recorded only final care values, not the actual clamped effect of each old reward. They therefore seed the care checkpoint rather than replaying old rewards. Correcting one of those legacy completions reverses its former nominal reward (+28 category and +5 happiness, or +28 happiness) at the migration checkpoint; returning it to completed restores that checkpoint contribution. Exact replay, including cap-aware undo, applies to all outcomes recorded by this update.

Export a JSON backup through Settings. Import validates structure, dates and unique occurrence keys, then asks before replacing data. Storage is browser- and device-specific, and clearing site data erases it. The app shows a warning if saving fails. No user data leaves the browser.

Production builds cache the app shell and its assets with a service worker for offline return visits after the first successful load. Development builds do not register it. A first visit still requires a connection; service workers require HTTPS or localhost.

## Source and verification

- `src/model.ts`: schedules, automatic settlement, outcome transactions, health replay, validation and migration.
- `src/Pets.tsx`: original pet drawings, species reactions, selector and preview-only care guide.
- `src/TaskOutcomes.tsx`: shared +/−/undo controls and dated history corrections.
- `src/App.tsx`: existing room, jar, onboarding, task editor, settings and integration.
- `src/style.css`: existing handcrafted design plus compact outcome controls and species styling.
- `src/model.test.ts`: behavioral checks for reward caps, undo/switching, duplicate clicks, missed days, creation dates, historical snapshots, settings, revival, DST and migration.

Run tests in your local timezone, or set `TZ=America/Los_Angeles` before launching the test command to explicitly exercise the DST transition cases.
