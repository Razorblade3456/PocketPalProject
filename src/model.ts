export type Category = "food" | "water" | "clean" | "happy";
import {
  SUPPLIES,
  OUTFITS,
  SUPPLY_IDS,
  OUTFIT_IDS,
  isSupply,
  isOutfit,
  emptyInventory,
  type Supply,
  type Outfit,
  type OutfitSlot,
  type ShopItem,
} from "./catalog";
export {
  SUPPLIES,
  OUTFITS,
  SUPPLY_IDS,
  OUTFIT_IDS,
  isSupply,
  isOutfit,
  emptyInventory,
} from "./catalog";
export type { Supply, Outfit, OutfitSlot, ShopItem } from "./catalog";
export const petRhythm = (n = Date.now()) => {
  const h = new Date(n).getHours();
  return { sleeping: h >= 21 || h < 6, calm: h >= 19 && h < 21 };
};
export type PetKind = "mochi" | "pippin" | "crumb";
export type OutcomeStatus = "pending" | "completed" | "missed";
export type Care = Record<Category, number>;
export type Task = {
  id: string;
  name: string;
  description: string;
  time: string;
  repeat:
    "daily" | "weekly" | "selected" | "once" | "interval" | "afterCompletion";
  intervalDays?: number;
  createdDate?: string;
  durationMinutes?: number;
  priority?: "low" | "normal" | "high";
  reminderEnabled?: boolean;
  careLinked?: boolean;
  rewardCap?: number;
  steps?: { id: string; name: string }[];
  days: number[];
  date: string;
  category: Category;
  createdAt?: number;
  repetitions?: "once" | "multiple" | "goal" | "unlimited";
  dailyGoal?: number;
};
export type Completion = {
  id?: string;
  ballId?: string;
  taskId: string;
  name: string;
  category: Category;
  at: number;
  date: string;
};
export type Occurrence = Completion & {
  id: string;
  ballId: string;
  penalty: number;
  deleted?: boolean;
  status: OutcomeStatus;
  task: Task;
  automatic: boolean;
  sequence: number;
  legacy?: boolean;
  legacyRetired?: boolean;
  rewardCare: number;
  rewardCoins: number;
  rewardRate?: number;
  rewardLimit?: number;
  timeZone?: string;
};
type Settings = {
  sound: boolean;
  motion: boolean;
  theme: "auto" | "day" | "night";
  reminders: boolean;
  speed: number;
  cozy: boolean;
};
type CareEvent =
  | {
      kind: "settings";
      at: number;
      speed: number;
      cozy: boolean;
      sequence: number;
    }
  | { kind: "pat"; at: number; sequence: number }
  | { kind: "revive"; at: number; sequence: number }
  | {
      kind: "buy";
      id: string;
      at: number;
      sequence: number;
      item: ShopItem;
      cost: number;
    }
  | {
      kind: "use";
      id: string;
      at: number;
      sequence: number;
      item: Supply;
      boost: number;
      morale: number;
    };
