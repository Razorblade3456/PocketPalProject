type SavedStyles = Map<string, [value: string, priority: string]>;

function snapshot(
  style: CSSStyleDeclaration,
  properties: string[],
): SavedStyles {
  return new Map(
    properties.map((property) => [
      property,
      [style.getPropertyValue(property), style.getPropertyPriority(property)],
    ]),
  );
}

function restore(style: CSSStyleDeclaration, saved: SavedStyles) {
  for (const [property, [value, priority]] of saved) {
    if (value) style.setProperty(property, value, priority);
    else style.removeProperty(property);
  }
}

/** Lock the page behind a native modal and restore its exact scroll position/styles. */
export function lockBackgroundScroll(dialog: HTMLDialogElement) {
  const body = document.body;
  const root = document.documentElement;
  const scrollY = window.scrollY;
  const bodyStyles = snapshot(body.style, [
    "position",
    "top",
    "left",
    "right",
    "width",
    "overflow",
    "padding-right",
  ]);
  const rootStyles = snapshot(root.style, ["overflow", "overscroll-behavior"]);
  const scrollbar = Math.max(0, window.innerWidth - root.clientWidth);
  const bodyPadding =
    Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

  body.style.setProperty("position", "fixed");
  body.style.setProperty("top", `-${scrollY}px`);
  body.style.setProperty("left", "0");
  body.style.setProperty("right", "0");
  body.style.setProperty("width", "100%");
  body.style.setProperty("overflow", "hidden");
  if (scrollbar)
    body.style.setProperty("padding-right", `${bodyPadding + scrollbar}px`);
  root.style.setProperty("overflow", "hidden");
  root.style.setProperty("overscroll-behavior", "none");

  const preventOutsideScroll = (event: Event) => {
    if (event.target && dialog.contains(event.target as Node)) return;
    event.preventDefault();
  };
  document.addEventListener("wheel", preventOutsideScroll, {
    capture: true,
    passive: false,
  });
  document.addEventListener("touchmove", preventOutsideScroll, {
    capture: true,
    passive: false,
  });

  return () => {
    document.removeEventListener("wheel", preventOutsideScroll, true);
    document.removeEventListener("touchmove", preventOutsideScroll, true);
    restore(body.style, bodyStyles);
    restore(root.style, rootStyles);
    window.scrollTo(0, scrollY);
  };
}
