import { insertEarlyBlocklistStyle } from "@/search-blocklist/early-style";
import { startSearchBlocklistRuntime } from "@/search-blocklist/runtime";
import type { StoredSearchBlocklistData } from "@/search-blocklist/state";
import { storageLocalGet } from "@/storage/helpers";

const initialRulesPromise = storageLocalGet<StoredSearchBlocklistData>([
  "searchBlocklistRules",
]);

(() => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  insertEarlyBlocklistStyle(document);

  const state = startSearchBlocklistRuntime(initialRulesPromise);

  globalThis.__MBU_BLOCKLIST_STATE__ = state;
})();
