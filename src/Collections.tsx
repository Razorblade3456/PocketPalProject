import { useState } from "react";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  Dumbbell,
  Folder,
  Gamepad2,
  GraduationCap,
  Heart,
  Home,
  Laptop,
  Music,
  PawPrint,
  PiggyBank,
  Pencil,
  Plane,
  Plus,
  ShoppingCart,
  Sparkles,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import {
  COLLECTION_COLORS,
  COLLECTION_ICONS,
  taskDue,
  taskFinishedToday,
  type Collection,
  type CollectionColor,
  type CollectionIcon,
  type State,
  type Task,
} from "./model";

const collectionIcons = {
  folder: Folder,
  wallet: Wallet,
  piggyBank: PiggyBank,
  graduationCap: GraduationCap,
  book: BookOpen,
  laptop: Laptop,
  briefcase: Briefcase,
  home: Home,
  shoppingCart: ShoppingCart,
  dumbbell: Dumbbell,
  heart: Heart,
  pawPrint: PawPrint,
  music: Music,
  gamepad: Gamepad2,
  plane: Plane,
  calendar: CalendarDays,
  utensils: Utensils,
  sparkles: Sparkles,
} satisfies Record<CollectionIcon, typeof Folder>;
const iconFor = (icon?: string) =>
  (icon && collectionIcons[icon as CollectionIcon]) || Folder;
const iconLabels: Record<CollectionIcon, string> = {
  folder: "Folder",
  wallet: "Wallet",
  piggyBank: "Piggy bank",
  graduationCap: "Graduation cap",
  book: "Book",
  laptop: "Laptop",
  briefcase: "Briefcase",
  home: "Home",
  shoppingCart: "Shopping cart",
  dumbbell: "Dumbbell",
  heart: "Heart",
  pawPrint: "Paw print",
  music: "Music",
  gamepad: "Game controller",
  plane: "Airplane",
  calendar: "Calendar",
  utensils: "Utensils",
  sparkles: "Sparkles",
};
const colorValues: Record<CollectionColor, string> = {
  purple: "#B59AC7",
  burgundy: "#C46B80",
  orange: "#E5A35D",
  sage: "#9CB58B",
};
const colorLabels: Record<CollectionColor, string> = {
  purple: "Muted purple",
  burgundy: "Burgundy",
  orange: "Warm orange",
  sage: "Sage green",
};
const priorityColors = {
  high: "#C46B80",
  normal: "#E5A35D",
  low: "#9CB58B",
} as const;

type CollectionDraft = Omit<Collection, "id">;

