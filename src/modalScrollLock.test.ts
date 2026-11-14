import assert from "node:assert/strict";
import { test } from "node:test";
import { lockBackgroundScroll } from "./modalScrollLock";

class MockStyle {
  private values = new Map<string, { value: string; priority: string }>();
  setProperty(name: string, value: string, priority = "") {
    this.values.set(name, { value, priority });
  }
  getPropertyValue(name: string) {
    return this.values.get(name)?.value || "";
  }
  getPropertyPriority(name: string) {
    return this.values.get(name)?.priority || "";
  }
  removeProperty(name: string) {
    const value = this.getPropertyValue(name);
    this.values.delete(name);
    return value;
  }
}

test("modal scroll lock blocks outside gestures and restores styles and scroll", () => {
  const bodyStyle = new MockStyle();
  bodyStyle.setProperty("position", "relative", "important");
  bodyStyle.setProperty("padding-right", "3px");
  const rootStyle = new MockStyle();
  rootStyle.setProperty("overflow", "auto");
  rootStyle.setProperty("overscroll-behavior", "auto", "important");
  const body = { style: bodyStyle };
  const root = { style: rootStyle, clientWidth: 980 };
  const listeners = new Map<string, EventListener>();
  const removed: string[] = [];
  const documentMock = {
    body,
    documentElement: root,
    addEventListener(
      name: string,
      callback: EventListener,
      options?: AddEventListenerOptions,
    ) {
      assert.equal(options?.passive, false);
      assert.equal(options?.capture, true);
      listeners.set(name, callback);
    },
    removeEventListener(
      name: string,
      callback: EventListener,
      capture?: boolean,
    ) {
      assert.equal(capture, true);
      assert.equal(listeners.get(name), callback);
      listeners.delete(name);
      removed.push(name);
    },
  };
  const scrollCalls: number[][] = [];
  const windowMock = {
    scrollY: 240,
    innerWidth: 1000,
    getComputedStyle: () => ({ paddingRight: "4px" }),
    scrollTo: (...args: number[]) => scrollCalls.push(args),
  };
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentMock,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowMock,
  });
  try {
    const inside = {};
    const outside = {};
    const dialog = {
      contains: (node: Node) => node === inside,
    } as unknown as HTMLDialogElement;
    const unlock = lockBackgroundScroll(dialog);
    assert.equal(bodyStyle.getPropertyValue("position"), "fixed");
    assert.equal(bodyStyle.getPropertyValue("top"), "-240px");
    assert.equal(bodyStyle.getPropertyValue("padding-right"), "24px");
    assert.equal(rootStyle.getPropertyValue("overflow"), "hidden");
    let outsidePrevented = false;
    let insidePrevented = false;
    listeners.get("wheel")!({
      target: outside,
      preventDefault: () => (outsidePrevented = true),
    } as unknown as Event);
    listeners.get("touchmove")!({
      target: inside,
      preventDefault: () => (insidePrevented = true),
    } as unknown as Event);
    assert.equal(outsidePrevented, true);
    assert.equal(insidePrevented, false);

    unlock();
    assert.equal(bodyStyle.getPropertyValue("position"), "relative");
    assert.equal(bodyStyle.getPropertyPriority("position"), "important");
    assert.equal(bodyStyle.getPropertyValue("padding-right"), "3px");
    assert.equal(rootStyle.getPropertyValue("overflow"), "auto");
    assert.equal(
      rootStyle.getPropertyPriority("overscroll-behavior"),
      "important",
    );
    assert.deepEqual(scrollCalls, [[0, 240]]);
    assert.deepEqual(removed.sort(), ["touchmove", "wheel"]);
  } finally {
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
