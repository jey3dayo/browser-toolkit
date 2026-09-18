import { Result } from "@praha/byethrow";
import { getAiProviderToken } from "@/ai/provider-token";
import { t } from "@/i18n";
import type { PaneNavigator } from "@/popup/panes";
import { safeParseAiProvider } from "@/schemas/provider";
import type { LocalStorageData } from "@/storage/types";

export type NotificationOptions = {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export type TokenGuardDeps = {
  storageLocalGet: (
    keys: (keyof LocalStorageData)[]
  ) => Result.ResultAsync<Partial<LocalStorageData>, string>;
  showNotification: (
    messageOrOptions: string | NotificationOptions,
    type?: "info" | "error"
  ) => void;
  navigate: PaneNavigator;
};

export type EnsureOpenAiTokenConfiguredError =
  | "missing-token"
  | "storage-error";

export async function ensureOpenAiTokenConfigured(
  deps: TokenGuardDeps
): Result.ResultAsync<void, EnsureOpenAiTokenConfiguredError> {
  let loaded: Result.Result<Partial<LocalStorageData>, string>;
  try {
    loaded = await deps.storageLocalGet([
      "aiProvider",
      "openaiApiToken",
      "anthropicApiToken",
      "zaiApiToken",
    ]);
  } catch {
    deps.showNotification(t("popup.tokenGuard.loadFailed"), "error");
    deps.navigate("pane-settings", { focus: "token" });
    return Result.fail("storage-error");
  }
  if (Result.isFailure(loaded)) {
    deps.showNotification(t("popup.tokenGuard.loadFailed"), "error");
    deps.navigate("pane-settings", { focus: "token" });
    return Result.fail("storage-error");
  }

  const provider = safeParseAiProvider(loaded.value.aiProvider) ?? "openai";
  const token = getAiProviderToken(loaded.value, provider);

  const tokenConfigured = token.trim()
    ? Result.succeed()
    : Result.fail("missing-token" as const);

  if (Result.isFailure(tokenConfigured)) {
    deps.showNotification(
      {
        action: {
          label: t("popup.tokenGuard.openSettings"),
          onClick: () => {
            deps.navigate("pane-settings", { focus: "token" });
          },
        },
        message: t("popup.tokenGuard.missingToken"),
      },
      "error"
    );
  }

  return tokenConfigured;
}
