import type { Result } from "@praha/byethrow";
import type { SummaryTarget } from "@/background/types";
import type { PaneId, PaneNavigateOptions } from "@/popup/panes";
import { createPopupStorage } from "@/popup/runtime_storage";
import { createPopupTabs } from "@/popup/runtime_tabs";
import type { LocalStorageData, SyncStorageData } from "@/storage/types";

export type { SummaryTarget } from "@/background/types";
export type { SyncStorageData } from "@/storage/types";

export type EnableTableSortMessage = { action: "enableTableSort" };

export type RunContextActionRequest = {
  action: "runContextAction";
  tabId: number;
  actionId: string;
  target?: SummaryTarget;
  source?: "popup" | "contextMenu";
};

export type SummarizeEventRequest = {
  action: "summarizeEvent";
  target: SummaryTarget;
};

type TestTokenFields = {
  token?: string;
};

export type TestOpenAiTokenRequest = TestTokenFields & {
  action: "testOpenAiToken";
};

export type TestAiTokenRequest = TestTokenFields & {
  action: "testAiToken";
};
export type TestAiTokenResponse = Result.Result<void, string>;

type ChatGptAuthStatus = "signedOut" | "pending" | "signedIn" | "failed";
export type ChatGptAuthState = {
  status: ChatGptAuthStatus;
  email: string | null;
  errorMessage: string | null;
};
export type ChatGptAuthStateRequest = { action: "chatgptAuthState" };
export type ChatGptAuthStateResponse = Result.Result<ChatGptAuthState, string>;
export type ChatGptSignInRequest = { action: "chatgptSignIn" };
export type ChatGptSignInResponse = Result.Result<
  Record<string, never>,
  string
>;
export type ChatGptSignOutRequest = { action: "chatgptSignOut" };
export type ChatGptSignOutResponse = Result.Result<
  { revokeConfirmed: boolean },
  string
>;

export type ActiveTabInfo = {
  id: number;
  title?: string;
  url?: string;
};

export type FocusOverrideDiagnosticSnapshot = {
  markerPresent: boolean;
  visibilityState: string;
  hidden: boolean;
  hasFocus: boolean;
};

export type PopupRuntime = {
  isExtensionPage: boolean;
  storageSyncGet: (
    keys: (keyof SyncStorageData)[]
  ) => Result.ResultAsync<Partial<SyncStorageData>, string>;
  storageSyncSet: (
    items: Partial<SyncStorageData>
  ) => Result.ResultAsync<void, string>;
  storageLocalGet: (
    keys: (keyof LocalStorageData)[]
  ) => Result.ResultAsync<Partial<LocalStorageData>, string>;
  storageLocalSet: (
    items: Partial<LocalStorageData>
  ) => Result.ResultAsync<void, string>;
  storageLocalRemove: (
    keys: (keyof LocalStorageData)[] | keyof LocalStorageData
  ) => Result.ResultAsync<void, string>;
  getActiveTab: () => Result.ResultAsync<ActiveTabInfo | null, string>;
  getActiveTabId: () => Result.ResultAsync<number | null, string>;
  getSearchResultTabId: () => Result.ResultAsync<number | null, string>;
  matchesFocusOverridePatterns: (patterns: string[], url: string) => boolean;
  diagnoseFocusOverride: (
    tabId: number
  ) => Result.ResultAsync<FocusOverrideDiagnosticSnapshot, string>;
  reloadTab: (tabId: number) => Result.ResultAsync<void, string>;
  sendMessageToBackground: <TRequest, TResponse>(
    message: TRequest
  ) => Result.ResultAsync<TResponse, string>;
  sendMessageToTab: <TRequest, TResponse>(
    tabId: number,
    message: TRequest
  ) => Result.ResultAsync<TResponse, string>;
  openUrl: (url: string) => void;
  openOptionsPane: (
    paneId: PaneId,
    options?: PaneNavigateOptions
  ) => Result.ResultAsync<void, string>;
};

export function createPopupRuntime(): PopupRuntime {
  const isExtensionPage = window.location.protocol === "chrome-extension:";

  return {
    isExtensionPage,
    ...createPopupStorage(isExtensionPage),
    ...createPopupTabs(isExtensionPage),
  };
}
