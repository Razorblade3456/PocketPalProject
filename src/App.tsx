import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import {
  Plus,
  Sun,
  Moon,
  Settings,
  Heart,
  Sparkles,
  Check,
  X,
  Pencil,
  Trash2,
  Flame,
  Volume2,
  VolumeX,
  History,
  Download,
  Upload,
  Bell,
  Leaf,
  ChevronRight,
  Trophy,
  Coins,
  Home,
  ShoppingBag,
  Shirt,
  PackageOpen,
} from "lucide-react";
import {
  SUPPLIES,
  buyItem,
  buyAndUseBasic,
  taskFinishedToday,
  recordAttempt,
  correctAttempt,
  deleteAttempt,
  taskCounts,
  goalFor,
  taskDue,
  policyFor,
  rewardLimitFor,
  reminderFor,
  categories,
  rewardKey,
  equipOutfit,
  type Outfit,
  type ShopItem,
  useSupply,
  headPat,
  petRhythm,
  occurrenceKey,
  type Supply,
  labels,
  dateKey,
  load,
  decay,
  stage,
  due,
  setOutcome,
  outcomeFor,
  saveTask,
  deleteTask,
  changeSettings,
  revive,
  parseState,
  type OutcomeStatus,
  streak,
  demoTasks,
  type State,
  type Task,
} from "./model";
import { Pet, PetChoices, LifeGuide, stages, pets } from "./Pets";
import {
  TodayThree,
  TaskMeta,
  TinySteps,
  TaskQuickActions,
  TaskAdvancedFields,
  RewardSettings,
  TaskRewardNote,
} from "./HabitTools";
import { OutcomeControls, OutcomeHistory } from "./TaskOutcomes";
import { Jar, RewardFlights, type JarFlight, type RewardSource } from "./Jar";
import { LocalClock } from "./LocalClock";
import { PetNeeds } from "./PetNeeds";
import { useImportantAlarms } from "./ImportantAlarms";
import { quietNow } from "./alarms";
import { MiniMochi } from "./MiniMochi";
import { Supplies } from "./Supplies";
import { Boutique, Wardrobe } from "./Boutique";
import { Inventory, type IncomingFood } from "./Inventory";
import { favorites, itemName } from "./catalog";
function tone(enabled: boolean, kind = 0) {
  if (!enabled) return;
  try {
    const ctx = new AudioContext();
    [0, 0.09, 0.18].slice(0, kind === 1 ? 3 : 2).forEach((delay, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = [523, 659, 784][i] + kind * 30;
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.045, ctx.currentTime + delay + 0.015);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + 0.25,
      );
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.3);
    });
    setTimeout(() => void ctx.close(), 700);
  } catch {}
}
export default function App() {
  const [s, setS] = useState<State>(load);
  const [panel, setPanel] = useState<
    | "settings"
    | "history"
    | "rewards"
    | "tasks"
    | "onboard"
    | "health"
    | "shop"
    | "wardrobe"
    | null
  >(() => (s.name ? null : "onboard"));
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [incoming, setIncoming] = useState<IncomingFood | null>(null);
  const [feeding, setFeeding] = useState<Supply | null>(null);
  const [feedToken, setFeedToken] = useState(0);
  const petRef = useRef<HTMLButtonElement>(null);
  const actionLocks = useRef(new Map<string, number>());
  const [edit, setEdit] = useState<Task | null | undefined>();
  const [message, setMessage] = useState("");
  const [reaction, setReaction] = useState("");
  const [flights, setFlights] = useState<JarFlight[]>([]);
  const [landed, setLanded] = useState<string>();
  const [jarPulse, setJarPulse] = useState(0);
  const jarRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());
  const importantAlarms = useImportantAlarms(s, setS, now);
  const [storageError, setStorageError] = useState(false);
  const reminded = useRef(new Set<string>());
  const file = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [draftName, setDraftName] = useState(s.name || "Mochi");
  const [demo, setDemo] = useState(true);
  const today = dateKey(now),
    level = stage(s),
    night =
      s.settings.theme === "night" ||
      (s.settings.theme === "auto" &&
        (new Date(now).getHours() < 7 || new Date(now).getHours() >= 19));
  const rhythm = petRhythm(now);
  const todayTasks = s.tasks.filter((t) => taskDue(s, t, now));
  const finishedTasks = todayTasks.filter((t) =>
    taskFinishedToday(s, t, today),
  );
  const activeTasks = todayTasks.filter((t) => !taskFinishedToday(s, t, today));
  const earned = s.completions.filter((c) => c.date === today);
  const dailyTarget = todayTasks.reduce((sum, t) => sum + goalFor(t), 0);
  const done = todayTasks.reduce(
    (sum, t) =>
      sum + Math.min(goalFor(t), taskCounts(s, t.id, today).completed),
    0,
  );
  const percent = dailyTarget
    ? Math.round(
        (todayTasks.reduce(
          (sum, t) =>
            sum + Math.min(goalFor(t), taskCounts(s, t.id, today).completed),
          0,
        ) /
          dailyTarget) *
          100,
      )
    : earned.length
      ? 100
      : 0;
  useEffect(() => {
    try {
      localStorage.setItem("pocketpal-v1", JSON.stringify(s));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [s]);
  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      setS((v) => decay(v));
    };
    const i = setInterval(tick, 30000);
    let lastDay = dateKey(),
      offset = new Date().getTimezoneOffset(),
      minute = Math.floor(Date.now() / 60000);
    const calendarWatch = setInterval(() => {
      const nextDay = dateKey(),
        nextOffset = new Date().getTimezoneOffset();
      const nextMinute = Math.floor(Date.now() / 60000);
      if (
        nextDay !== lastDay ||
        nextOffset !== offset ||
        nextMinute !== minute
      ) {
        lastDay = nextDay;
        offset = nextOffset;
        minute = nextMinute;
        tick();
      }
    }, 1000);
    window.addEventListener("focus", tick);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(i);
      clearInterval(calendarWatch);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  useEffect(() => {
    if (!s.settings.reminders || !s.name || quietNow(s.settings, now)) return;
    const d = new Date(now),
      time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    todayTasks
      .filter(
        (t) =>
          t.reminderEnabled !== false &&
          !t.importantAlarm &&
          reminderFor(s, t, today) <= time &&
          taskCounts(s, t.id, today).completed < (goalFor(t) || 1),
      )
      .forEach((t) => {
        const key = t.id + today + reminderFor(s, t, today);
        if (reminded.current.has(key)) return;
        reminded.current.add(key);
        setMessage(`A gentle nudge: ${t.name}`);
        if ("Notification" in window && Notification.permission === "granted")
          new Notification("A little moment for you", { body: t.name });
      });
  }, [now, s.settings, s.name, today, s.tasks, s.outcomes]);
  useEffect(() => {
    if (panel || edit !== undefined) {
      dialog.current?.showModal();
      if (dialog.current) dialog.current.scrollTop = 0;
    } else dialog.current?.close();
  }, [panel, edit]);
  useEffect(() => {
    if (!message) return;
    const i = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(i);
  }, [message]);
  useEffect(() => {
    if (!reaction) return;
    const i = setTimeout(() => setReaction(""), 1800);
    return () => clearTimeout(i);
  }, [reaction]);
  const setting = <K extends keyof State["settings"]>(
    k: K,
    v: State["settings"][K],
  ) => setS((p) => changeSettings(p, { [k]: v }));
  const close = () => {
    setPanel(null);
    setEdit(undefined);
  };
  const openShop = () => {
    setInventoryOpen(false);
    setIncoming(null);
    setPanel("shop");
  };
  const openPantry = () => {
    setPanel(null);
    setEdit(undefined);
    setInventoryOpen(true);
    requestAnimationFrame(() => {
      const r = petRef.current?.getBoundingClientRect();
      if (
        r &&
        (window.innerWidth < 800 || r.top < 70 || r.bottom > window.innerHeight)
      )
        petRef.current?.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
    });
  };
  const reward = (
    t: Task,
    status: "completed" | "missed",
    date = dateKey(),
    source?: RewardSource,
  ) => {
    const at = Date.now(),
      lock = "task:" + t.id;
    if (at - (actionLocks.current.get(lock) || 0) < 120) return;
    actionLocks.current.set(lock, at);
    setNow(at);
    const id = crypto.randomUUID(),
      next = recordAttempt(s, t.id, date, status, at, id);
    const entry = next.outcomes.find((o) => o.id === id);
    if (!entry) return;
    setS((p) => recordAttempt(p, t.id, date, status, at, id));
    if (
      status === "completed" &&
      entry.rewardCoins > 0 &&
      date === today &&
      !panel
    )
      setFlights((prev) => [
        ...prev,
        {
          key: entry.ballId,
          token: id,
          category: entry.category,
          source: source || {
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          },
        },
      ]);
    const difference = Math.max(
      0,
      Math.round((s.care[entry.category] - next.care[entry.category]) * 10) /
        10,
    );
    setReaction(
      status === "completed"
        ? entry.rewardCoins
          ? `+${entry.rewardCoins} coins · another little win!`
          : "Another little win · tracked!"
        : "−" + difference + " " + labels[entry.category],
    );
    tone(s.settings.sound, status === "completed" ? 1 : -3);
    setMessage(
      status === "completed"
        ? next.debt
          ? `+${entry.rewardCoins} coins earned · ` +
            next.debt +
            " still reserved from future wins."
          : entry.rewardCoins
            ? `+${entry.rewardCoins} coins · Every little moment counts.`
            : "Completion tracked · today’s reward cap is reached. Every moment still counts."
        : difference
          ? "−" +
            difference +
            " " +
            labels[entry.category] +
            " · A missed attempt, a fresh next step."
          : "Missed attempt recorded. Your daily care cushion softened the damage.",
    );
  };
  const correct = (id: string, status: OutcomeStatus) => {
    setS((p) => correctAttempt(p, id, status));
    setMessage(
      "That entry has been corrected. Its date stays the same; care, coins and jar rewards are recalculated.",
    );
  };
  const removeEntry = (id: string) => {
    setS((p) => deleteAttempt(p, id));
    setMessage(
      "Just that entry was removed. Bought items stay yours; any coin shortfall is reserved from future wins.",
    );
  };
  const land = (flight: JarFlight) => {
    setFlights((prev) => prev.filter((f) => f.token !== flight.token));
    setLanded(flight.key);
    setJarPulse((p) => p + 1);
    tone(s.settings.sound, 0);
  };
  useEffect(() => {
    setFlights((prev) => {
      const next = prev.filter((f) =>
        s.outcomes.some(
          (o) =>
            rewardKey(o) === f.key && o.status === "completed" && !o.deleted,
        ),
      );
      return next.length === prev.length ? prev : next;
    });
  }, [s.outcomes]);
  const purchase = (item: ShopItem) => {
    const at = Date.now(),
      lock = "buy:" + item;
    if (at - (actionLocks.current.get(lock) || 0) < 350) return;
    actionLocks.current.set(lock, at);
    const id = crypto.randomUUID(),
      next = buyItem(s, item, at, id);
    if (next.careEvents.length === s.careEvents.length) {
      setMessage(
        "Save up a few more little wins, or find this outfit in your wardrobe.",
      );
      return;
    }
    setS((p) => buyItem(p, item, at, id));
    tone(s.settings.sound, 0);
    setMessage(itemName(item) + " is yours. Find it in your inventory.");
  };
  const pat = () => {
    if (level === 5) return;
    const next = headPat(s);
    const gain = Math.max(
      0,
      Math.round((next.care.happy - s.care.happy) * 10) / 10,
    );
    setS((p) => headPat(p));
    setFeeding(null);
    setReaction(
      `♥ ${s.pet === "pippin" ? "Hehe!" : s.pet === "crumb" ? "Again!" : "YIPPEE!"} ${gain ? `+${gain} happiness` : "Happy as can be!"}`,
    );
    tone(s.settings.sound, 2);
  };
  useEffect(() => {
    if (!feeding) return;
    const timer = setTimeout(() => setFeeding(null), 1500);
    return () => clearTimeout(timer);
  }, [feedToken]);
  useEffect(() => {
    if (!inventoryOpen) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setInventoryOpen(false);
        setIncoming(null);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [inventoryOpen]);
  const careFor = (item: Supply, purchaseApproved = false): boolean => {
    const at = Date.now(),
      lock = "use:" + item;
    if (at - (actionLocks.current.get(lock) || 0) < 350) return false;
    actionLocks.current.set(lock, at);
    const id = crypto.randomUUID();
    const applyCare = (state: State) =>
      purchaseApproved &&
      (item === "food" || item === "water" || item === "soap")
        ? buyAndUseBasic(state, item, at, id)
        : useSupply(state, item, at, id);
    const next = applyCare(s);
    if (next.careEvents.length === s.careEvents.length) {
      setMessage(
        level === 5
          ? "Revive your pal before feeding."
          : "Your pantry needs a refill first.",
      );
      return false;
    }
    setS(applyCare);
    const v = SUPPLIES[item],
      gain = Math.max(
        0,
        Math.round((next.care[v.category] - s.care[v.category]) * 10) / 10,
      );
    const favorite = (favorites[s.pet] as readonly Supply[]).includes(item);
    setFeeding(item);
    setFeedToken((t) => t + 1);
    setReaction(
      (v.category === "clean"
        ? s.pet === "pippin"
          ? "Ooh, bubbles! "
          : s.pet === "crumb"
            ? "All clean! "
            : "Squeaky clean! "
        : v.category === "water"
          ? favorite
            ? "My favorite sip! "
            : s.pet === "crumb"
              ? "Glug glug! "
              : "Ahhh, refreshing! "
          : favorite
            ? "My favorite! "
            : s.pet === "pippin"
              ? "So tasty! "
              : s.pet === "crumb"
                ? "More please! "
                : "YUM! ") +
        "+" +
        gain +
        " " +
        labels[v.category],
    );
    tone(s.settings.sound, 1);
    setMessage(
      (v.category === "clean"
        ? "Bath finished"
        : v.category === "water"
          ? "Drink finished"
          : v.name + " enjoyed") +
        " · +" +
        gain +
        " " +
        labels[v.category] +
        " and +" +
        Math.max(0, Math.round(next.care.happy - s.care.happy)) +
        " happiness.",
    );
    return true;
  };
  const renderTask = (t: Task) => {
    const counts = taskCounts(s, t.id, today),
      status = counts.completed
        ? "completed"
        : counts.missed
          ? "missed"
          : "pending";
    return (
      <motion.article
        layout
        className={`task-card outcome-card ${status} ${s.focusDays?.[today]?.includes(t.id) ? "focus-task" : ""}`}
        key={t.id}
      >
        <div className="task-content">
          <h3>{t.name}</h3>
          <TaskMeta s={s} task={t} today={today} setS={setS} />
          <div>
            <time hidden={t.reminderEnabled === false}>
              {new Date(`2000-01-01T${t.time}`).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </div>
          {t.description && (
            <span className="task-description">{t.description}</span>
          )}
        </div>
        <OutcomeControls
          counts={counts}
          missPenalty={t.careLinked === false ? 0 : 8}
          goal={goalFor(t)}
          rewardCoins={
            counts.completed < rewardLimitFor(s, t) ? policyFor(s).coins : 0
          }
          canUndo={!!counts.latest}
          onUndo={() => {
            if (counts.latest) removeEntry(counts.latest.id);
          }}
          name={t.name}
          onChange={(status, source) => reward(t, status, dateKey(), source)}
        />
        <div className="habit-card-tools">
          <TaskRewardNote s={s} task={t} today={today} />
          <TinySteps s={s} task={t} today={today} setS={setS} />
          <TaskQuickActions s={s} task={t} today={today} setS={setS} />
        </div>
        <button
          className="edit-button"
          aria-label={`Edit ${t.name}`}
          onClick={() => setEdit(t)}
        >
          <Pencil size={14} />
        </button>
      </motion.article>
    );
  };
  return (
    <MotionConfig reducedMotion={s.settings.motion ? "user" : "always"}>
      <div
        className={`app ${night ? "night" : ""} ${!s.settings.motion ? "still" : ""}`}
      >
        <header>
          <a className="brand" href="#">
            <span className="brand-mark">
              <Leaf size={22} />
            </span>
            PocketPal<span className="brand-dot">✦</span>
          </a>
          <nav>
            <a
              className="wallet"
              href="#supplies"
              aria-label={
                "Wallet: " +
                s.coins +
                " coins" +
                (s.debt ? ", " + s.debt + " reserved from future rewards" : "")
              }
              title="Complete little things to earn coins for care supplies"
            >
              <Coins size={16} />
              <b>{s.coins}</b>
              <span>coins</span>
              {s.debt > 0 && <small>{s.debt} reserved</small>}
            </a>
            <button
              className="icon-button"
              aria-label="Toggle day or night"
              onClick={() => setting("theme", night ? "day" : "night")}
            >
              {night ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button
              className="icon-button"
              aria-label="Settings"
              onClick={() => setPanel("settings")}
            >
              <Settings size={20} />
            </button>
          </nav>
        </header>
        <nav className="game-nav" aria-label="PocketPal pages">
          <button
            aria-pressed={!panel && !inventoryOpen}
            onClick={() => {
              close();
              setInventoryOpen(false);
              setIncoming(null);
            }}
          >
            <Home size={14} />
            Home
          </button>
          <button aria-pressed={panel === "shop"} onClick={openShop}>
            <ShoppingBag size={14} />
            Shop
          </button>
          <button
            aria-pressed={panel === "wardrobe"}
            onClick={() => {
              setInventoryOpen(false);
              setPanel("wardrobe");
            }}
          >
            <Shirt size={14} />
            Wardrobe
          </button>
          <button
            aria-pressed={inventoryOpen}
            onClick={() =>
              inventoryOpen
                ? (setInventoryOpen(false), setIncoming(null))
                : openPantry()
            }
          >
            <PackageOpen size={14} />
            Inventory
          </button>
        </nav>
        <main>
          <div className="intro">
            <div>
              <span className="eyebrow">
                SMALL WINS. STRANGE LITTLE FRIENDS.
              </span>
              <h1>
                A little care, <em>every day.</em>
              </h1>
              <p>
                Small steps for you. A happy little life for{" "}
                {s.name || "your pal"}.
              </p>
            </div>
            <div className="today-summary">
              <LocalClock />
              <span className="streak">
                <Flame size={20} />
                <b>{streak(s)}</b> day streak
                <span>Every day is a fresh start</span>
              </span>
            </div>
          </div>
          <TodayThree
            s={s}
            today={today}
            setS={setS}
            onComplete={(t) => reward(t, "completed")}
          />
          <div className="game-layout">
            <section className="task-panel">
              <div className="section-heading">
                <h2>
                  Today's little things <span>✦</span>
                </h2>
                <span className="count">
                  {done}/{dailyTarget || "∞"}
                </span>
              </div>
              <p className="section-note">
                Little wins earn coins. Use supplies for care.
              </p>

              <div className="task-list">
                {todayTasks.length === 0 ? (
                  <div className="empty">
                    <Leaf />
                    <h3>A little room to grow</h3>
                    <p>
                      Add one small thing you'd like to do for yourself today.
                    </p>
                  </div>
                ) : (
                  activeTasks.map(renderTask)
                )}
              </div>
              {finishedTasks.length > 0 && (
                <details className="finished-today">
                  <summary>
                    Finished Today <span>{finishedTasks.length}</span>
                    <ChevronRight size={13} />
                  </summary>
                  <div className="task-list">
                    {finishedTasks.map(renderTask)}
                  </div>
                </details>
              )}
              <button className="add-task" onClick={() => setEdit(null)}>
                <Plus size={18} /> Add a little thing
              </button>
              <button
                className="manage-tasks"
                onClick={() => setPanel("tasks")}
              >
                Manage all {s.tasks.length} tasks <ChevronRight size={12} />
              </button>
              <div className="paper-note">
                <span>✧</span>
                <p>
                  You don't have to do it all.
                  <br />
                  <b>Just a little is lovely.</b>
                </p>
              </div>
            </section>
            <section className="room-panel" aria-label="Your pet's cozy room">
              <div className="room-top">
                <span className="room-label">
                  <span />
                  {night ? "AFTER HOURS" : "YOUR LITTLE HIDEOUT"}
                </span>
                <span className="room-spark">✧</span>
              </div>
              <div className="room">
                <div className="wall-lines" />
                <div className="window">
                  <div className="sky-orb" />
                  {night && (
                    <span className="stars">
                      ✦ · ✧<br /> · ✦
                    </span>
                  )}
                  <div className="window-cross" />
                </div>
                <div className="wall-art">
                  <Heart size={22} />
                  <span>SOFT / LOUD</span>
                </div>
                <div className="plant">
                  <span>♣</span>
                  <i />
                </div>
                <div className="floor" />
                <div className="rug" />
                <div className="bed">
                  <span>☁</span>
                </div>
                <Pet
                  level={level}
                  kind={s.pet}
                  care={s.care}
                  petRef={petRef}
                  equipped={s.equipped}
                  incoming={incoming}
                  feeding={feeding}
                  sleep={rhythm.sleeping && level < 3}
                  calm={rhythm.calm}
                  reaction={reaction}
                  onPet={pat}
                />
                <div className="bowl food-bowl">•••</div>
                <div className="bowl water-bowl">≈</div>
                <span className="toy">✦</span>
                <AnimatePresence>
                  {reaction && (
                    <motion.div
                      key={reaction}
                      className="reward-fly"
                      initial={{ x: -150, y: 30, opacity: 0 }}
                      animate={{ x: 0, y: -130, opacity: [0, 1, 0] }}
                      exit={{ opacity: 0 }}
                    >
                      {reaction.split(" ")[0]}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="pet-caption">
                <h2>
                  {s.name || "Your little pal"} <Heart size={17} />
                </h2>
                <span>
                  <i className={`status-dot stage-dot-${level}`} />
                  {rhythm.sleeping && level < 3
                    ? "Dreaming of little adventures"
                    : rhythm.calm && level < 2
                      ? "Winding down for the evening"
                      : stages[level]}
                </span>
              </div>
              <MiniMochi
                s={s}
                level={level}
                sleep={rhythm.sleeping && level < 3}
                calm={rhythm.calm}
              />
              <PetNeeds
                s={s}
                onUse={careFor}
                onBuyAndUse={(item) => careFor(item, true)}
                onPat={pat}
                onSupplies={() =>
                  document.getElementById("supplies")?.scrollIntoView({
                    behavior:
                      s.settings.motion &&
                      !window.matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                        ? "smooth"
                        : "instant",
                    block: "center",
                  })
                }
              />
              {level === 5 && (
                <div className="revive">
                  <p>Your little friend has run out of energy.</p>
                  <button
                    className="primary"
                    onClick={() => {
                      setS((p) => revive(p));
                      setReaction("♥ hello again!");
                    }}
                  >
                    Revive pet
                  </button>
                </div>
              )}
              <button
                className="life-guide-button"
                onClick={() => setPanel("health")}
              >
                <Heart size={13} /> Pet health & life stages{" "}
                <ChevronRight size={13} />
              </button>
              <div className="room-footer">
                <Sparkles size={14} />{" "}
                {s.settings.cozy
                  ? "Cozy mode · a gentle place to grow"
                  : "A little care goes a long way"}
              </div>
            </section>
            <section className="progress-panel">
              <div className="section-heading">
                <h2>Your jar of joy</h2>
                <span>✧</span>
              </div>
              <p className="section-note">Little wins, all adding up.</p>
              <button
                className="jar-button"
                onClick={() => setPanel("rewards")}
                aria-label="Inspect today's earned rewards"
              >
                <Jar
                  balls={earned}
                  jarRef={jarRef}
                  incoming={flights.map((f) => f.key)}
                  landed={landed}
                  pulse={jarPulse}
                />
              </button>
              <div className="jar-progress">
                <strong>{earned.length}</strong>
                <p>rewarded little wins</p>
                <div className="progress-track">
                  <span style={{ width: percent + "%" }} />
                </div>
                <span>{percent}% of today's little things</span>
              </div>
              <button
                className="history-button"
                onClick={() => setPanel("history")}
              >
                <History size={16} /> Your little history{" "}
                <ChevronRight size={16} />
              </button>
              <div className="jar-legend">
                <span>
                  <Coins size={13} /> Rewarded little wins earn{" "}
                  {policyFor(s).coins} coins
                </span>
              </div>
              <Supplies
                s={s}
                onBuy={purchase}
                onUse={careFor}
                onShop={openShop}
                onInventory={openPantry}
              />
            </section>
          </div>
          <footer>
            <span>Made of small moments & a little magic.</span>
            <button
              onClick={() => {
                setting("sound", !s.settings.sound);
                tone(!s.settings.sound);
              }}
            >
              {s.settings.sound ? <Volume2 size={15} /> : <VolumeX size={15} />}{" "}
              Sound {s.settings.sound ? "on" : "off"}
            </button>
          </footer>
        </main>
        {storageError && (
          <div role="alert" className="storage-warning">
            Storage is full or unavailable. Export a backup in settings before
            closing.
          </div>
        )}
        <RewardFlights
          flights={flights}
          jar={jarRef.current}
          onLand={land}
          enabled={s.settings.motion}
        />
        <AnimatePresence>
          {message && (
            <motion.div
              role="status"
              className="toast"
              style={{ x: "-50%" }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Sparkles size={18} />
              {message}
              <button aria-label="Dismiss" onClick={() => setMessage("")}>
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {inventoryOpen && (
          <Inventory
            s={s}
            petRef={petRef}
            onClose={() => {
              setInventoryOpen(false);
              setIncoming(null);
            }}
            onShop={openShop}
            onFeed={careFor}
            onEquip={(item) => setS((p) => equipOutfit(p, item))}
            onApproach={setIncoming}
          />
        )}
        <dialog
          className={
            panel === "shop" || panel === "wardrobe" || panel === "health"
              ? "boutique-dialog"
              : ""
          }
          ref={dialog}
          onCancel={(e) => {
            if (panel === "onboard") {
              e.preventDefault();
              return;
            }
            close();
          }}
        >
          <div className="modal">
            <button
              className="modal-close icon-button"
              aria-label="Close dialog"
              onClick={close}
              disabled={panel === "onboard"}
            >
              <X size={20} />
            </button>
            {edit !== undefined ? (
              <TaskEditor
                task={edit}
                onSave={(t) => {
                  setS((p) => saveTask(p, t));
                  close();
                  tone(s.settings.sound);
                }}
                onDelete={
                  edit
                    ? () => {
                        setS((p) => deleteTask(p, edit.id));
                        close();
                      }
                    : undefined
                }
              />
            ) : panel === "onboard" ? (
              <>
                <span className="eyebrow">A SMALL FRIEND. A FRESH START.</span>
                <h2>Someone little is waiting.</h2>
                <p>Take care of yourself, and your pal grows with you.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setS((p) => ({
                      ...p,
                      name: draftName.trim() || "Mochi",
                      tasks: demo ? demoTasks() : [],
                    }));
                    close();
                    if (!demo) setEdit(null);
                  }}
                >
                  <label>
                    Your pal's name
                    <input
                      required
                      maxLength={40}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                    />
                  </label>
                  <PetChoices
                    value={s.pet}
                    onChange={(pet) => {
                      setS((p) => ({ ...p, pet }));
                      if (Object.values(pets).some((p) => p.name === draftName))
                        setDraftName(pets[pet].name);
                    }}
                  />
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={demo}
                      onChange={(e) => setDemo(e.target.checked)}
                    />{" "}
                    Start with four gentle example tasks
                  </label>
                  <p className="fine">
                    Your first day is decay-free. Cozy mode starts on, so your
                    friend can always recover. Everything stays in this browser.
                  </p>
                  <button className="primary">
                    Meet my little pal <Heart size={16} />
                  </button>
                </form>
              </>
            ) : panel === "settings" ? (
              <>
                <span className="eyebrow">MAKE YOURSELF AT HOME</span>
                <h2>The little details</h2>
                <label>
                  Pet name
                  <input
                    maxLength={40}
                    value={s.name}
                    onChange={(e) =>
                      setS((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </label>
                <PetChoices
                  value={s.pet}
                  onChange={(pet) => setS((p) => ({ ...p, pet }))}
                />
                {(["sound", "motion", "cozy", "reminders"] as const).map(
                  (k) => (
                    <label className="toggle" key={k}>
                      <input
                        type="checkbox"
                        checked={s.settings[k]}
                        onChange={(e) => {
                          setting(k, e.target.checked);
                          if (
                            k === "reminders" &&
                            e.target.checked &&
                            "Notification" in window &&
                            Notification.permission === "default"
                          )
                            void Notification.requestPermission().then((p) =>
                              setMessage(
                                p === "granted"
                                  ? "Browser reminders enabled."
                                  : "In-app reminders enabled.",
                              ),
                            );
                        }}
                      />
                      {
                        {
                          sound: "Soft sound effects",
                          motion: "Playful animations",
                          cozy: "Cozy mode (your pal can always recover)",
                          reminders: "Gentle reminders",
                        }[k]
                      }
                    </label>
                  ),
                )}
                <p className="fine">
                  <Bell size={13} /> Reminders work while the app is open.
                  Browser notifications require permission and may not arrive
                  when the app is closed.
                </p>
                <label>
                  Day & night
                  <select
                    value={s.settings.theme}
                    onChange={(e) =>
                      setting(
                        "theme",
                        e.target.value as State["settings"]["theme"],
                      )
                    }
                  >
                    <option value="auto">Follow local time (7am–7pm)</option>
                    <option value="day">Always sunshine</option>
                    <option value="night">Always moonlight</option>
                  </select>
                </label>
                <label>
                  Care decay
                  <select
                    value={s.settings.speed}
                    onChange={(e) => {
                      setting("speed", Number(e.target.value));
                    }}
                  >
                    <option value={0.5}>Extra gentle · about a week</option>
                    <option value={1}>Gentle · about four days</option>
                    <option value={2}>Lively · about two days</option>
                  </select>
                </label>
                <p className="fine">
                  Sleep follows your local clock: 9pm–6am. Theme changes only
                  the room lighting. Time estimates start from full care after
                  the first-day grace period. Tasks earn coins; using supplies
                  restores care. Petting gives affection, without replacing your
                  habits.
                </p>
                {importantAlarms.settings}
                <RewardSettings s={s} setS={setS} />
                <div className="button-row">
                  <button
                    className="secondary"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(s, null, 2)], {
                          type: "application/json",
                        }),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `pocketpal-${today}.json`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <Download size={16} /> Export backup
                  </button>
                  <button
                    className="secondary"
                    onClick={() => file.current?.click()}
                  >
                    <Upload size={16} /> Import backup
                  </button>
                </div>
                <input
                  ref={file}
                  hidden
                  type="file"
                  accept="application/json"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      if (f.size > 10000000) throw Error();
                      const data = JSON.parse(await f.text());
                      const restored = parseState(data);
                      if (!restored) throw Error();
                      if (
                        window.confirm(
                          "Replace this browser’s PocketPal data with this backup?",
                        )
                      ) {
                        setS(restored);
                        setMessage("Your little world has been restored.");
                      }
                    } catch {
                      setMessage(
                        "That backup could not be read. Your current data is safe.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </>
            ) : panel === "tasks" ? (
              <>
                <span className="eyebrow">YOUR LITTLE ROUTINES</span>
                <h2>All your little things</h2>
                {s.tasks.map((t) => (
                  <div className="managed-habit" key={t.id}>
                    <div className="reward-entry">
                      <span>
                        {t.name}
                        <small>
                          {t.repeat} · {t.date} ·{" "}
                          {t.reminderEnabled === false ? "no reminder" : t.time}
                        </small>
                      </span>
                      <button
                        className="icon-button"
                        aria-label={"Edit " + t.name}
                        onClick={() => {
                          setPanel(null);
                          setEdit(t);
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                    <TaskQuickActions
                      s={s}
                      task={t}
                      today={today}
                      setS={setS}
                    />
                  </div>
                ))}
                {!s.tasks.length && (
                  <p>Add your first little thing to begin.</p>
                )}
                <button
                  className="primary"
                  onClick={() => {
                    setPanel(null);
                    setEdit(null);
                  }}
                >
                  <Plus size={16} /> Add a little thing
                </button>
              </>
            ) : panel === "shop" ? (
              <Boutique
                s={s}
                onBuy={purchase}
                onInventory={openPantry}
                onWardrobe={() => setPanel("wardrobe")}
              />
            ) : panel === "wardrobe" ? (
              <Wardrobe
                s={s}
                onEquip={(item) => setS((p) => equipOutfit(p, item))}
                onShop={() => setPanel("shop")}
              />
            ) : panel === "health" ? (
              <LifeGuide
                kind={s.pet}
                actual={level}
                realCare={s.care}
                equipped={s.equipped}
              />
            ) : panel === "history" ? (
              <>
                <span className="eyebrow">A COLLECTION OF GOOD DAYS</span>
                <h2>Your little history</h2>
                <div className="achievement-list">
                  {[
                    "First Meal",
                    "Hydration Hero",
                    "Best Buddies",
                    "Full Jar",
                    "Zombie Survivor",
                  ].map((a) => (
                    <div
                      className={s.achievements.includes(a) ? "unlocked" : ""}
                      key={a}
                    >
                      <Trophy size={18} />
                      <span>
                        {a}
                        <small>
                          {
                            {
                              "First Meal": "Complete your first task",
                              "Hydration Hero": "Complete 10 water tasks",
                              "Best Buddies": "Participate on 7 different days",
                              "Full Jar": "Complete all planned tasks in a day",
                              "Zombie Survivor":
                                "Recover from a zombie or critical stage",
                            }[a]
                          }
                        </small>
                      </span>
                      {s.achievements.includes(a) && <Check size={16} />}
                    </div>
                  ))}
                </div>
                <OutcomeHistory
                  s={s}
                  onCorrect={correct}
                  onDelete={removeEntry}
                />
                <h3>Your past jars</h3>
                <div className="history-grid">
                  {[...new Set(s.outcomes.map((c) => c.date))]
                    .sort()
                    .reverse()
                    .map((d) => (
                      <div key={d}>
                        <Jar
                          small
                          balls={s.completions.filter((c) => c.date === d)}
                        />
                        <b>
                          {new Date(d + "T12:00:00").toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </b>
                        <span>
                          {s.completions.filter((c) => c.date === d).length}{" "}
                          little wins
                        </span>
                      </div>
                    ))}
                </div>
                {!s.outcomes.length && (
                  <p>Your first little win will find a home here.</p>
                )}
              </>
            ) : (
              <>
                <span className="eyebrow">EVERY LITTLE THING COUNTS</span>
                <h2>Today's jar of joy</h2>
                {earned.length ? (
                  earned.map((c) => {
                    return (
                      <div className="reward-entry" key={rewardKey(c)}>
                        <span className="category-tag">
                          <Coins size={18} />
                        </span>
                        <span>
                          {c.name}
                          <small>
                            {new Date(c.at).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </small>
                        </span>
                        <Check size={16} />
                      </div>
                    );
                  })
                ) : (
                  <p>
                    Your jar is ready for its first little win. Complete a task
                    to add a colorful felt ball.
                  </p>
                )}
              </>
            )}
          </div>
          {(panel || edit !== undefined) && importantAlarms.popup}
        </dialog>
        {!panel && edit === undefined && importantAlarms.popup}
      </div>
    </MotionConfig>
  );
}
function TaskEditor({
  task,
  onSave,
  onDelete,
}: {
  task: Task | null;
  onSave: (t: Task) => void;
  onDelete?: () => void;
}) {
  const [t, setT] = useState<Task>(
    task || {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      time: "09:00",
      repeat: "daily",
      days: [1, 2, 3, 4, 5],
      date: dateKey(),
      category: "happy",
      careLinked: false,
      repetitions: "once",
      dailyGoal: 1,
    },
  );
  const update = (p: Partial<Task>) => setT((v) => ({ ...v, ...p }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (t.repeat === "selected" && !t.days.length) return;
        onSave({
          ...t,
          name: t.name.trim(),
          steps: t.steps
            ?.filter((step) => step.name.trim())
            .map((step) => ({ ...step, name: step.name.trim() })),
        });
      }}
    >
      <span className="eyebrow">SMALL STEPS, HAPPY HEARTS</span>
      <h2>{task ? "Edit a little thing" : "A new little thing"}</h2>
      <label>
        What will you do?
        <input
          autoFocus
          required
          maxLength={100}
          value={t.name}
          placeholder="e.g. Drink a glass of water"
          onChange={(e) => {
            const name = e.target.value;
            update({ name });
          }}
        />
      </label>
      <label>
        A little note (optional)
        <textarea
          maxLength={300}
          value={t.description}
          onChange={(e) => update({ description: e.target.value })}
        />
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={!!t.importantAlarm}
          onChange={(e) =>
            update({
              importantAlarm: e.target.checked,
              ...(e.target.checked
                ? { reminderEnabled: true, alarmEnabledAt: Date.now() }
                : {}),
            })
          }
        />
        Important Alarm 🔔
      </label>
      {t.importantAlarm && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={!!t.alarmOverrideQuiet}
            onChange={(e) => update({ alarmOverrideQuiet: e.target.checked })}
          />
          Allow this alarm’s sound and notification during quiet hours
        </label>
      )}
      <div className="button-row">
        <label>
          {t.importantAlarm ? "Alarm time" : "Reminder"}
          <input
            required
            type="time"
            value={t.time}
            onChange={(e) => update({ time: e.target.value })}
          />
        </label>
        <label>
          Repeat
          <select
            value={t.repeat}
            onChange={(e) =>
              update({ repeat: e.target.value as Task["repeat"] })
            }
          >
            <option value="daily">Every day</option>
            <option value="weekly">Every week</option>
            <option value="selected">Selected days</option>
            <option value="once">Just once</option>
            <option value="interval">Every X days</option>
            <option value="afterCompletion">
              Every X days after completion
            </option>
          </select>
        </label>
      </div>
      {(t.repeat === "interval" || t.repeat === "afterCompletion") && (
        <label>
          Interval in calendar days
          <input
            type="number"
            min={1}
            max={365}
            required
            value={t.intervalDays || 1}
            onChange={(e) => update({ intervalDays: Number(e.target.value) })}
          />
        </label>
      )}
      <label>
        {t.repeat === "once" ? "Task date" : "Starting on"}
        <input
          required
          type="date"
          value={t.date}
          onChange={(e) => update({ date: e.target.value })}
        />
      </label>
      {t.repeat === "selected" && (
        <fieldset>
          <legend>Choose at least one day</legend>
          <div className="days">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <label key={d}>
                <input
                  type="checkbox"
                  checked={t.days.includes(i)}
                  onChange={(e) =>
                    update({
                      days: e.target.checked
                        ? [...t.days, i]
                        : t.days.filter((x) => x !== i),
                    })
                  }
                />
                {d}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label>
        Daily entries
        <select
          value={t.repetitions || "once"}
          onChange={(e) =>
            update({ repetitions: e.target.value as Task["repetitions"] })
          }
        >
          <option value="once">Once per day</option>
          <option value="multiple">Multiple times per day</option>
          <option value="goal">Custom daily goal</option>
          <option value="unlimited">Unlimited repetitions</option>
        </select>
      </label>
      {t.repetitions === "goal" && (
        <label>
          Daily goal
          <input
            type="number"
            min={1}
            max={100}
            required
            value={t.dailyGoal || 1}
            onChange={(e) => update({ dailyGoal: Number(e.target.value) })}
          />
        </label>
      )}
      <p className="fine">
        Daily goals are gentle targets, never limits. You can keep adding
        moments after reaching them. Unlimited tasks never receive automatic
        misses.
      </p>
      <TaskAdvancedFields task={t} update={update} />
      <p className="fine">
        Eligible completions earn coins. Beyond the reward limit, entries still
        count in your history.
      </p>
      <div className="button-row">
        <button
          className="primary"
          disabled={
            !t.name.trim() || (t.repeat === "selected" && !t.days.length)
          }
        >
          <Check size={17} />
          {task ? "Save changes" : "Add little thing"}
        </button>
        {onDelete && (
          <button
            type="button"
            className="delete-button"
            onClick={() => {
              if (confirm("Delete this task? Your earned rewards will stay."))
                onDelete();
            }}
          >
            <Trash2 size={17} /> Delete
          </button>
        )}
      </div>
    </form>
  );
}
