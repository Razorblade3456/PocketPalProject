# PocketPal

A cozy local-first habit companion built with React, TypeScript, Vite, Tailwind CSS, Motion and Lucide. The original handcrafted room, pastel layout, typography and glass jar are preserved. All artwork and soft sounds are generated in code; there are no external assets, accounts, paid services or backend requirements.

## Run and check

Requires Node.js 22 or newer. Dependencies are already installed in this project.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. Production and verification:

```sh
npm test
npm run build
npm run preview
```

Deploy the generated `dist/` directory to any static host. Production builds cache the app shell and assets with a service worker for offline return visits after the first successful load. Development does not register that worker. HTTPS or localhost is required for service workers and browser notifications.

## Pet health at a glance

Overall health and all four needs now sit directly beneath the pet. Food, Water and Cleanliness point to the corresponding supply; Happiness points to head pats. Tap the pet or use **Head pat +3 joy** to restore happiness. The overall health bar is the average of all four needs, matching the lifecycle stage calculation. Tired pets keep their eyes open while awake; actual nighttime sleep still closes them.

## The care loop

**Complete a real-life task → earn 5 coins → watch a ball fly into the jar → buy a supply → use it on your pal.**

Each task card retains its small sage **+**, dusty coral **−**, undo arrow and edit icon. Completing a newly recorded occurrence gives exactly 5 coins and one colored jar ball; it does not directly feed, hydrate or clean the pet. The ball travels from the clicked control to the jar's mouth, then drops into its slot, bounces and settles while the jar wobbles. The lid briefly lifts. Existing balls do not replay entry animations after refresh. Undo removes the occurrence's ball, including one still in flight. Overlapping completions have independent flights. Scrolling or resizing ends an interrupted flight at its real jar slot. Animation-off and system reduced-motion settings settle rewards immediately.

The small wallet in the top bar links to the supply shelf below the jar. Buying an item stocks it without applying care. Click **Use** to consume one:

| Supply | Price   | Effect when used              |
| ------ | ------- | ----------------------------- |
| Food   | 5 coins | +15 Nourishment, +4 Happiness |
| Water  | 4 coins | +15 Hydration, +4 Happiness   |
| Soap   | 6 coins | +15 Cleanliness, +4 Happiness |

Care stays between 0 and 100. Items cannot be used without inventory; purchases cannot exceed available coins. Dead pets keep their supplies until revived. Head pats give +3 Happiness, capped at 100. They never restore Food, Water or Cleanliness.

### Undo after spending

Task outcomes remain reversible from their cards and dated history. Currency is derived from currently completed occurrences minus purchase costs, so each intentional completion earns one reward while duplicate events cannot duplicate it.

If awarded coins have already been spent, undo keeps bought supplies and previously applied item care intact. The wallet displays zero spendable coins and a small **reserved** amount. Future earnings settle that shortfall before becoming spendable. For example: earn 5, buy Food for 5, undo the task → 0 available and 5 reserved; re-complete the same task → the reservation clears, with no extra coins or duplicated Food. The shelf explains this whenever a reservation exists. Missed outcomes award no coins or balls and retain their negative care effects.

## Pet time and atmosphere

The day/night button changes only the room's visual theme: colors, lighting, sun/moon and stars. Settings offer automatic appearance (day from 7am to 7pm) or a fixed day/night look.

The pet follows the **actual local clock**, independently of that setting:

- **6:00am–8:59pm:** awake; the evening from 7pm is calmer.
- **9:00pm–5:59am:** sleepy/sleeping. Severely unwell pets retain their health-warning expressions.

Health can also make a tired pal look sleepy during the day. Toggling the visual theme never changes the sleep schedule. The app refreshes clock and care on focus and every 30 seconds while open.

## Three handmade companions

Choose a companion during onboarding or in Settings without resetting your custom name, care or history:

