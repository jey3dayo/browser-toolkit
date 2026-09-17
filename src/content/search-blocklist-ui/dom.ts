import type { BlocklistEntry } from "@/search-blocklist/types";
import { SEARCH_BLOCKLIST_BUTTON_SIZE } from "./constants";

export function isDomNode(value: EventTarget | null): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "nodeType" in value &&
    typeof value.nodeType === "number"
  );
}

export function findEntryForNode(
  node: Node | null,
  entries: readonly BlocklistEntry[]
): BlocklistEntry | null {
  let current: Node | null = node;
  while (current) {
    const match = entries.find((entry) => entry.container === current);
    if (match) {
      return match;
    }
    current = current.parentNode;
  }
  return null;
}

export type ButtonPosition = { top: number; left: number };

export function computeButtonPosition(rect: DOMRect): ButtonPosition {
  return {
    left: Math.max(rect.right - SEARCH_BLOCKLIST_BUTTON_SIZE, 0),
    top: Math.max(rect.top, 0),
  };
}

export function suggestPatternFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function splitPatternLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
