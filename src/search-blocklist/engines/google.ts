import type { SearchResultEntry } from "../types";
import type { SearchEngineAdapter } from "./types";

const RESULT_CONTAINER_SELECTOR = "[data-hveid]";
const EXTERNAL_LINK_SELECTOR = 'a[href^="http"]';
const GOOGLE_SEARCH_HOSTS = new Set(["www.google.com", "www.google.co.jp"]);

function isGoogleOwnedHost(hostname: string): boolean {
  return hostname.split(".").includes("google");
}

function extractTitle(
  container: HTMLElement,
  anchor: HTMLAnchorElement
): string {
  const heading = container.querySelector("h3");
  return (heading?.textContent ?? anchor.textContent ?? "").trim();
}

export function findResults(root: ParentNode): SearchResultEntry[] {
  const anchors = Array.from(
    root.querySelectorAll<HTMLAnchorElement>(EXTERNAL_LINK_SELECTOR)
  );
  const seenContainers = new Set<HTMLElement>();
  const entries: SearchResultEntry[] = [];

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) {
      continue;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(href);
    } catch {
      continue;
    }

    if (isGoogleOwnedHost(parsedUrl.hostname)) {
      continue;
    }

    const container = anchor.closest<HTMLElement>(RESULT_CONTAINER_SELECTOR);
    if (!container || seenContainers.has(container)) {
      continue;
    }
    seenContainers.add(container);

    entries.push({
      container,
      title: extractTitle(container, anchor),
      url: parsedUrl.toString(),
    });
  }

  return entries;
}

export function matches(location: Location): boolean {
  return (
    GOOGLE_SEARCH_HOSTS.has(location.hostname) &&
    location.pathname === "/search"
  );
}

export const googleAdapter: SearchEngineAdapter = {
  findResults,
  id: "google",
  matches,
};
