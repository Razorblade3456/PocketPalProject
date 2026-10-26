export type Category = "food" | "water" | "clean" | "happy";
export type Supply = "food" | "water" | "soap";
export const SUPPLIES: Record<
  Supply,
  {
    name: string;
    price: number;
    category: Category;
    boost: number;
    morale: number;
  }
> = {
  food: { name: "Food", price: 5, category: "food", boost: 15, morale: 4 },
  water: { name: "Water", price: 4, category: "water", boost: 15, morale: 4 },
  soap: { name: "Soap", price: 6, category: "clean", boost: 15, morale: 4 },
};
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
  repeat: "daily" | "weekly" | "selected" | "once";
  days: number[];
  date: string;
  category: Category;
  createdAt?: number;
};
export type Completion = {
  taskId: string;
  name: string;
  category: Category;
  at: number;
  date: string;
};
export type Occurrence = Completion & {
  status: OutcomeStatus;
  task: Task;
  automatic: boolean;
  sequence: number;
  legacy?: boolean;
  legacyRetired?: boolean;
  rewardCare: number;
  rewardCoins: number;
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
      item: Supply;
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
export type State = {
  version: 3;
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
    version: 3,
    coins: 0,
    debt: 0,
    inventory: { food: 0, water: 0, soap: 0 },
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
export const due = (t: Task, n = Date.now()) => {
  const d = new Date(n),
    key = dateKey(n);
  return (
    key >= t.date &&
    key >= dateKey(t.createdAt ?? 0) &&
    (t.repeat === "daily" ||
      (t.repeat === "once" && t.date === key) ||
      (t.repeat === "weekly" && d.getDay() === localDate(t.date).getDay()) ||
      (t.repeat === "selected" && t.days.includes(d.getDay())))
  );
};
export const stage = (s: Pick<State, "care" | "settings">) => {
  const avg = categories.reduce((a, c) => a + s.care[c], 0) / 4;
  return avg > 70
    ? 0
    : avg > 50
      ? 1
      : avg > 30
        ? 2
        : avg > 15
          ? 3
          : avg > 0 || s.settings.cozy
            ? 4
            : 5;
};
export function outcomeFor(s: State, id: string, date: string) {
  return s.outcomes.find((o) => o.taskId === id && o.date === date);
}
/** Recompute from an immutable checkpoint. Never reverse a clamped value by subtraction. */
function project(s: State, n: number): State {
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
  const inventory: Record<Supply, number> = { food: 0, water: 0, soap: 0 };
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
        inventory[e.item]++;
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
    if (e.status === "completed") amount = e.rewardCare;
    if (e.status === "missed") {
      const ck = e.date + ":" + e.category,
        dk = e.date;
      const penalty = Math.max(
        0,
        Math.min(
          BALANCE.missed,
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
    .filter((o) => o.status === "completed")
    .map(({ taskId, name, category, at, date }) => ({
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
    planned = s.tasks.filter((t) => due(t, n));
  if (
    planned.length &&
    planned.every((t) =>
      completions.some((c) => c.taskId === t.id && c.date === day),
    )
  )
    achievements.add("Full Jar");
  if (recovered) achievements.add("Zombie Survivor");
  return {
    ...s,
    updated: Math.max(n, s.updated),
    care,
    coins: Math.max(
      0,
      s.outcomes
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + o.rewardCoins, 0) - spent,
    ),
    debt: Math.max(
      0,
      spent -
        s.outcomes
          .filter((o) => o.status === "completed")
          .reduce((sum, o) => sum + o.rewardCoins, 0),
    ),
    inventory,
    completions,
    achievements: [...achievements],
  };
}
/** Settle each local calendar day once, including DST and multi-day absences. */
export function decay(s: State, n = Date.now()): State {
  if ((s.version as number) !== 3) {
    const upgraded = parseState(s, n);
    if (!upgraded) throw Error("This save could not be upgraded safely.");
    return upgraded;
  }
  const today = dateKey(n),
    outcomes = [...s.outcomes],
    known = new Map(
      outcomes.map((o, index) => [occurrenceKey(o.taskId, o.date), index]),
    );
  let settledThrough = s.settledThrough;
  let lastSequence = s.lastSequence;
  for (
    let day = shiftDate(settledThrough, 1);
    day < today;
    day = shiftDate(day, 1)
  ) {
    for (const task of s.tasks) {
      const key = occurrenceKey(task.id, day);
      const existing = known.get(key);
      if (
        due(task, +localDate(day)) &&
        existing !== undefined &&
        outcomes[existing].status === "pending"
      ) {
        outcomes[existing] = {
          ...outcomes[existing],
          status: "missed",
          automatic: true,
          at: endOfDay(day),
          sequence: ++lastSequence,
          rewardCare: 0,
          rewardCoins: BALANCE.completedCoins,
        };
      }
      if (existing === undefined && due(task, +localDate(day))) {
        outcomes.push({
          taskId: task.id,
          name: task.name,
          category: task.category,
          at: endOfDay(day),
          date: day,
          status: "missed",
          task: { ...task, days: [...task.days] },
          automatic: true,
          sequence: ++lastSequence,
          rewardCare: 0,
          rewardCoins: BALANCE.completedCoins,
        });
        known.set(key, outcomes.length - 1);
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
    (!old && !due(task, +localDate(date))) ||
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
        rewardCoins: BALANCE.completedCoins,
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
  const next = { ...task, createdAt: old?.createdAt ?? n };
  return {
    ...s,
    tasks: old
      ? s.tasks.map((t) => (t.id === task.id ? next : t))
      : [...s.tasks, next],
  };
}
export function deleteTask(s: State, id: string, n = Date.now()): State {
  s = decay(s, n);
  return { ...s, tasks: s.tasks.filter((t) => t.id !== id) };
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
export function buySupply(s: State, item: Supply, n = Date.now()): State {
  s = decay(s, n);
  const supply = SUPPLIES[item];
  if (!supply || s.coins < supply.price) return s;
  return project(
    {
      ...s,
      lastSequence: s.lastSequence + 1,
      careEvents: [
        ...s.careEvents,
        {
          kind: "buy",
          id: crypto.randomUUID(),
          item,
          cost: supply.price,
          at: n,
          sequence: s.lastSequence + 1,
        },
      ],
    },
    n,
  );
}
export function useSupply(s: State, item: Supply, n = Date.now()): State {
  s = decay(s, n);
  const supply = SUPPLIES[item];
  if (!supply || s.inventory[item] < 1 || stage(s) === 5) return s;
  return project(
    {
      ...s,
      lastSequence: s.lastSequence + 1,
      careEvents: [
        ...s.careEvents,
        {
          kind: "use",
          id: crypto.randomUUID(),
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
  ["daily", "weekly", "selected", "once"].includes(t.repeat) &&
  Array.isArray(t.days) &&
  t.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
  isDate(t.date) &&
  categories.includes(t.category) &&
  (t.createdAt === undefined || Number.isFinite(t.createdAt));
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
          (version === 3 && e.kind === "pat") ||
          (version === 3 &&
            ((e.kind === "buy" &&
              typeof e.id === "string" &&
              (["food", "water", "soap"] as Supply[]).includes(e.item) &&
              Number.isSafeInteger(e.cost) &&
              e.cost > 0 &&
              e.cost <= 1000) ||
              (e.kind === "use" &&
                typeof e.id === "string" &&
                !!SUPPLIES[e.item] &&
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
            o.rewardCoins <= 5)) &&
        (o.legacy === undefined || typeof o.legacy === "boolean") &&
        (o.legacyRetired === undefined || typeof o.legacyRetired === "boolean"),
    ) &&
    new Set(s.outcomes.map((o) => occurrenceKey(o.taskId, o.date))).size ===
      s.outcomes.length
  );
}
export function validState(x: unknown): x is State {
  if (!validModel(x, 3)) return false;
  const s = x as State;
  if (
    !Number.isSafeInteger(s.coins) ||
    s.coins < 0 ||
    !Number.isSafeInteger(s.debt) ||
    s.debt < 0 ||
    !s.inventory ||
    !(["food", "water", "soap"] as Supply[]).every(
      (i) => Number.isSafeInteger(s.inventory[i]) && s.inventory[i] >= 0,
    )
  )
    return false;
  const inventory: Record<Supply, number> = { food: 0, water: 0, soap: 0 };
  const ids = new Set<string>();
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
    inventory[e.item] += e.kind === "buy" ? 1 : -1;
    if (inventory[e.item] < 0) return false;
  }
  return true;
}
export function parseState(x: unknown, n = Date.now()): State | null {
  if (validModel(x, 2)) {
    const old = x as State;
    const upgraded: State = {
      ...old,
      version: 3,
      coins: 0,
      debt: 0,
      inventory: { food: 0, water: 0, soap: 0 },
      outcomes: old.outcomes.map((o) => ({
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
      const s = parseState(parsed);
      if (s) {
        if (
          parsed.version < 3 &&
          !localStorage.getItem("pocketpal-before-supplies")
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
  }));