export type RewardTransaction = {
  id: string;
  entryId: string;
  amount: number;
  at: number;
};
export type HabitEvent = {
  id: string;
  taskId: string;
  date: string;
  at: number;
  kind:
    "skip" | "pause" | "resume" | "reschedule" | "snooze" | "step" | "restore";
  reason?: string;
  taskName?: string;
  stepName?: string;
  until?: string;
  time?: string;
  stepId?: string;
  done?: boolean;
};
export type RewardPolicy = { coins: number; dailyCap: number };
export type State = {
  rewardPolicy?: RewardPolicy;
  rewardLedger?: RewardTransaction[];
  habitEvents?: HabitEvent[];
  focusDays?: Record<string, string[]>;
  version: 4;
  ownedOutfits: Outfit[];
  equipped: Partial<Record<OutfitSlot, Outfit>>;
  coins: number;
  debt: number;
  inventory: Record<Supply, number>;
  name: string;
  color: string;
  pet: PetKind;
  created: number;
  updated: number;
  care: Care;
  tasks: Task[];
  completions: Completion[];
  outcomes: Occurrence[];
  achievements: string[];
  settings: Settings;
  baseline: { at: number; care: Care; speed: number; cozy: boolean };
  careEvents: CareEvent[];
  settledThrough: string;
  lastSequence: number;
};
export const BALANCE = {
  completed: 0,
  completedCoins: 5,
  headPat: 3,
  missed: 8,
  maxMissedPerCategoryPerDay: 16,
  maxMissedPerDay: 24,
  graceHours: 24,
  rates: { food: 0.85, water: 1.1, clean: 0.65, happy: 0.85 },
};
export const categories: Category[] = ["food", "water", "clean", "happy"];
export const labels: Record<Category, string> = {
  food: "Nourishment",
  water: "Hydration",
  clean: "Cleanliness",
  happy: "Happiness",
};
export const dateKey = (n = Date.now()) => {
  const d = new Date(n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const localDate = (key: string) => new Date(key + "T12:00:00");
export const shiftDate = (key: string, days: number) => {
  const d = localDate(key);
  d.setDate(d.getDate() + days);
  return dateKey(+d);
};
const endOfDay = (key: string) =>
  +new Date(shiftDate(key, 1) + "T00:00:00") - 1;
const clamp = (v: number, min = 0) => Math.max(min, Math.min(100, v));
export const occurrenceKey = (id: string, date: string) =>
  JSON.stringify([id, date]);
export function initial(n = Date.now()): State {
  const care = { food: 85, water: 85, clean: 90, happy: 90 };
  return {
    version: 4,
    rewardPolicy: { coins: 5, dailyCap: 3 },
    rewardLedger: [],
    habitEvents: [],
    focusDays: {},
    ownedOutfits: [],
    equipped: {},
    coins: 0,
    debt: 0,
    inventory: emptyInventory(),
    lastSequence: 0,
    name: "",
    color: "sage",
    pet: "mochi",
    created: n,
    updated: n,
    care,
    tasks: [],
    completions: [],
    outcomes: [],
    achievements: [],
    settings: {
      sound: false,
      motion: true,
      theme: "auto",
      reminders: false,
      speed: 1,
      cozy: true,
    },
    baseline: { at: n, care: { ...care }, speed: 1, cozy: true },
    careEvents: [],
    settledThrough: shiftDate(dateKey(n), -1),
  };
}
/** Calendar distance ignores 23/25-hour DST days. */
export const calendarDays = (a: string, b: string) =>
  (Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000;
export const due = (t: Task, n = Date.now(), outcomes: Occurrence[] = []) => {
  const d = new Date(n),
    key = dateKey(n);
  if (key < t.date || key < (t.createdDate ?? dateKey(t.createdAt ?? 0)))
    return false;
  if (t.repeat === "daily") return true;
  if (t.repeat === "once") return key === t.date;
  if (t.repeat === "weekly") return d.getDay() === localDate(t.date).getDay();
  if (t.repeat === "selected") return t.days.includes(d.getDay());
  const interval = Math.max(1, t.intervalDays || 1);
  const last = outcomes
    .filter(
      (o) =>
        o.taskId === t.id &&
        o.date < key &&
        o.status === "completed" &&
        !o.deleted,
    )
    .map((o) => o.date)
    .sort()
    .at(-1);
  const anchor =
    t.repeat === "afterCompletion" && last ? shiftDate(last, interval) : t.date;
  return key >= anchor && calendarDays(key, anchor) % interval === 0;
};
export function pausedOn(s: State, taskId: string, date: string) {
  const events = (s.habitEvents || [])
    .filter(
      (e) =>
        e.taskId === taskId &&
        (e.kind === "pause" || e.kind === "resume") &&
        e.date <= date,
    )
    .sort((a, b) => a.at - b.at);
  const last = events.at(-1);
  return last?.kind === "pause" && (!last.until || date <= last.until);
}
export function taskDue(s: State, t: Task, n = Date.now()) {
  const day = dateKey(n);
  if (
    day < (t.createdDate ?? dateKey(t.createdAt ?? 0)) ||
    pausedOn(s, t.id, day)
  )
    return false;
  const events = (s.habitEvents || []).filter((e) => e.taskId === t.id);
  const plan = events
    .filter(
      (e) =>
        e.date === day && ["skip", "reschedule", "restore"].includes(e.kind),
    )
    .at(-1);
  if (plan?.kind === "skip") return false;
  const moves = events.filter(
    (e) =>
      e.kind === "reschedule" &&
      events
        .filter(
          (other) =>
            other.date === e.date &&
            ["reschedule", "restore"].includes(other.kind),
        )
        .at(-1)?.id === e.id,
  );
  const movedFrom = moves.some((e) => e.date === day);
  const movedTo = moves
    .filter((e) => e.until === day)
    .some((e) => moves.filter((m) => m.date === e.date).at(-1)?.id === e.id);
  return movedTo || (!movedFrom && due(t, n, s.outcomes));
}
export function reminderFor(s: State, t: Task, day: string) {
  return (
    (s.habitEvents || [])
      .filter((e) => e.kind === "snooze" && e.taskId === t.id && e.date === day)
      .at(-1)?.time || t.time
  );
}
export const policyFor = (s: State) =>
  s.rewardPolicy || { coins: 5, dailyCap: 3 };
export const rewardLimitFor = (s: State, t: Task) =>
  t.repetitions === "goal"
    ? goalFor(t)
    : (t.rewardCap ?? policyFor(s).dailyCap);
function reconcileRewards(s: State, n: number): State {
  const counts = new Map<string, number>();
  const outcomes = [...s.outcomes]
    .sort((a, b) => a.sequence - b.sequence)
    .map((o) => {
      const key = occurrenceKey(o.taskId, o.date),
        count = counts.get(key) || 0;
      const completed = o.status === "completed" && !o.deleted;
      const amount =
        o.rewardLimit === undefined
          ? o.rewardCoins
          : completed && count < o.rewardLimit
            ? (o.rewardRate ?? 5)
            : 0;
      if (completed) counts.set(key, count + 1);
      return o.rewardCoins === amount ? o : { ...o, rewardCoins: amount };
    });
  const totals = new Map<string, number>();
  const ledger = [...(s.rewardLedger || [])];
  for (const e of ledger)
    totals.set(e.entryId, (totals.get(e.entryId) || 0) + e.amount);
  for (const o of outcomes) {
    const desired = o.status === "completed" && !o.deleted ? o.rewardCoins : 0;
    const difference = desired - (totals.get(o.id) || 0);
    if (difference)
      ledger.push({
        id: crypto.randomUUID(),
        entryId: o.id,
        amount: difference,
        at: n,
      });
  }
  return {
    ...s,
    outcomes,
    rewardLedger: ledger,
    rewardPolicy: policyFor(s),
    habitEvents: s.habitEvents || [],
    focusDays: s.focusDays || {},
  };
}
export const stageForCare = (care: Care, cozy = false) => {
  const avg = categories.reduce((a, c) => a + care[c], 0) / 4;
  return avg > 70
    ? 0
    : avg > 50
      ? 1
      : avg > 30
        ? 2
        : avg > 15
          ? 3
          : avg > 0 || cozy
            ? 4
            : 5;
};
export const stage = (s: Pick<State, "care" | "settings">) =>
  stageForCare(s.care, s.settings.cozy);
export function outcomeFor(s: State, id: string, date: string) {
  return s.outcomes.find(
    (o) => o.taskId === id && o.date === date && !o.deleted,
  );
}
export const goalFor = (task: Task) =>
  task.repetitions === "unlimited"
    ? 0
    : task.repetitions === "goal"
      ? Math.max(1, Math.min(100, Math.round(task.dailyGoal || 1)))
      : 1;
export function taskCounts(s: State, id: string, date: string) {
  const entries = s.outcomes.filter(
    (o) => o.taskId === id && o.date === date && !o.deleted,
  );
  return {
    completed: entries.filter((o) => o.status === "completed").length,
    missed: entries.filter((o) => o.status === "missed").length,
    latest: [...entries]
      .filter((o) => o.status !== "pending")
      .sort((a, b) => b.sequence - a.sequence)[0],
  };
}
export const rewardKey = (c: Completion) =>
  c.ballId || c.id || occurrenceKey(c.taskId, c.date);
export function recordAttempt(
  s: State,
  taskId: string,
  date: string,
  status: "completed" | "missed",
  n = Date.now(),
  id: string = crypto.randomUUID(),
): State {
  s = decay(s, n);
  if (s.outcomes.some((o) => o.id === id) || date > dateKey(n)) return s;
  const task = s.tasks.find((t) => t.id === taskId);
  if (!task || !taskDue(s, task, +localDate(date))) return s;
  const entry: Occurrence = {
    id,
    ballId: "ball:" + id,
    taskId,
    date,
    status,
    at: date === dateKey(n) ? n : endOfDay(date),
    name: task.name,
    category: task.category,
    task: { ...task, days: [...task.days] },
    automatic: false,
    sequence: s.lastSequence + 1,
    rewardCare: 0,
    rewardCoins: policyFor(s).coins,
    rewardRate: policyFor(s).coins,
    rewardLimit: rewardLimitFor(s, task),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    penalty: task.careLinked === false ? 0 : BALANCE.missed,
  };
  return project(
    {
      ...s,
      lastSequence: s.lastSequence + 1,
      outcomes: [...s.outcomes, entry],
    },
    n,
  );
}
export function correctAttempt(
  s: State,
  id: string,
  status: OutcomeStatus,
  n = Date.now(),
): State {
  s = decay(s, n);
  const old = s.outcomes.find((o) => o.id === id && !o.deleted);
  if (!old || old.status === status) return s;
  return project(
    {
      ...s,
      outcomes: s.outcomes.map((o) =>
        o.id === id
          ? {
              ...o,
              status,
              automatic: false,
              rewardCare: status === "completed" ? 0 : o.rewardCare,
              ...(o.legacy ? { legacyRetired: true } : {}),
            }
          : o,
      ),
    },
    n,
  );
}
export function deleteAttempt(s: State, id: string, n = Date.now()): State {
  s = decay(s, n);
  const old = s.outcomes.find((o) => o.id === id && !o.deleted);
  if (!old) return s;
  return project(
    {
      ...s,
      outcomes: s.outcomes.map((o) =>
        o.id === id
          ? {
              ...o,
              deleted: true,
              status: "pending",
              ...(o.legacy ? { legacyRetired: true } : {}),
            }
          : o,
      ),
    },
    n,
  );
}
export function undoLatest(
  s: State,
  taskId: string,
  date: string,
  n = Date.now(),
): State {
  s = decay(s, n);
  const latest = taskCounts(s, taskId, date).latest;
  return latest ? deleteAttempt(s, latest.id, n) : s;
}
/** Recompute from an immutable checkpoint. Never reverse a clamped value by subtraction. */
function project(s: State, n: number): State {
  s = reconcileRewards(s, n);
  let care = { ...s.baseline.care },
    speed = s.baseline.speed,
    cozy = s.baseline.cozy,
    last = s.baseline.at;
  const penalties = new Map<string, number>();
  const events = [
    ...s.careEvents.map((e, i) => ({
      at: e.at,
      order: e.sequence,
      key: String(i),
      event: e,
    })),
    ...s.outcomes.map((o) => ({
      at: Math.max(s.baseline.at, o.at),
      order: o.sequence,
      key: occurrenceKey(o.taskId, o.date),
      event: o,
    })),
  ].sort(
    (a, b) => a.at - b.at || a.order - b.order || a.key.localeCompare(b.key),
  );
  const advance = (at: number) => {
    const hours =
      Math.max(
        0,
        at - Math.max(last, s.created + BALANCE.graceHours * 3600000),
      ) / 3600000;
    for (const c of categories)
      care[c] = clamp(care[c] - hours * speed * BALANCE.rates[c], cozy ? 5 : 0);
    last = Math.max(last, at);
  };
  let recovered = false;
  let spent = 0;
  const inventory = emptyInventory();
  const ownedOutfits = new Set<Outfit>();
  for (const { at, event: e } of events) {
    if (at > n) continue;
    advance(at);
    if ("kind" in e) {
      if (e.kind === "pat") {
        const before = stage({ care, settings: { ...s.settings, cozy } });
        care.happy = clamp(care.happy + BALANCE.headPat, cozy ? 5 : 0);
        if (
          before >= 3 &&
          stage({ care, settings: { ...s.settings, cozy } }) < 3
        )
          recovered = true;
        continue;
      }
      if (e.kind === "buy") {
        spent += e.cost;
        if (isSupply(e.item)) inventory[e.item]++;
        else ownedOutfits.add(e.item);
        continue;
      }
      if (e.kind === "use") {
        if (inventory[e.item] > 0) {
          const before = stage({ care, settings: { ...s.settings, cozy } });
          inventory[e.item]--;
          const category = SUPPLIES[e.item].category;
          care[category] = clamp(care[category] + e.boost, cozy ? 5 : 0);
          care.happy = clamp(care.happy + e.morale, cozy ? 5 : 0);
          if (
            before >= 3 &&
            stage({ care, settings: { ...s.settings, cozy } }) < 3
          )
            recovered = true;
        }
        continue;
      }
      if (e.kind === "revive")
        care = { food: 90, water: 90, clean: 90, happy: 90 };
      else {
        speed = e.speed;
        cozy = e.cozy;
        for (const c of categories) care[c] = clamp(care[c], cozy ? 5 : 0);
      }
      continue;
    }
    const before = stage({ care, settings: { ...s.settings, cozy } });
    let amount = 0;
    if (e.status === "completed" && !e.deleted) amount = e.rewardCare;
    if (e.status === "missed" && !e.deleted) {
      const ck = e.date + ":" + e.category,
        dk = e.date;
      const penalty = Math.max(
        0,
        Math.min(
          e.penalty ?? BALANCE.missed,
          BALANCE.maxMissedPerCategoryPerDay - (penalties.get(ck) || 0),
          BALANCE.maxMissedPerDay - (penalties.get(dk) || 0),
        ),
      );
      penalties.set(ck, (penalties.get(ck) || 0) + penalty);
      penalties.set(dk, (penalties.get(dk) || 0) + penalty);
      amount = -penalty;
    }
    // Legacy care is already in the checkpoint; retain it until the old result is corrected.
    if (e.legacy) {
      if (e.status === "completed" && !e.legacyRetired) continue;
      amount -= 28;
      if (e.category !== "happy")
        care.happy = clamp(care.happy - 5, cozy ? 5 : 1);
    }
    care[e.category] = clamp(
      care[e.category] + amount,
      amount < 0 ? (cozy ? 5 : Math.min(1, care[e.category])) : cozy ? 5 : 0,
    );
    if (before >= 3 && stage({ care, settings: { ...s.settings, cozy } }) < 3)
      recovered = true;
  }
  advance(n);
  const completions = s.outcomes
    .filter((o) => o.status === "completed" && !o.deleted && o.rewardCoins > 0)
    .map(({ id, ballId, taskId, name, category, at, date }) => ({
      id,
      ballId,
      taskId,
      name,
      category,
      at,
      date,
    }));
  const achievements = new Set(s.achievements);
  if (completions.length) achievements.add("First Meal");
  if (completions.filter((c) => c.category === "water").length >= 10)
    achievements.add("Hydration Hero");
  if (new Set(completions.map((c) => c.date)).size >= 7)
    achievements.add("Best Buddies");
  const day = dateKey(n),
    planned = s.tasks.filter((t) => taskDue(s, t, n));
  if (
    planned.length &&
    planned.every((t) => taskCounts(s, t.id, day).completed >= goalFor(t))
  )
    achievements.add("Full Jar");
  if (recovered) achievements.add("Zombie Survivor");
  return {
    ...s,
    updated: Math.max(n, s.updated),
    care,
    coins: Math.max(
      0,
      (s.rewardLedger || []).reduce((sum, e) => sum + e.amount, 0) - spent,
    ),
    debt: Math.max(
      0,
      spent - (s.rewardLedger || []).reduce((sum, e) => sum + e.amount, 0),
    ),
    inventory,
    ownedOutfits: [...ownedOutfits],
    equipped: Object.fromEntries(
      Object.entries(s.equipped || {}).filter(([, id]) =>
        ownedOutfits.has(id as Outfit),
      ),
    ),
    completions,
    achievements: [...achievements],
  };
}
/** Settle each local calendar day once, including DST and multi-day absences. */
export function decay(s: State, n = Date.now()): State {
  if ((s.version as number) !== 4) {
    const upgraded = parseState(s, n);
    if (!upgraded) throw Error("This save could not be upgraded safely.");
    return upgraded;
  }
  const today = dateKey(n),
    outcomes = [...s.outcomes];
  let settledThrough = s.settledThrough,
    lastSequence = s.lastSequence;
  for (
    let day = shiftDate(settledThrough, 1);
    day < today;
    day = shiftDate(day, 1)
  ) {
    for (const task of s.tasks) {
      if (!taskDue({ ...s, outcomes }, task, +localDate(day))) continue;
      const records = outcomes.filter(
        (o) => o.taskId === task.id && o.date === day && !o.deleted,
      );
      const recorded = records.filter((o) => o.status !== "pending").length;
      const shortfall = Math.max(0, goalFor(task) - recorded);
      const pending = records.filter((o) => o.status === "pending");
      for (let i = 0; i < shortfall; i++) {
        const old = pending[i];
        const id = old?.id ?? JSON.stringify(["auto", task.id, day, i]);
        const occurrence: Occurrence = {
          ...(old || {}),
          id,
          ballId: old?.ballId ?? "ball:" + id,
          taskId: task.id,
          name: old?.name ?? task.name,
          category: old?.category ?? task.category,
          at: endOfDay(day),
          date: day,
          status: "missed",
          task: old?.task ?? { ...task, days: [...task.days] },
          automatic: true,
          sequence: ++lastSequence,
          rewardCare: 0,
          rewardCoins: policyFor(s).coins,
          rewardRate: policyFor(s).coins,
          rewardLimit: rewardLimitFor(s, task),
          penalty: task.careLinked === false ? 0 : BALANCE.missed,
        };
        if (old) outcomes[outcomes.indexOf(old)] = occurrence;
        else outcomes.push(occurrence);
      }
    }
    settledThrough = day;
  }
  return project(
    { ...s, outcomes, settledThrough, lastSequence },
    Math.max(n, s.baseline.at),
  );
}
export function setOutcome(
  s: State,
  id: string,
  date: string,
  status: OutcomeStatus,
  n = Date.now(),
): State {
  s = decay(s, n);
  if (date > dateKey(n)) return s;
  const old = outcomeFor(s, id, date),
    task = old?.task ?? s.tasks.find((t) => t.id === id);
  if (
    !task ||
    (!old && !taskDue(s, task, +localDate(date))) ||
    old?.status === status ||
    (!old && status === "pending")
  )
    return s;
  const outcome: Occurrence = old
    ? {
        ...old,
        status,
        automatic: false,
        rewardCare: status === "completed" ? 0 : old.rewardCare,
        ...(old.legacy ? { legacyRetired: true } : {}),
      }
    : {
        id: crypto.randomUUID(),
        ballId: crypto.randomUUID(),
        penalty: task.careLinked === false ? 0 : BALANCE.missed,
        taskId: id,
        name: task.name,
        category: task.category,
        at: date === dateKey(n) ? n : endOfDay(date),
        date,
        status,
        task: { ...task, days: [...task.days] },
        automatic: false,
        sequence: s.lastSequence + 1,
        rewardCare: 0,
        rewardCoins: policyFor(s).coins,
        rewardRate: policyFor(s).coins,
        rewardLimit: rewardLimitFor(s, task),
      };
  return project(
    {
      ...s,
      lastSequence: old ? s.lastSequence : s.lastSequence + 1,
      outcomes: old
        ? s.outcomes.map((o) => (o === old ? outcome : o))
        : [...s.outcomes, outcome],
    },
    n,
  );
}
export const complete = (s: State, id: string, n = Date.now()) =>
  setOutcome(s, id, dateKey(n), "completed", n);
export function saveTask(s: State, task: Task, n = Date.now()): State {
  s = decay(s, n);
  const old = s.tasks.find((t) => t.id === task.id);
  const next = {
    ...task,
    createdAt: old?.createdAt ?? n,
    createdDate: old?.createdDate ?? dateKey(old?.createdAt ?? n),
  };
  return {
    ...s,
    tasks: old
      ? s.tasks.map((t) => (t.id === task.id ? next : t))
      : [...s.tasks, next],
  };
}
export function deleteTask(s: State, id: string, n = Date.now()): State {
  s = decay(s, n);
  return {
    ...s,
    tasks: s.tasks.filter((t) => t.id !== id),
    focusDays: Object.fromEntries(
      Object.entries(s.focusDays || {}).map(([day, ids]) => [
        day,
        day >= dateKey(n) ? ids.filter((taskId) => taskId !== id) : ids,
      ]),
    ),
  };
}
export function changeSettings(
  s: State,
  patch: Partial<Settings>,
  n = Date.now(),
): State {
  s = decay(s, n);
  const settings = { ...s.settings, ...patch };
  const changes =
    settings.speed !== s.settings.speed || settings.cozy !== s.settings.cozy;
  return project(
    {
      ...s,
      settings,
      lastSequence: changes ? s.lastSequence + 1 : s.lastSequence,
      careEvents: changes
        ? [
            ...s.careEvents,
            {
              kind: "settings",
              sequence: s.lastSequence + 1,
              at: n,
              speed: settings.speed,
              cozy: settings.cozy,
            },
          ]
        : s.careEvents,
    },
    n,
  );
}
export function revive(s: State, n = Date.now()): State {
  s = decay(s, n);
  return project(
    {
      ...s,
      lastSequence: s.lastSequence + 1,
      careEvents: [
        ...s.careEvents,
        { kind: "revive", at: n, sequence: s.lastSequence + 1 },
      ],
    },
    n,
  );
}
export function headPat(s: State, n = Date.now()): State {
  s = decay(s, n);
  if (stage(s) === 5 || s.care.happy >= 100) return s;
  return project(
    {
      ...s,
      lastSequence: s.lastSequence + 1,
      careEvents: [
        ...s.careEvents,
        { kind: "pat", at: n, sequence: s.lastSequence + 1 },
      ],
    },
    n,
  );
}
export function buyItem(
  s: State,
  item: ShopItem,
  n = Date.now(),
  id: string = crypto.randomUUID(),
): State {
  s = decay(s, n);
  if (s.careEvents.some((e) => "id" in e && e.id === id)) return s;
  const product = isSupply(item)
    ? SUPPLIES[item]
    : isOutfit(item)
      ? OUTFITS[item]
      : null;
  if (
    !product ||
    s.coins < product.price ||
    (isOutfit(item) && s.ownedOutfits.includes(item))
  )
    return s;
  return project(
    {
      ...s,
      lastSequence: s.lastSequence + 1,
      careEvents: [
        ...s.careEvents,
        {
          kind: "buy",
          id,
          item,
          cost: product.price,
          at: n,
          sequence: s.lastSequence + 1,
        },
      ],
    },
    n,
  );
}
export const buySupply = (
  s: State,
  item: Supply,
  n = Date.now(),
  id: string = crypto.randomUUID(),
) => buyItem(s, item, n, id);
export function equipOutfit(
  s: State,
  item: Outfit | null,
  n = Date.now(),
): State {
  s = decay(s, n);
  if (item === null) return { ...s, equipped: {} };
  if (!isOutfit(item) || !s.ownedOutfits.includes(item)) return s;
  const slot = OUTFITS[item].slot,
    equipped = { ...s.equipped };
  if (equipped[slot] === item) delete equipped[slot];
  else equipped[slot] = item;
  return { ...s, equipped };
}
export function useSupply(
  s: State,
  item: Supply,
  n = Date.now(),
  id: string = crypto.randomUUID(),
): State {
  s = decay(s, n);
  if (s.careEvents.some((e) => "id" in e && e.id === id)) return s;
  const supply = isSupply(item) ? SUPPLIES[item] : null;
  if (!supply || s.inventory[item] < 1 || stage(s) === 5) return s;
  return project(
    {
      ...s,
      lastSequence: s.lastSequence + 1,
      careEvents: [
        ...s.careEvents,
        {
          kind: "use",
          id,
          item,
          boost: supply.boost,
          morale: supply.morale,
          at: n,
          sequence: s.lastSequence + 1,
        },
      ],
    },
    n,
  );
}
export function streak(s: State, n = Date.now()) {
  const days = new Set(s.completions.map((c) => c.date));
  let day = dateKey(n);
  if (!days.has(day)) day = shiftDate(day, -1);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = shiftDate(day, -1);
  }
  return count;
}
const isDate = (x: unknown): x is string =>
  typeof x === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(x) &&
  dateKey(+localDate(x)) === x;
const careValid = (x: unknown): x is Care =>
  !!x &&
  typeof x === "object" &&
  categories.every(
    (c) =>
      Number.isFinite((x as Care)[c]) &&
      (x as Care)[c] >= 0 &&
      (x as Care)[c] <= 100,
  );
const taskValid = (t: Task) =>
  !!t &&
  typeof t.id === "string" &&
  typeof t.name === "string" &&
  typeof t.description === "string" &&
  /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time) &&
  [
    "daily",
    "weekly",
    "selected",
    "once",
    "interval",
    "afterCompletion",
  ].includes(t.repeat) &&
  Array.isArray(t.days) &&
  t.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
  isDate(t.date) &&
  categories.includes(t.category) &&
  (t.createdAt === undefined || Number.isFinite(t.createdAt)) &&
  (t.repetitions === undefined ||
    ["once", "multiple", "goal", "unlimited"].includes(t.repetitions)) &&
  (t.dailyGoal === undefined ||
    (Number.isInteger(t.dailyGoal) && t.dailyGoal >= 1 && t.dailyGoal <= 100));
function commonValid(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const s = x as State;
  return (
    typeof s.name === "string" &&
    s.name.length <= 40 &&
    ["sage", "peach", "lilac"].includes(s.color) &&
    Number.isFinite(s.created) &&
    Number.isFinite(s.updated) &&
    careValid(s.care) &&
    Array.isArray(s.tasks) &&
    s.tasks.every(taskValid) &&
    new Set(s.tasks.map((t) => t.id)).size === s.tasks.length &&
    Array.isArray(s.completions) &&
    s.completions.every(
      (c) =>
        !!c &&
        typeof c.taskId === "string" &&
        typeof c.name === "string" &&
        categories.includes(c.category) &&
        Number.isFinite(c.at) &&
        isDate(c.date),
    ) &&
    Array.isArray(s.achievements) &&
    s.achievements.every((a) => typeof a === "string") &&
    !!s.settings &&
    ["auto", "day", "night"].includes(s.settings.theme) &&
    [0.5, 1, 2].includes(s.settings.speed) &&
    ["sound", "motion", "reminders", "cozy"].every(
      (k) => typeof s.settings[k as keyof Settings] === "boolean",
    )
  );
}
function validModel(x: unknown, version: number): x is State {
  if (!commonValid(x)) return false;
  const s = x as State;
  return (
    (s.version as number) === version &&
    Number.isSafeInteger(s.lastSequence) &&
    s.lastSequence >= 0 &&
    ["mochi", "pippin", "crumb"].includes(s.pet) &&
    !!s.baseline &&
    Number.isFinite(s.baseline.at) &&
    careValid(s.baseline.care) &&
    [0.5, 1, 2].includes(s.baseline.speed) &&
    typeof s.baseline.cozy === "boolean" &&
    isDate(s.settledThrough) &&
    Array.isArray(s.careEvents) &&
    s.careEvents.every(
      (e) =>
        !!e &&
        Number.isSafeInteger(e.sequence) &&
        e.sequence > 0 &&
        e.sequence <= s.lastSequence &&
        Number.isFinite(e.at) &&
        e.at >= s.baseline.at &&
        (e.kind === "revive" ||
          (version >= 3 && e.kind === "pat") ||
          (version >= 3 &&
            ((e.kind === "buy" &&
              typeof e.id === "string" &&
              (isSupply(e.item) || isOutfit(e.item)) &&
              Number.isSafeInteger(e.cost) &&
              e.cost > 0 &&
              e.cost <= 1000) ||
              (e.kind === "use" &&
                typeof e.id === "string" &&
                isSupply(e.item) &&
                Number.isFinite(e.boost) &&
                e.boost >= 0 &&
                e.boost <= 100 &&
                Number.isFinite(e.morale) &&
                e.morale >= 0 &&
                e.morale <= 100))) ||
          (e.kind === "settings" &&
            [0.5, 1, 2].includes(e.speed) &&
            typeof e.cozy === "boolean")),
    ) &&
    Array.isArray(s.outcomes) &&
    s.outcomes.every(
      (o) =>
        !!o &&
        typeof o.taskId === "string" &&
        typeof o.name === "string" &&
        categories.includes(o.category) &&
        isDate(o.date) &&
        Number.isSafeInteger(o.sequence) &&
        o.sequence > 0 &&
        o.sequence <= s.lastSequence &&
        Number.isFinite(o.at) &&
        taskValid(o.task) &&
        o.taskId === o.task.id &&
        ["pending", "completed", "missed"].includes(o.status) &&
        typeof o.automatic === "boolean" &&
        (version === 2 ||
          (Number.isFinite(o.rewardCare) &&
            o.rewardCare >= 0 &&
            o.rewardCare <= 28 &&
            Number.isSafeInteger(o.rewardCoins) &&
            o.rewardCoins >= 0 &&
            o.rewardCoins <= 100)) &&
        (o.legacy === undefined || typeof o.legacy === "boolean") &&
        (o.legacyRetired === undefined || typeof o.legacyRetired === "boolean"),
    ) &&
    (version < 4
      ? new Set(s.outcomes.map((o) => occurrenceKey(o.taskId, o.date))).size ===
        s.outcomes.length
      : s.outcomes.every(
          (o) =>
            typeof o.id === "string" &&
            typeof o.ballId === "string" &&
            Number.isFinite(o.penalty) &&
            o.penalty >= 0 &&
            o.penalty <= 8 &&
            (o.deleted === undefined || typeof o.deleted === "boolean") &&
            (o.deleted !== true || o.status === "pending"),
        ) &&
        new Set(s.outcomes.map((o) => o.id)).size === s.outcomes.length &&
        new Set(s.outcomes.map((o) => o.ballId)).size === s.outcomes.length)
  );
}
export function validState(x: unknown): x is State {
  if (!validHabitData(x as State)) return false;
  if (!validModel(x, 4)) return false;
  const s = x as State;
  if (
    !Number.isSafeInteger(s.coins) ||
    s.coins < 0 ||
    !Number.isSafeInteger(s.debt) ||
    s.debt < 0 ||
    !s.inventory ||
    !SUPPLY_IDS.every(
      (i) => Number.isSafeInteger(s.inventory[i]) && s.inventory[i] >= 0,
    ) ||
    !Array.isArray(s.ownedOutfits) ||
    !s.ownedOutfits.every(isOutfit) ||
    new Set(s.ownedOutfits).size !== s.ownedOutfits.length ||
    !s.equipped ||
    typeof s.equipped !== "object" ||
    !Object.entries(s.equipped).every(
      ([slot, id]) =>
        isOutfit(id) &&
        OUTFITS[id].slot === slot &&
        s.ownedOutfits.includes(id),
    )
  )
    return false;
  const inventory = emptyInventory(),
    ids = new Set<string>(),
    owned = new Set<Outfit>();
  const sequences = [
    ...s.outcomes.map((o) => o.sequence),
    ...s.careEvents.map((e) => e.sequence),
  ];
  if (new Set(sequences).size !== sequences.length) return false;
  for (const e of [...s.careEvents].sort(
    (a, b) => a.at - b.at || a.sequence - b.sequence,
  )) {
    if (e.kind !== "buy" && e.kind !== "use") continue;
    if (ids.has(e.id)) return false;
    ids.add(e.id);
    if (e.kind === "buy" && isOutfit(e.item)) {
      if (owned.has(e.item)) return false;
      owned.add(e.item);
      continue;
    }
    if (!isSupply(e.item)) return false;
    inventory[e.item] += e.kind === "buy" ? 1 : -1;
    if (inventory[e.item] < 0) return false;
  }
  return true;
}
const upgradedEntry = (o: Occurrence, index: number): Occurrence => {
  const id =
    o.id ||
    JSON.stringify(["migrated", o.taskId, o.date, o.sequence || index + 1]);
  return {
    ...o,
    id,
    ballId: o.ballId || "ball:" + id,
    penalty: o.penalty ?? BALANCE.missed,
  };
};
export function parseState(x: unknown, n = Date.now()): State | null {
  if (validModel(x, 3)) {
    const old = x as State;
    return decay(
      {
        ...old,
        version: 4,
        rewardLedger: [],
        ownedOutfits: [],
        equipped: {},
        inventory: { ...emptyInventory(), ...old.inventory },
        outcomes: old.outcomes.map(upgradedEntry),
      },
      n,
    );
  }
  if (validModel(x, 2)) {
    const old = x as State;
    const upgraded: State = {
      ...old,
      version: 4,
      rewardLedger: [],
      ownedOutfits: [],
      equipped: {},
      coins: 0,
      debt: 0,
      inventory: emptyInventory(),
      outcomes: old.outcomes.map((o, i) => ({
        ...upgradedEntry(o, i),
        ...o,
        rewardCare: o.status === "completed" ? 10 : 0,
        rewardCoins: BALANCE.completedCoins,
      })),
    };
    return decay(upgraded, n);
  }
  if (validState(x)) return decay(x, n);
  if (!commonValid(x) || (x as { version: number }).version !== 1) return null;
  const old = x as Omit<State, "version"> & { version: number };
  const seed = initial(n);
  // Upgrade forward only: no new penalties for days before this feature existed.
  const tasks = old.tasks.map((t) => ({ ...t, createdAt: n }));
  const outcomes: Occurrence[] = old.completions.map((c, i) => ({
    id: JSON.stringify(["v1", c.taskId, c.date, i]),
    ballId: JSON.stringify(["v1-ball", c.taskId, c.date, i]),
    penalty: BALANCE.missed,
    sequence: i + 1,
    rewardCare: 0,
    rewardCoins: BALANCE.completedCoins,
    ...c,
    status: "completed",
    automatic: false,
    legacy: true,
    task: tasks.find((t) => t.id === c.taskId) ?? {
      id: c.taskId,
      name: c.name,
      description: "",
      category: c.category,
      time: "09:00",
      repeat: "once",
      days: [],
      date: c.date,
      createdAt: n,
    },
  }));
  const elapsed =
    Math.max(
      0,
      n - Math.max(old.updated, old.created + BALANCE.graceHours * 3600000),
    ) / 3600000;
  const care = Object.fromEntries(
    categories.map((c) => [
      c,
      clamp(
        old.care[c] - elapsed * old.settings.speed * BALANCE.rates[c],
        old.settings.cozy ? 5 : 0,
      ),
    ]),
  ) as Care;
  return project(
    {
      ...seed,
      name: old.name,
      color: old.color,
      pet: "mochi",
      created: old.created,
      tasks,
      outcomes,
      lastSequence: outcomes.length,
      achievements: old.achievements,
      settings: old.settings,
      baseline: {
        at: n,
        care,
        speed: old.settings.speed,
        cozy: old.settings.cozy,
      },
    },
    n,
  );
}
export function load(): State {
  try {
    const raw = localStorage.getItem("pocketpal-v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        !parsed.rewardLedger &&
        !localStorage.getItem("pocketpal-before-smart-habits")
      ) {
        try {
          localStorage.setItem("pocketpal-before-smart-habits", raw);
        } catch {
          /* The original save remains available on storage failure. */
        }
      }
      const s = parseState(parsed);
      if (s) {
        if (
          parsed.version < 4 &&
          !localStorage.getItem("pocketpal-before-boutique")
        ) {
          try {
            localStorage.setItem("pocketpal-before-outcomes", raw);
          } catch {
            /* Leave the original save available if storage is full. */
          }
        }
        return s;
      }
      throw Error("Invalid saved PocketPal data");
    }
  } catch {
    throw Error(
      "PocketPal could not read saved data. Your save has not been overwritten; restore a valid backup or clear the site data to start fresh.",
    );
  }
  return initial();
}
export const demoTasks = (n = Date.now()): Task[] =>
  [
    ["Drink a glass of water", "08:00", "water"],
    ["A little morning stretch", "08:30", "food"],
    ["Make your space cozy", "09:00", "clean"],
    ["Read a few pages", "19:00", "happy"],
  ].map(([name, time, category]) => ({
    id: crypto.randomUUID(),
    name,
    time,
    category: category as Category,
    description: "A small moment just for you.",
    repeat: "daily",
    days: [],
    date: dateKey(n),
    createdAt: n,
    createdDate: dateKey(n),
    careLinked: false,
  }));

