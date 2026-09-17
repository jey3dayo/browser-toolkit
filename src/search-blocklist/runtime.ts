import type { Result } from "@praha/byethrow";
import type { StorageError } from "@/storage/helpers";
import { findAdapterForLocation } from "./engines/registry";
import {
  type BlocklistStateController,
  createBlocklistState,
  type StoredSearchBlocklistData,
} from "./state";
import type { SearchResultEntry } from "./types";

const MUTATION_DEBOUNCE_MS = 200;
const HREF_POLL_INTERVAL_MS = 500;

export function startSearchBlocklistRuntime(
  initialRulesPromise: Promise<
    Result.Result<StoredSearchBlocklistData, StorageError>
  >
): BlocklistStateController {
  const adapter = findAdapterForLocation(window.location);
  const engineId = adapter?.id ?? "unknown";

  function findResults(): SearchResultEntry[] {
    return adapter ? adapter.findResults(document) : [];
  }

  const controller = createBlocklistState(
    engineId,
    initialRulesPromise,
    findResults
  );

  let debounceTimer: number | undefined;
  const observer = new MutationObserver(() => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      controller.rescan();
    }, MUTATION_DEBOUNCE_MS);
  });
  observer.observe(document.documentElement, {
    attributeFilter: ["href"],
    attributes: true,
    childList: true,
    subtree: true,
  });

  if (chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !("searchBlocklistRules" in changes)) {
        return;
      }
      controller.reloadRulesFromStorage().catch(() => {
        // fail open: keep the previously loaded rule set
      });
    });
  }

  let lastHref = window.location.href;
  window.setInterval(() => {
    const { href } = window.location;
    if (href === lastHref) {
      return;
    }
    lastHref = href;
    controller.rescan();
  }, HREF_POLL_INTERVAL_MS);

  return controller;
}