- **Mochi:** the original green monster with pointed ears and a round belly. Later stages show drooping ears, scratched cloth, loose threads, exposed pink lining and small dusty-red blood accents.
- **Pippin:** a cream/lavender felt moth with fuzzy antennae and tiny wings. It floats happily, wraps its wings when hurt or asleep, and develops ragged wing edges, damaged lining and dangling antenna stitches.
- **Crumb:** a caramel mushroom-bear with floppy ears and a triangular nose. It wiggles when excited, curls when sleepy, and develops a torn mushroom cap, exposed inner fabric and little blood accents.

Damage is stylized cute-spooky cloth damage, not realistic gore. Zombie-like and Critical stages change anatomy and expression as well as color. Critical movement is weak and slouched. Dead pets are fully desaturated, with X eyes and still bodies; only their little ghost floats.

**Pet health & life stages** opens an illustrated six-stage care guide. Selecting a stage is preview-only and never changes real health, tasks, coins or inventory.

## Schedules, missed tasks and health

Daily, weekly (on the starting weekday), selected-day and one-time tasks use local calendar dates. Unmet finite daily targets become missed during the next reconciliation. Unlimited tasks have no automatic misses. Reconciliation runs on opening, focus, every 30 seconds, and before task edits/deletions. It processes multiple absent days once and preserves task snapshots and historical dates. New tasks cannot be missed before creation, even if backdated. Calendar arithmetic respects daylight-saving transitions.

A task undone today is pending and may become automatically missed at that day's end. An already settled past occurrence undone through history stays pending; reopening does not apply its penalty again. Editing or deleting a task does not erase existing results.

Balance values are exported as `BALANCE` and `SUPPLIES` in `src/model.ts`:

- New completions: 5 coins, zero direct care. Item use: +15 to its need and +4 Happiness.
- Miss: up to −8 to the task's care category. Total missed-task damage is capped at 16 per category and 24 overall per local day, in deterministic occurrence order. Corrections recompute the cushion too.
- A miss cannot reduce a living non-cozy meter below 1; passive decay can eventually reach zero. A single miss alone cannot kill a pal.
- New-user passive-decay grace: 24 hours. Normal decay per hour: Food/Happiness .85, Water 1.1, Cleanliness .65. Speed settings are .5×, 1× and 2×. Missed-task damage is capped separately from passive decay.
- Average care selects Healthy >70, Tired >50, Unwell >30, Zombie-like >15, Critical >0, Dead at 0. Cozy mode defaults on and floors care at 5, preventing death.
- Revival restores care to 90 without deleting jars, achievements, coins or inventory. Already earned achievements remain unlocked; streaks and jar totals follow corrected positive outcomes.

No code runs while the browser is closed. On return, elapsed timestamps reconcile care and missed tasks. In-app reminders and browser notifications require the app to remain open; there is no backend push service. Notifications also require permission. Sound starts muted and can be enabled with a user interaction.

## Persistence and upgrades

Data remains under the existing localStorage key `pocketpal-v1`, now using **schema version 4**. Each task attempt has its own persistent outcome and jar-ball ID. The model replays care from an immutable checkpoint with timestamped, sequence-ordered settings, revival, purchase and item-use events. Wallet and inventory caches are re-derived from those records. This keeps capped health, duplicate prevention and corrections consistent across refreshes.

Version-1, version-2 and version-3 saves/backups migrate automatically. Existing pet name/type, care, schedules, history, settings and achievements are retained. Existing completed occurrences receive a single 5-coin grant for the new shop; refreshing cannot award it again. Historical version-2 completed occurrences retain their already-recorded care until corrected. Re-completing a corrected occurrence awards coins only, including old saves; it does not restore a former direct-care reward. New occurrences, and formerly pending or missed occurrences completed after upgrading, use the coin-only care loop. Version-1 saves did not record per-reward clamping, so correcting those very old completions still reverses their original nominal care contribution at the migration checkpoint. Automatic missed-task accounting does not invent penalties for unrecorded pre-version-2 days.