export function validHabitData(s: State) {
  if (
    !s ||
    typeof s !== "object" ||
    !Array.isArray(s.tasks) ||
    !Array.isArray(s.outcomes)
  )
    return false;
  const bounded = (v: unknown, lo: number, hi: number) =>
    Number.isSafeInteger(v) && (v as number) >= lo && (v as number) <= hi;
  if (
    s.rewardPolicy &&
    (!bounded(s.rewardPolicy.coins, 0, 100) ||
      !bounded(s.rewardPolicy.dailyCap, 0, 100))
  )
    return false;
  if (
    s.rewardLedger !== undefined &&
    (!Array.isArray(s.rewardLedger) ||
      !s.rewardLedger.every(
        (e) =>
          e &&
          typeof e.id === "string" &&
          typeof e.entryId === "string" &&
          bounded(e.amount, -100, 100) &&
          e.amount !== 0 &&
          Number.isFinite(e.at) &&
          s.outcomes?.some((o) => o.id === e.entryId),
      ) ||
      new Set(s.rewardLedger.map((e) => e.id)).size !== s.rewardLedger.length)
  )
    return false;
  if (
    s.habitEvents !== undefined &&
    (!Array.isArray(s.habitEvents) ||
      !s.habitEvents.every(
        (e) =>
          e &&
          typeof e.id === "string" &&
          typeof e.taskId === "string" &&
          isDate(e.date) &&
          Number.isFinite(e.at) &&
          [
            "skip",
            "pause",
            "resume",
            "reschedule",
            "snooze",
            "step",
            "restore",
          ].includes(e.kind) &&
          (e.reason === undefined ||
            (typeof e.reason === "string" && e.reason.length <= 500)) &&
          (e.until === undefined || (isDate(e.until) && e.until >= e.date)) &&
          (e.time === undefined || /^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)) &&
          (e.kind !== "reschedule" || (!!e.until && e.until >= e.date)) &&
          (e.kind !== "step" ||
            (typeof e.stepId === "string" && typeof e.done === "boolean")),
      ) ||
      new Set(s.habitEvents.map((e) => e.id)).size !== s.habitEvents.length)
  )
    return false;
  if (
    s.focusDays &&
    (typeof s.focusDays !== "object" ||
      !Object.entries(s.focusDays).every(
        ([day, ids]) =>
          isDate(day) &&
          Array.isArray(ids) &&
          ids.length <= 3 &&
          ids.every((id) => typeof id === "string") &&
          new Set(ids).size === ids.length,
      ))
  )
    return false;
  return (
    (s.tasks || []).every(
      (t) =>
        (t.intervalDays === undefined || bounded(t.intervalDays, 1, 365)) &&
        (t.createdDate === undefined || isDate(t.createdDate)) &&
        (t.durationMinutes === undefined ||
          bounded(t.durationMinutes, 0, 1440)) &&
        (t.priority === undefined ||
          ["low", "normal", "high"].includes(t.priority)) &&
        (t.reminderEnabled === undefined ||
          typeof t.reminderEnabled === "boolean") &&
        (t.careLinked === undefined || typeof t.careLinked === "boolean") &&
        (t.rewardCap === undefined || bounded(t.rewardCap, 0, 100)) &&
        (t.steps === undefined ||
          (Array.isArray(t.steps) &&
            t.steps.length <= 30 &&
            t.steps.every(
              (step) =>
                step &&
                typeof step.id === "string" &&
                typeof step.name === "string" &&
                step.name.length <= 120,
            ) &&
            new Set(t.steps.map((step) => step.id)).size === t.steps.length)),
    ) &&
    (s.outcomes || []).every(
      (o) =>
        (o.rewardRate === undefined || bounded(o.rewardRate, 0, 100)) &&
        (o.rewardLimit === undefined || bounded(o.rewardLimit, 0, 100)),
    )
  );
}
export function changeRewardPolicy(
  s: State,
  policy: RewardPolicy,
  n = Date.now(),
): State {
  s = decay(s, n);
  if (
    ![policy.coins, policy.dailyCap].every(
      (v) => Number.isSafeInteger(v) && v >= 0 && v <= 100,
    )
  )
    return s;
  return { ...s, rewardPolicy: { ...policy } };
}
export function addHabitEvent(
  s: State,
  event: Omit<HabitEvent, "at" | "id">,
  n = Date.now(),
  id: string = crypto.randomUUID(),
): State {
  s = decay(s, n);
  if (
    !s.tasks.some((t) => t.id === event.taskId) ||
    (s.habitEvents || []).some((e) => e.id === id) ||
    event.date < dateKey(n)
  )
    return s;
  const task = s.tasks.find((t) => t.id === event.taskId)!;
  const next = {
    ...s,
    habitEvents: [
      ...(s.habitEvents || []),
      {
        ...event,
        taskName: task.name,
        ...(event.stepId
          ? {
              stepName:
                task.steps?.find((step) => step.id === event.stepId)?.name ||
                "Tiny step",
            }
          : {}),
        id,
        at: n,
      },
    ],
  };
  return validHabitData(next) ? next : s;
}
export function toggleFocus(s: State, taskId: string, date = dateKey()): State {
  const ids = s.focusDays?.[date] || [];
  const next = ids.includes(taskId)
    ? ids.filter((id) => id !== taskId)
    : ids.length < 3
      ? [...ids, taskId]
      : ids;
  return { ...s, focusDays: { ...s.focusDays, [date]: next } };
}
export function stepIsDone(
  s: State,
  taskId: string,
  stepId: string,
  date: string,
) {
  return (
    (s.habitEvents || [])
      .filter(
        (e) =>
          e.kind === "step" &&
          e.taskId === taskId &&
          e.stepId === stepId &&
          e.date === date,
      )
      .at(-1)?.done || false
  );
}
export function setStep(
  s: State,
  taskId: string,
  stepId: string,
  done: boolean,
  date = dateKey(),
  n = Date.now(),
  id: string = crypto.randomUUID(),
): State {
  s = decay(s, n);
  const task = s.tasks.find((t) => t.id === taskId);
  if (
    !task?.steps?.some((step) => step.id === stepId) ||
    !taskDue(s, task, +localDate(date)) ||
    stepIsDone(s, taskId, stepId, date) === done ||
    (s.habitEvents || []).some((e) => e.id === id)
  )
    return s;
  s = addHabitEvent(s, { kind: "step", taskId, stepId, done, date }, n, id);
  const parentId = JSON.stringify(["steps", taskId, date]);
  const parent = s.outcomes.find((o) => o.id === parentId);
  const allDone = task.steps.every((step) =>
    stepIsDone(s, taskId, step.id, date),
  );
  if (!allDone && parent && !parent.deleted)
    return correctAttempt(s, parentId, "pending", n);
  if (allDone && taskCounts(s, taskId, date).completed === 0)
    return parent
      ? correctAttempt(s, parentId, "completed", n)
      : recordAttempt(s, taskId, date, "completed", n, parentId);
  return s;
}
