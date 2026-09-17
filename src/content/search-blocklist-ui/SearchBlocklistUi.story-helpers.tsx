import { Result } from "@praha/byethrow";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fn } from "storybook/test";
import type {
  BlocklistEntry,
  BlocklistSnapshot,
  BlocklistState,
} from "@/search-blocklist/types";
import { ensureShadowUiBaseStyles } from "@/ui/styles";
import { applyTheme, isTheme, type Theme } from "@/ui/theme";
import { CountBar } from "./CountBar";
import { FloatingWidget } from "./FloatingWidget";

export function createFakeBlocklistState(
  initial: BlocklistSnapshot
): BlocklistState {
  const snapshot = initial;
  const listeners = new Set<() => void>();

  function notify(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    addRule: fn(() => {
      notify();
      return Promise.resolve(Result.succeed(undefined));
    }),
    getSnapshot: () => snapshot,
    ready: Promise.resolve(),
    removeRules: fn(() => {
      notify();
      return Promise.resolve(Result.succeed(undefined));
    }),
    setRevealed: fn(),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function makeStoryEntry(
  overrides: Partial<BlocklistEntry> = {}
): BlocklistEntry {
  const container = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = "スパム気味のブログ記事タイトル";
  container.appendChild(heading);
  container.dataset.testid = "search-blocklist-story-result";
  container.style.cssText =
    "padding: 12px; border: 1px dashed var(--mbu-border, #ccc); border-radius: 8px; max-width: 480px;";
  return {
    blocked: false,
    container,
    matchedRuleIds: [],
    title: "スパム気味のブログ記事タイトル",
    url: "https://spammy-example.com/article/123",
    ...overrides,
  };
}

type ShadowStoryMount = { root: HTMLDivElement; shadow: ShadowRoot };

function useShadowStoryMount(hostId: string): {
  host: HTMLDivElement | null;
  hostRef: React.RefObject<HTMLDivElement | null>;
  mount: ShadowStoryMount | null;
} {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [mount, setMount] = useState<ShadowStoryMount | null>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  const docTheme = document.documentElement.getAttribute("data-theme");
  const resolvedTheme: Theme = isTheme(docTheme) ? docTheme : "auto";

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (el === null) {
      return;
    }
    el.id = hostId;
    const shadow = el.shadowRoot ?? el.attachShadow({ mode: "open" });
    ensureShadowUiBaseStyles(shadow);
    applyTheme(resolvedTheme, shadow);

    let rootEl = shadow.getElementById(
      `${hostId}-root`
    ) as HTMLDivElement | null;
    if (!rootEl) {
      rootEl = document.createElement("div");
      rootEl.id = `${hostId}-root`;
      shadow.appendChild(rootEl);
    }

    setMount({ root: rootEl, shadow });
    setHost(el);
    return () => {
      setMount(null);
    };
  }, [hostId, resolvedTheme]);

  return { host, hostRef, mount };
}

function StoryResultSlot(props: { entry: BlocklistEntry }): React.JSX.Element {
  const attachContainer = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && node.firstChild !== props.entry.container) {
        node.replaceChildren(props.entry.container);
      }
    },
    [props.entry]
  );

  return <div ref={attachContainer} />;
}

export function FloatingWidgetStory(props: {
  entries: BlocklistEntry[];
}): React.JSX.Element {
  const { host, hostRef, mount } = useShadowStoryMount(
    "browser-toolkit-search-blocklist-widget-story"
  );
  const [state] = useState(() =>
    createFakeBlocklistState({
      blockedCount: props.entries.filter((entry) => entry.blocked).length,
      engineId: "google",
      entries: props.entries,
      ruleRevision: 1,
    })
  );

  return (
    <div style={{ display: "grid", gap: 12, padding: 24 }}>
      {props.entries.map((entry) => (
        <StoryResultSlot entry={entry} key={entry.url} />
      ))}
      <div ref={hostRef} />
      {mount && host
        ? createPortal(<FloatingWidget host={host} state={state} />, mount.root)
        : null}
    </div>
  );
}

export function CountBarStory(props: {
  blockedCount: number;
}): React.JSX.Element {
  const [state] = useState(() =>
    createFakeBlocklistState({
      blockedCount: props.blockedCount,
      engineId: "google",
      entries: [],
      ruleRevision: 1,
    })
  );

  return (
    <div style={{ maxWidth: 480 }}>
      <CountBar state={state} />
    </div>
  );
}