The original raw save is backed up under `pocketpal-before-boutique` when storage allows. Export JSON through Settings; imports validate schema, unique occurrence/transaction IDs, item names and inventory chronology before asking to replace data. Unreadable saves show a recovery screen rather than being overwritten. Failed saving displays a warning. Browser storage is device/browser-specific and can be erased by clearing site data; keep exports for important progress. No user data leaves the browser.

## Source and verification

- `src/model.ts`: schedules, health and economy replay, automatic misses, supply transactions, sleep-time helper, save validation and migration.
- `src/Jar.tsx`: existing jar artwork plus source-to-jar reward flights, landing bounce and wobble.
- `src/Supplies.tsx`: compact shop/inventory shelf and coin-reservation explanation.
- `src/PetNeeds.tsx`: overall health and clearly labeled needs beside the pet, supply guidance and head-pat action.
- `src/Pets.tsx`: three original pet drawings, species-specific spooky details, reactions and preview guide.
- `src/TaskOutcomes.tsx`: shared outcome controls and history corrections.
- `src/App.tsx`: existing room, layout, onboarding, settings and integration.
- `src/model.test.ts`: 64 behavioral/rendering checks covering schedules, offline elapsed time, missed days, caps, corrections, coins, purchases, item use, exploit prevention, migration, all 18 pet-stage drawings and real-time sleep boundaries. Additional checks cover head-pat happiness, tired open-eye drawings and legacy coin-only corrections.

Browser QA covers desktop/mobile layouts, source-to-jar flight and landing, coin gain, purchase versus use behavior, corrections after spending, refresh, theme/sleep separation, and disabled animations. Run tests with `TZ=America/Los_Angeles` to explicitly exercise that timezone's daylight-saving dates.


## Repeatable tasks and daily targets

Every deliberate + or − press records a separate entry. A 350 ms lock prevents rapid accidental duplicates. Choose Once (target 1), Multiple (minimum 1), Custom goal (1–100), or Unlimited (no automatic misses). All modes allow extra entries beyond the target. Each positive earns 5 coins and a distinct jar ball. Each negative applies the category penalty within existing daily caps. Counters reset on the local date; history retains every entry.

Undo removes only the latest entry. History corrects or removes individual entries. Automatic reconciliation records only the finite target shortfall once, counting manual completed and missed entries toward the target. Goal progress is capped per task; every positive, including extras, remains in the jar.

## Boutique and interactive inventory

Shop offers Essentials, Treats & Food, and Outfits & Accessories, illustrated with original SVG artwork. Buying stocks inventory without applying care. Drag an owned item onto your pet with mouse or touch, or choose Feed / Use. Outside drops return without consuming anything. Your pet follows food, anticipates nearby treats, and chews after feeding. Favorites affect reactions: Mochi likes pizza/ice cream, Pippin cake/smoothies, and Crumb burgers/pancakes.

| Treat | Coins | Effects |
| --- | ---: | --- |
| Cheeseburger | 15 | +25 Food, +5 Happiness |
| Pizza | 18 | +25 Food, +7 Happiness |
| Cake | 20 | +10 Food, +20 Happiness |
| Ice cream | 12 | +5 Food, +15 Happiness |
| Cookie | 10 | +5 Food, +10 Happiness |
| Smoothie | 14 | +10 Water, +10 Happiness |
| Pancakes | 22 | +30 Food, +8 Happiness |

Permanent clothing: Tiny Beanie 25, Bow Tie 15, Cozy Scarf 30, Little Backpack 40, Mushroom Hat 50, Soft Pajamas 60, Golden Crown 100, Zombie Costume 75 coins. Wardrobe previews your pet and supports equip/unequip. Head, neck, back and body slots combine; another item in the same slot replaces it. Species-specific layers move with pet animations. Clothing has no care effect and cannot be purchased twice.

Inventory, outfit ownership, equipped items and transactions persist through refresh/export/import. Undoing income after spending retains purchases and used care; future earnings cover the shortfall before becoming spendable. Migration retains old progress without granting rewards twice.
