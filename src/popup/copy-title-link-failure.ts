import { Result } from "@praha/byethrow";
import {
  canUseChromeAction,
  clearActionBadgeForTab,
} from "@/popup/chrome-action-utils";
import type { createPopupRuntime } from "@/popup/runtime";
import type { CopyTitleLinkFailure } from "@/storage/types";
import type { createNotifications } from "@/ui/toast";
import { coerceLinkFormat, type LinkFormat } from "@/utils/link_format";

export function coerceCopyTitleLinkFailure(
  value: unknown
): Result.Result<CopyTitleLinkFailure, "invalid"> {
  if (typeof value !== "object" || value === null) {
    return Result.fail("invalid");
  }
  const v = value as Record<string, unknown>;
  if (typeof v.occurredAt !== "number") {
    return Result.fail("invalid");
  }
  if (typeof v.tabId !== "number") {
    return Result.fail("invalid");
  }
  if (typeof v.pageTitle !== "string") {
    return Result.fail("invalid");
  }
  if (typeof v.pageUrl !== "string") {
    return Result.fail("invalid");
  }
  if (typeof v.text !== "string") {
    return Result.fail("invalid");
  }
  if (typeof v.error !== "string") {
    return Result.fail("invalid");
  }
  const format = coerceLinkFormat(v.format);
  return Result.succeed({
    occurredAt: v.occurredAt as number,
    tabId: v.tabId as number,
    pageTitle: v.pageTitle as string,
    pageUrl: v.pageUrl as string,
    text: v.text as string,
    error: v.error as string,
    ...(format ? { format } : {}),
  });
}

export type LoadCopyTitleLinkFailureError =
  | "none"
  | "storage-error"
  | "invalid";

export async function loadCopyTitleLinkFailure(runtime: {
  storageLocalGet: ReturnType<typeof createPopupRuntime>["storageLocalGet"];
}): Promise<
  Result.Result<CopyTitleLinkFailure, LoadCopyTitleLinkFailureError>
> {
  const loaded = await runtime.storageLocalGet(["lastCopyTitleLinkFailure"]);
  if (Result.isFailure(loaded)) {
    return Result.fail("storage-error" as const);
  }

  const stored = loaded.value.lastCopyTitleLinkFailure;
  if (typeof stored === "undefined") {
    return Result.fail("none" as const);
  }

  const result = coerceCopyTitleLinkFailure(stored);
  if (Result.isFailure(result)) {
    return Result.fail(result.error);
  }

  return Result.succeed(result.value);
}

export async function handleCopyTitleLinkFailureOnPopupOpen(params: {
  runtime: ReturnType<typeof createPopupRuntime>;
  notify: ReturnType<typeof createNotifications>["notify"];
  setCreateLinkInitialLink: (value: { title: string; url: string }) => void;
  setCreateLinkInitialFormat: (value: LinkFormat) => void;
  navigateToCreateLink: () => void;
}): Promise<void> {
  const MAX_AGE_MS = 2 * 60 * 1000;

  const failureLoaded = await loadCopyTitleLinkFailure(params.runtime);
  if (Result.isFailure(failureLoaded)) {
    if (failureLoaded.error === "invalid") {
      await params.runtime.storageLocalRemove("lastCopyTitleLinkFailure");
    }
    return;
  }

  const failure = failureLoaded.value;
  const actionAvailable = canUseChromeAction(params.runtime);

  if (Date.now() - failure.occurredAt > MAX_AGE_MS) {
    await params.runtime.storageLocalRemove("lastCopyTitleLinkFailure");
    if (actionAvailable) {
      clearActionBadgeForTab(failure.tabId);
    }
    return;
  }

  const activeTabIdResult = await params.runtime.getActiveTabId();
  if (Result.isFailure(activeTabIdResult)) {
    return;
  }
  const activeTabId = activeTabIdResult.value;
  if (activeTabId === null || activeTabId !== failure.tabId) {
    return;
  }

  await params.runtime.storageLocalRemove("lastCopyTitleLinkFailure");
  if (actionAvailable) {
    clearActionBadgeForTab(failure.tabId);
  }

  params.setCreateLinkInitialLink({
    title: failure.pageTitle,
    url: failure.pageUrl,
  });
  params.setCreateLinkInitialFormat(failure.format ?? "text");
  params.navigateToCreateLink();

  params.notify.error(
    [
      "このページでは自動コピーできませんでした。",
      failure.pageTitle ? `タイトル: ${failure.pageTitle}` : null,
      failure.pageUrl ? `URL: ${failure.pageUrl}` : null,
      "",
      "このポップアップ「リンク作成」からコピーできます。",
    ]
      .filter(Boolean)
      .join("\n")
  );
}
