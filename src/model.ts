export type Category = "food" | "water" | "clean" | "happy";
export type Task = {
  id: string;
  name: string;
  description: string;
  time: string;
  repeat: "daily" | "weekly" | "selected" | "once";
  days: number[];
  date: string;
  category: Category;
};
export type Completion = {
  taskId: string;
  name: string;
  category: Category;
  at: number;
  date: string;
};
export type State = {
  version: 1;
  name: string;
  color: string;
  created: number;
  updated: number;
  care: Record<Category, number>;
  tasks: Task[];
  completions: Completion[];
  achievements: string[];
  settings: {
    sound: boolean;
    motion: boolean;
    theme: "auto" | "day" | "night";
    reminders: boolean;
    speed: number;
    cozy: boolean;
  };
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
export function initial(): State {
  return {
    version: 1,
    name: "",
    color: "sage",
    created: Date.now(),
    updated: Date.now(),
    care: { food: 85, water: 85, clean: 90, happy: 90 },
    tasks: [],
    completions: [],
    achievements: [],
    settings: {
      sound: false,
      motion: true,
      theme: "auto",
      reminders: false,
      speed: 1,
      cozy: true,
    },
  };
}
export const due = (t: Task, n = Date.now()) => {
  const d = new Date(n);
  return (
    dateKey(n) >= t.date &&
    (t.repeat === "daily" ||
      (t.repeat === "once" && t.date === dateKey(n)) ||
      (t.repeat === "weekly" &&
        d.getDay() === new Date(t.date + "T12:00:00").getDay()) ||
      (t.repeat === "selected" && t.days.includes(d.getDay())))
  );
};
export function decay(s: State, n = Date.now()): State {
  const start = Math.max(s.updated, s.created + 24 * 3600000);
  const hours = Math.max(0, n - start) / 3600000;
  return {
    ...s,
    updated: Math.max(n, s.updated),
    care: Object.fromEntries(
      categories.map((c) => [
        c,
        Math.max(
          s.settings.cozy ? 5 : 0,
          s.care[c] -
            hours *
              s.settings.speed *
              (c === "water" ? 1.1 : c === "clean" ? 0.65 : 0.85),
        ),
      ]),
    ) as State["care"],
  };
}
export const stage = (s: State) => {
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
export function complete(s: State, id: string, n = Date.now()): State {
  s = decay(s, n);
  const t = s.tasks.find((t) => t.id === id);
  if (
    !t ||
    !due(t, n) ||
    stage(s) === 5 ||
    s.completions.some((c) => c.taskId === id && c.date === dateKey(n))
  )
    return s;
  const next = decay(s, n);
  const entry = {
    taskId: id,
    name: t.name,
    category: t.category,
    at: n,
    date: dateKey(n),
  };
  const completions = [...s.completions, entry];
  const achievements = new Set(s.achievements);
  achievements.add("First Meal");
  if (completions.filter((c) => c.category === "water").length >= 10)
    achievements.add("Hydration Hero");
  if (new Set(completions.map((c) => c.date)).size >= 7)
    achievements.add("Best Buddies");
  if (
    s.tasks
      .filter((t) => due(t, n))
      .every((t) =>
        completions.some((c) => c.taskId === t.id && c.date === dateKey(n)),
      )
  )
    achievements.add("Full Jar");
  if (
    stage(s) >= 3 &&
    stage({
      ...next,
      care: {
        ...next.care,
        [t.category]: Math.min(100, next.care[t.category] + 28),
      },
    }) < 3
  )
    achievements.add("Zombie Survivor");
  return {
    ...next,
    care: {
      ...next.care,
      [t.category]: Math.min(100, next.care[t.category] + 28),
      happy: Math.min(100, next.care.happy + (t.category === "happy" ? 28 : 5)),
    },
    completions,
    achievements: [...achievements],
  };
}
export function streak(s: State) {
  const days = new Set(s.completions.map((c) => c.date));
  const d = new Date();
  if (!days.has(dateKey())) d.setDate(d.getDate() - 1);
  let count = 0;
  while (days.has(dateKey(+d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
export function validState(x: unknown): x is State {
  if (!x || typeof x !== "object") return false;
  const s = x as State;
  return (
    s.version === 1 &&
    typeof s.name === "string" &&
    s.name.length <= 40 &&
    ["sage", "peach", "lilac"].includes(s.color) &&
    Number.isFinite(s.created) &&
    Number.isFinite(s.updated) &&
    !!s.care &&
    categories.every(
      (c) => Number.isFinite(s.care[c]) && s.care[c] >= 0 && s.care[c] <= 100,
    ) &&
    Array.isArray(s.tasks) &&
    s.tasks.every(
      (t) =>
        typeof t.id === "string" &&
        typeof t.name === "string" &&
        typeof t.description === "string" &&
        /^\d{2}:\d{2}$/.test(t.time) &&
        ["daily", "weekly", "selected", "once"].includes(t.repeat) &&
        Array.isArray(t.days) &&
        t.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
        categories.includes(t.category),
    ) &&
    Array.isArray(s.completions) &&
    s.completions.every(
      (c) =>
        typeof c.taskId === "string" &&
        typeof c.name === "string" &&
        categories.includes(c.category) &&
        Number.isFinite(c.at) &&
        typeof c.date === "string",
    ) &&
    Array.isArray(s.achievements) &&
    s.achievements.every((a) => typeof a === "string") &&
    !!s.settings &&
    ["auto", "day", "night"].includes(s.settings.theme) &&
    [0.5, 1, 2].includes(s.settings.speed) &&
    ["sound", "motion", "reminders", "cozy"].every(
      (k) => typeof s.settings[k as keyof State["settings"]] === "boolean",
    )
  );
}
export function load(): State {
  try {
    const raw = localStorage.getItem("pocketpal-v1");
    if (raw) {
      const s = JSON.parse(raw);
      if (validState(s)) return decay(s);
    }
  } catch {}
  return initial();
}
export const demoTasks = (): Task[] =>
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
    date: dateKey(),
  }));
