import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import {
  Plus,
  Sun,
  Moon,
  Settings,
  Heart,
  Droplets,
  Apple,
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
} from "lucide-react";
import {
  categories,
  SUPPLIES,
  buySupply,
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
  type Category,
} from "./model";
import { Pet, PetChoices, LifeGuide, stages, pets } from "./Pets";
import { OutcomeControls, OutcomeHistory } from "./TaskOutcomes";
import { Jar, RewardFlights, type JarFlight, type RewardSource } from "./Jar";
import { PetNeeds } from "./PetNeeds";
import { Supplies } from "./Supplies";
const icons = { food: Apple, water: Droplets, clean: Sparkles, happy: Heart };
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
    "settings" | "history" | "rewards" | "tasks" | "onboard" | "health" | null
  >(() => (s.name ? null : "onboard"));
  const [edit, setEdit] = useState<Task | null | undefined>();
  const [message, setMessage] = useState("");
  const [reaction, setReaction] = useState("");
  const [flights, setFlights] = useState<JarFlight[]>([]);
  const [landed, setLanded] = useState<string>();
  const [jarPulse, setJarPulse] = useState(0);
  const jarRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(Date.now());
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
  const todayTasks = s.tasks.filter((t) => due(t, now));
  const earned = s.completions.filter((c) => c.date === today);
  const done = todayTasks.filter((t) =>
    earned.some((c) => c.taskId === t.id),
  ).length;
  const percent = todayTasks.length
    ? Math.round((done / todayTasks.length) * 100)
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
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(i);
      window.removeEventListener("focus", tick);
    };
  }, []);
  useEffect(() => {
    if (!s.settings.reminders || !s.name) return;
    const d = new Date(now),
      time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    todayTasks
      .filter(
        (t) =>
          t.time <= time &&
          (!outcomeFor(s, t.id, today) ||
            outcomeFor(s, t.id, today)?.status === "pending"),
      )
      .forEach((t) => {
        const key = t.id + today;
        if (reminded.current.has(key)) return;
        reminded.current.add(key);
        setMessage(`A gentle nudge: ${t.name}`);
        if ("Notification" in window && Notification.permission === "granted")
          new Notification("A little moment for you", { body: t.name });
      });
  }, [now, s.settings.reminders, s.name, today, s.tasks, s.outcomes]);
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
  const reward = (
    t: Task,
    status: OutcomeStatus,
    date = today,
    source?: RewardSource,
  ) => {
    if ((outcomeFor(s, t.id, date)?.status || "pending") === status) return;
    const next = setOutcome(s, t.id, date, status);
    setS((p) => setOutcome(p, t.id, date, status));
    const key = occurrenceKey(t.id, date);
    setFlights((prev) => prev.filter((f) => f.key !== key));
    if (status === "completed" && date === today && !panel) {
      const origin = source || {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
      setFlights((prev) => [
        ...prev,
        {
          key,
          token: crypto.randomUUID(),
          category: t.category,
          source: origin,
        },
      ]);
    }
    const difference =
      Math.round((next.care[t.category] - s.care[t.category]) * 10) / 10;
    const indicator =
      (difference > 0 ? "+" : difference < 0 ? "−" : "") +
      Math.abs(difference) +
      " " +
      labels[t.category];
    setReaction(
      status === "pending"
        ? "↶ care restored"
        : status === "missed"
          ? "−" + Math.abs(difference) + " " + labels[t.category]
          : "+5 coins · a little win!",
    );
    tone(
      s.settings.sound,
      status === "completed" ? 1 : status === "missed" ? -3 : 0,
    );
    setMessage(
      status === "pending"
        ? next.debt > 0
          ? `Back to pending. ${next.debt} coins reserved from future wins; supplies stay yours.`
          : "Back to pending. Coins, care and jar rewards recalculated."
        : date !== today
          ? next.debt > 0
            ? `Past result corrected. ${next.debt} coins reserved from future wins.`
            : "Past result corrected. Coins, care and jar rewards recalculated."
          : status === "completed"
            ? next.debt > 0
              ? `+5 coins earned · ${next.debt} still reserved from future wins.`
              : "+5 coins · A little win! Pick up a supply to care for your pal."
            : difference === 0
              ? "Miss recorded. Your daily care cushion softened the damage."
              : indicator + " · Tomorrow is another little beginning.",
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
            occurrenceKey(o.taskId, o.date) === f.key &&
            o.status === "completed",
        ),
      );
      return next.length === prev.length ? prev : next;
    });
  }, [s.outcomes]);
  const purchase = (item: Supply) => {
    const next = buySupply(s, item);
    if (next.careEvents.length === s.careEvents.length) {
      setMessage("A few more little wins will stock this shelf.");
      return;
    }
    setS((p) => buySupply(p, item));
    tone(s.settings.sound, 0);
    setMessage(
      SUPPLIES[item].name +
        " tucked onto your shelf. Use it whenever your pal needs care.",
    );
  };
  const pat = () => {
    if (level === 5) return;
    const next = headPat(s);
    const gain = Math.max(
      0,
      Math.round((next.care.happy - s.care.happy) * 10) / 10,
    );
    setS((p) => headPat(p));
    setReaction(gain ? "♥ +" + gain + " happiness" : "♥ happy as can be!");
    tone(s.settings.sound, 2);
  };
  const careFor = (item: Supply) => {
    const next = useSupply(s, item);
    if (next.careEvents.length === s.careEvents.length) {
      setMessage(
        level === 5
          ? "Revive your pal before using a supply."
          : "Your shelf needs a refill first.",
      );
      return;
    }
    setS((p) => useSupply(p, item));
    const v = SUPPLIES[item],
      gain = Math.round((next.care[v.category] - s.care[v.category]) * 10) / 10;
    setReaction(
      { food: "🍎", water: "💧", soap: "✨" }[item] +
        " +" +
        Math.max(0, gain) +
        " " +
        labels[v.category],
    );
    tone(s.settings.sound, 1);
    setMessage(
      v.name +
        " used · +" +
        Math.max(0, gain) +
        " " +
        labels[v.category] +
        " and a little happiness.",
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
            <span className="date">
              {new Date(now).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
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
        <main>
          <div className="intro">
            <div>
              <span className="eyebrow">
                YOUR OWN LITTLE CORNER OF THE WORLD
              </span>
              <h1>
                A little care, <em>every day.</em>
              </h1>
              <p>
                Small steps for you. A happy little life for{" "}
                {s.name || "your pal"}.
              </p>
            </div>
            <span className="streak">
              <Flame size={20} />
              <b>{streak(s)}</b> day streak
              <span>Every day is a fresh start</span>
            </span>
          </div>
          <div className="game-layout">
            <section className="task-panel">
              <div className="section-heading">
                <h2>
                  Today's little things <span>✦</span>
                </h2>
                <span className="count">
                  {done}/{todayTasks.length}
                </span>
              </div>
              <p className="section-note">
                Finish tasks → +5 coins. Use supplies for care.
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
                  todayTasks.map((t) => {
                    const Icon = icons[t.category],
                      status = outcomeFor(s, t.id, today)?.status || "pending";
                    return (
                      <motion.article
                        layout
                        className={`task-card outcome-card ${status}`}
                        key={t.id}
                      >
                        <div className="task-content">
                          <h3>{t.name}</h3>
                          <div>
                            <time>
                              {new Date(
                                `2000-01-01T${t.time}`,
                              ).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </time>
                            <span className={`category-tag ${t.category}`}>
                              <Icon size={12} />
                              {t.category === "clean"
                                ? "Clean"
                                : t.category === "happy"
                                  ? "Joy"
                                  : t.category}
                            </span>
                          </div>
                          {t.description && (
                            <span className="task-description">
                              {t.description}
                            </span>
                          )}
                        </div>
                        <OutcomeControls
                          status={status}
                          name={t.name}
                          onChange={(status, source) =>
                            reward(t, status, today, source)
                          }
                        />
                        <button
                          className="edit-button"
                          aria-label={`Edit ${t.name}`}
                          onClick={() => setEdit(t)}
                        >
                          <Pencil size={14} />
                        </button>
                      </motion.article>
                    );
                  })
                )}
              </div>
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
                  {night ? "MOONLIT MOMENTS" : "HOME, SWEET LITTLE HOME"}
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
                  <span>stay soft</span>
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
              <PetNeeds
                s={s}
                onPat={pat}
                onSupplies={() =>
                  document
                    .getElementById("supplies")
                    ?.scrollIntoView({
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
                <strong>
                  {done}
                  <span> / {todayTasks.length}</span>
                </strong>
                <p>little things, big feelings</p>
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
                {categories.map((c) => {
                  const Icon = icons[c];
                  return (
                    <span key={c}>
                      <i className={c} />
                      <Icon size={12} />
                      {c === "happy" ? "Joy" : c === "clean" ? "Clean" : c}
                    </span>
                  );
                })}
              </div>
              <Supplies s={s} onBuy={purchase} onUse={careFor} />
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
        <dialog
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
                  <div className="reward-entry" key={t.id}>
                    <span>
                      {t.name}
                      <small>
                        {t.repeat} · {t.date} · {t.time}
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
            ) : panel === "health" ? (
              <LifeGuide kind={s.pet} actual={level} />
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
                <OutcomeHistory s={s} onChange={reward} />
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
                    const Icon = icons[c.category];
                    return (
                      <div className="reward-entry" key={c.at + c.taskId}>
                        <span className={`category-tag ${c.category}`}>
                          <Icon size={18} />
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
        </dialog>
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
    },
  );
  const [manual, setManual] = useState(!!task);
  const update = (p: Partial<Task>) => setT((v) => ({ ...v, ...p }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (t.repeat === "selected" && !t.days.length) return;
        onSave({ ...t, name: t.name.trim() });
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
            update({
              name,
              ...(!manual
                ? {
                    category: /water|drink|hydrat/i.test(name)
                      ? "water"
                      : /clean|brush|wash|tidy/i.test(name)
                        ? "clean"
                        : /\b(eat|breakfast|stretch|walk|meal)\b/i.test(name)
                          ? "food"
                          : "happy",
                  }
                : {}),
            });
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
      <div className="button-row">
        <label>
          Reminder
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
          </select>
        </label>
      </div>
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
        Give your pal
        <select
          value={t.category}
          onChange={(e) => {
            setManual(true);
            update({ category: e.target.value as Category });
          }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {labels[c]}
            </option>
          ))}
        </select>
      </label>
      <p className="fine">
        Suggested from your task name. Choose any reward that feels right.
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
