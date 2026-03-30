const APPLIED_FLAG = "__MBU_FOCUS_OVERRIDE_APPLIED__";

type FocusOverrideWindow = Window &
  typeof globalThis & {
    __MBU_FOCUS_OVERRIDE_APPLIED__?: boolean;
  };

type EventTargetWithAddListener = {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
};

function defineGetter(
  target: object,
  property: string,
  getter: () => unknown
): void {
  try {
    Object.defineProperty(target, property, {
      configurable: true,
      get: getter,
    });
  } catch {
    // no-op
  }
}

function defineValue(target: object, property: string, value: unknown): void {
  try {
    Object.defineProperty(target, property, {
      configurable: true,
      writable: true,
      value,
    });
  } catch {
    // no-op
  }
}

function ignoreEventHandlerProperty(target: object, property: string): void {
  try {
    Object.defineProperty(target, property, {
      configurable: true,
      get: () => null,
      set: () => {
        // no-op
      },
    });
  } catch {
    // no-op
  }
}

function stopImmediatePropagation(event: Event): void {
  event.stopImmediatePropagation();
}

export function applyAlwaysFocusedOverrides(
  targetWindow: Window,
  targetDocument: Document
): void {
  const windowWithFlag = targetWindow as FocusOverrideWindow;
  if (windowWithFlag[APPLIED_FLAG]) {
    return;
  }
  windowWithFlag[APPLIED_FLAG] = true;

  defineGetter(targetDocument, "visibilityState", () => "visible");
  defineGetter(targetDocument, "hidden", () => false);
  if ("webkitVisibilityState" in targetDocument) {
    defineGetter(targetDocument, "webkitVisibilityState", () => "visible");
  }
  if ("webkitHidden" in targetDocument) {
    defineGetter(targetDocument, "webkitHidden", () => false);
  }
  defineValue(targetDocument, "hasFocus", () => true);

  ignoreEventHandlerProperty(targetWindow, "onblur");
  ignoreEventHandlerProperty(targetWindow, "onfocus");
  ignoreEventHandlerProperty(targetDocument, "onvisibilitychange");

  const originalWindowAddEventListener =
    targetWindow.addEventListener.bind(targetWindow);
  const originalDocumentAddEventListener =
    targetDocument.addEventListener.bind(targetDocument);

  defineValue(targetWindow, "addEventListener", ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    if (type === "blur" || type === "focus" || type === "visibilitychange") {
      return;
    }
    originalWindowAddEventListener(type, listener, options);
  }) satisfies EventTargetWithAddListener["addEventListener"]);

  defineValue(targetDocument, "addEventListener", ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    if (type === "blur" || type === "focus" || type === "visibilitychange") {
      return;
    }
    originalDocumentAddEventListener(type, listener, options);
  }) satisfies EventTargetWithAddListener["addEventListener"]);

  originalWindowAddEventListener("blur", stopImmediatePropagation, true);
  originalWindowAddEventListener("focus", stopImmediatePropagation, true);
  originalDocumentAddEventListener(
    "visibilitychange",
    stopImmediatePropagation,
    true
  );
}