export function CollectionFields({
  name,
  setName,
  icon,
  setIcon,
  color,
  setColor,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  name: string;
  setName: (name: string) => void;
  icon: CollectionIcon | "";
  setIcon: (icon: CollectionIcon | "") => void;
  color: CollectionColor | "";
  setColor: (color: CollectionColor | "") => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div
      className="collection-edit-form"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          onSubmit();
        }
      }}
    >
      <label>
        Name
        <input
          required
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </label>
      <div className="collection-form-pickers">
        <div className="collection-icon-field">
          <span>Icon · optional</span>
          <div className="collection-icon-picker" role="group" aria-label="Collection icon">
            <button
              type="button"
              className={icon === "" ? "is-selected" : ""}
              aria-label="No icon"
              title="No icon"
              aria-pressed={icon === ""}
              onClick={() => setIcon("")}
            >
              <X size={15} />
            </button>
            {COLLECTION_ICONS.map((choice) => {
              const Icon = collectionIcons[choice];
              return (
                <button
                  key={choice}
                  type="button"
                  className={icon === choice ? "is-selected" : ""}
                  aria-label={iconLabels[choice]}
                  title={iconLabels[choice]}
                  aria-pressed={icon === choice}
                  onClick={() => setIcon(choice)}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
        </div>
        <label>
          Accent · optional
          <select
            value={color}
            onChange={(event) => setColor(event.target.value as CollectionColor | "")}
          >
            <option value="">Default purple</option>
            {COLLECTION_COLORS.map((choice) => (
              <option key={choice} value={choice}>
                {colorLabels[choice]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="collection-form-actions">
        <button
          type="button"
          className="collection-action-primary"
          disabled={!name.trim()}
          onClick={onSubmit}
        >
          {submitLabel}
        </button>
        <button type="button" className="collection-action-quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CollectionsPanel({
  s,
  today,
  now,
  onEditTask,
  onCreate,
  onUpdate,
  onDelete,
}: {
  s: State;
  today: string;
  now: number;
  onEditTask: (task: Task) => void;
  onCreate: (collection: CollectionDraft) => string;
  onUpdate: (id: string, patch: CollectionDraft) => void;
  onDelete: (id: string) => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CollectionIcon | "">("folder");
  const [color, setColor] = useState<CollectionColor | "">("purple");
  const collections = s.collections || [];
  const resetForm = () => {
    setName("");
    setIcon("folder");
    setColor("purple");
    setCreating(false);
    setEditingId(null);
  };
  const beginEdit = (collection: Collection) => {
    setEditingId(collection.id);
    setName(collection.name);
    setIcon(collection.icon || "");
    setColor(collection.color || "");
    setCreating(false);
  };
  const submitNew = () => {
    const draft: CollectionDraft = {
      name: name.trim(),
      ...(icon ? { icon } : {}),
      ...(color ? { color } : {}),
    };
    if (!draft.name) return;
    onCreate(draft);
    resetForm();
  };
  const submitEdit = () => {
    const draft: CollectionDraft = {
      name: name.trim(),
      icon: icon || undefined,
      color: color || undefined,
    };
    if (!draft.name || !editingId) return;
    onUpdate(editingId, draft);
    resetForm();
  };

  return (
    <section className="collections-panel" aria-label="My Collections">
      <div className="collections-heading">
        <div>
          <h2>My Collections</h2>
          <span>Related tasks, kept together</span>
        </div>
        <div className="collections-heading-actions">
          <button
            type="button"
            className="collection-mobile-toggle"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Collapse collections" : "Expand collections"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            className="collection-add-button"
            aria-label="Create a collection"
            title="Create a collection"
            onClick={() => {
              setCreating((open) => !open);
              setEditingId(null);
            }}
          >
            <Plus size={15} /> <span>New</span>
          </button>
        </div>
      </div>
      {creating && (
        <CollectionFields
          name={name}
          setName={setName}
          icon={icon}
          setIcon={setIcon}
          color={color}
          setColor={setColor}
          onSubmit={submitNew}
          onCancel={resetForm}
          submitLabel="Create collection"
        />
      )}
      <div className="collection-list" data-mobile-open={mobileOpen}>
        {collections.length === 0 && !creating ? (
          <p className="collection-empty">
            No collections yet. Create one here or from a task’s editor.
          </p>
        ) : (
          collections.map((collection) => {
            const tasks = s.tasks.filter(
              (task) => task.collectionId === collection.id && taskDue(s, task, now),
            );
            const completed = tasks.filter((task) =>
              taskFinishedToday(s, task, today),
            ).length;
            const percent = tasks.length
              ? Math.round((completed / tasks.length) * 100)
              : 0;
            const Icon = iconFor(collection.icon);
            const accent = collection.color
              ? colorValues[collection.color]
              : colorValues.purple;
            return (
              <details className="collection-row" key={collection.id}>
                <summary>
                  <span className="collection-row-icon" style={{ color: accent }}>
                    <Icon size={16} />
                  </span>
                  <span className="collection-row-title">
                    <strong>{collection.name}</strong>
                    <small>
                      {completed}/{tasks.length} completed
                    </small>
                  </span>
                  <span
                    className="collection-progress-track"
                    role="progressbar"
                    aria-label={`${collection.name} progress`}
                    aria-valuemin={0}
                    aria-valuemax={tasks.length || 1}
                    aria-valuenow={completed}
                  >
                    <i style={{ width: `${percent}%`, background: accent }} />
                  </span>
                  <ChevronDown className="collection-row-chevron" size={15} />
                </summary>
                <div className="collection-row-body">
                  <div className="collection-task-list">
                    {tasks.length ? (
                      tasks.map((task) => {
                        const done = taskFinishedToday(s, task, today);
                        return (
                          <button
                            type="button"
                            className="collection-task"
                            key={task.id}
                            onClick={() => onEditTask(task)}
                            aria-label={`Edit ${task.name}`}
                          >
                            <span
                              className={`collection-task-status${done ? " is-complete" : ""}`}
                              aria-label={done ? "Completed" : "Not completed"}
                            >
                              {done && <Check size={12} />}
                            </span>
                            <i
                              className="collection-task-priority"
                              style={{
                                background: priorityColors[task.priority || "normal"],
                              }}
                              aria-label={`${task.priority || "normal"} priority`}
                            />
                            <span className="collection-task-name">{task.name}</span>
                            <Pencil size={12} />
                          </button>
                        );
                      })
                    ) : (
                      <p className="collection-no-tasks">
                        No tasks scheduled today.
                      </p>
                    )}
                  </div>
                  <div className="collection-row-actions">
                    <button
                      type="button"
                      onClick={() => beginEdit(collection)}
                    >
                      <Pencil size={12} /> Edit collection
                    </button>
                    <button
                      type="button"
                      className="collection-delete-button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete “${collection.name}”? Its tasks will stay and become ungrouped.`,
                          )
                        )
                          onDelete(collection.id);
                      }}
                    >
                      <X size={12} /> Delete
                    </button>
                  </div>
                  {editingId === collection.id && (
                    <CollectionFields
                      name={name}
                      setName={setName}
                      icon={icon}
                      setIcon={setIcon}
                      color={color}
                      setColor={setColor}
                      onSubmit={submitEdit}
                      onCancel={resetForm}
                      submitLabel="Save changes"
                    />
                  )}
                </div>
              </details>
            );
          })
        )}
      </div>
    </section>
  );
}

export function NewCollectionFields({
  collections,
  selected,
  onChange,
  onCreate,
}: {
  collections: Collection[];
  selected?: string;
  onChange: (id?: string) => void;
  onCreate: (collection: CollectionDraft) => string;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<CollectionIcon | "">("folder");
  const [color, setColor] = useState<CollectionColor | "">("purple");
  const reset = () => {
    setCreating(false);
    setName("");
    setIcon("folder");
    setColor("purple");
  };
  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = onCreate({
      name: trimmed,
      ...(icon ? { icon } : {}),
      ...(color ? { color } : {}),
    });
    onChange(id);
    reset();
  };
  const selectedCollection = collections.find(
    (collection) => collection.id === selected,
  );
  const SelectedIcon = iconFor(selectedCollection?.icon);
  const selectedAccent = selectedCollection?.color
    ? colorValues[selectedCollection.color]
    : colorValues.purple;
  return (
    <div className="task-collection-field">
      <label>
        Collection (optional)
        <select
          value={creating ? "__new__" : selected || ""}
          onChange={(event) => {
            if (event.target.value === "__new__") {
              setCreating(true);
              return;
            }
            setCreating(false);
            onChange(event.target.value || undefined);
          }}
        >
          <option value="">None</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
          <option value="__new__">+ New Collection</option>
        </select>
      </label>
      {selectedCollection && !creating && (
        <span className="task-collection-selected" style={{ color: selectedAccent }}>
          <SelectedIcon size={14} /> {selectedCollection.name}
        </span>
      )}
      {creating && (
        <CollectionFields
          name={name}
          setName={setName}
          icon={icon}
          setIcon={setIcon}
          color={color}
          setColor={setColor}
          onSubmit={submit}
          onCancel={reset}
          submitLabel="Create & assign"
        />
      )}
    </div>
  );
}
