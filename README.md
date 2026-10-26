# PocketPal

A handmade habit companion built with React, TypeScript, Vite, Tailwind CSS, Motion, and Lucide. Original SVG mascot, CSS diorama and glass jar; synthesized Web Audio sounds. No external assets, accounts, backend or paid services.

## Run

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. To check and build:

```sh
npm test
npm run build
npm run preview
```

Deploy the generated `dist/` directory to any static host. The app is designed for browser use; its state model and presentation are separated for future mobile adaptation.

## How it works

Name your pal, choose a felt color, and start with demo tasks or your own first habit. Complete scheduled tasks to restore the corresponding care meter, play a reaction and add a colored ball to your daily jar. Tasks can repeat daily, weekly on their starting weekday, on selected weekdays, or on a single date. All schedules use the device's local date. Use Manage all tasks to edit future, past one-time, and repeating tasks, including those not scheduled today.

The app stores task definitions, timestamped completions, settings, achievements and care in localStorage under `pocketpal-v1`. History is derived from completion records, so deleting a task does not delete earned rewards. Export backups through settings; import validates data and asks before replacing existing progress. Browser storage is device/browser specific and can be erased by clearing site data. A storage failure displays a persistent warning.

Care receives a 24-hour first-user grace period, then decays by elapsed hours (food and happiness .85/hour, water 1.1/hour, cleanliness .65/hour at normal speed). The average determines the six stages: healthy >70, tired >50, unwell >30, zombie >15, critical >0, death at 0. Cozy mode defaults on and floors every meter at 5, preventing death. Speed can be .5, 1, or 2. A completion restores 28 points of its category and 5 happiness (28 for happiness tasks). Reviving restores all meters to 90 without removing progress. Petting provides a reaction but no care rewards. Streaks count consecutive local dates with participation, allowing today to remain unfinished. Best Buddies counts seven participation dates.

Notifications require permission and a supported secure context (localhost or HTTPS). In-app reminders and browser notifications run only while the app is open; no backend or push service runs when closed. Automatic night is 7pm–7am local time. Sound defaults off; enable it with a user interaction. System reduced-motion preferences and the animation setting are respected.

## Source

- `src/model.ts`: schedules, decay, rewards, persistence validation.
- `src/App.tsx`: room, original SVG pet, jar, task editor, settings, onboarding, achievements/history.
- `src/style.css`: responsive handmade aesthetic, lighting and animations.
- `src/model.test.ts`: behavioral scheduling, lifecycle and persistence checks.

No data leaves the browser. Offline behavior: after resources load, core functions and saving require no network. Production builds register a service worker that caches the app shell and loaded same-origin assets for offline return visits. Initial loading requires a connection; service workers require HTTPS or localhost. The development server does not register the worker.
