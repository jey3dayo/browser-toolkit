import { Result } from "@praha/byethrow";
import {
  type FocusOverrideStorageData,
  normalizeFocusOverridePatterns,
  toFocusOverrideMatchPatterns,
} from "@/focus-override/patterns";
import { storageSyncGet } from "@/storage/helpers";

const FOCUS_OVERRIDE_CONTENT_SCRIPT_ID = "mbu-focus-override";
const FOCUS_OVERRIDE_CONTENT_SCRIPT_JS = "dist/focus-override.js";

async function getStoredFocusOverridePatterns(): Promise<string[]> {
  const stored = await storageSyncGet<FocusOverrideStorageData>([
    "focusOverridePatterns",
  ]);
  if (Result.isFailure(stored)) {
    return [];
  }

  const normalized = normalizeFocusOverridePatterns(stored.value);
  return Result.isSuccess(normalized) ? normalized.value : [];
}

async function unregisterFocusOverrideContentScriptIfNeeded(): Promise<void> {
  if (!chrome.scripting?.getRegisteredContentScripts) {
    return;
  }

  const registered = await chrome.scripting.getRegisteredContentScripts({
    ids: [FOCUS_OVERRIDE_CONTENT_SCRIPT_ID],
  });
  if (registered.length === 0) {
    return;
  }

  await chrome.scripting.unregisterContentScripts({
    ids: [FOCUS_OVERRIDE_CONTENT_SCRIPT_ID],
  });
}

export async function syncFocusOverrideContentScript(): Promise<void> {
  if (!chrome.scripting?.registerContentScripts) {
    return;
  }

  const patterns = await getStoredFocusOverridePatterns();
  const matches = toFocusOverrideMatchPatterns(patterns);

  await unregisterFocusOverrideContentScriptIfNeeded();
  if (matches.length === 0) {
    return;
  }

  await chrome.scripting.registerContentScripts([
    {
      id: FOCUS_OVERRIDE_CONTENT_SCRIPT_ID,
      js: [FOCUS_OVERRIDE_CONTENT_SCRIPT_JS],
      matches,
      persistAcrossSessions: true,
      runAt: "document_start",
      world: "MAIN",
    },
  ]);
}
