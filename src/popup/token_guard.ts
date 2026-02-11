import { Result } from "@praha/byethrow";
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
  navigateToPane: (paneId: string) => void;
  focusTokenInput: () => void;
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
    deps.showNotification("AI設定の読み込みに失敗しました。", "error");
    deps.navigateToPane("pane-settings");
    deps.focusTokenInput();
    return Result.fail("storage-error");
  }
  if (Result.isFailure(loaded)) {
    deps.showNotification("AI設定の読み込みに失敗しました。", "error");
    deps.navigateToPane("pane-settings");
    deps.focusTokenInput();
    return Result.fail("storage-error");
  }

  // プロバイダー別トークン取得
  const provider = loaded.value.aiProvider ?? "openai";
  let token = "";
  switch (provider) {
    case "openai":
      token = loaded.value.openaiApiToken ?? "";
      break;
    case "anthropic":
      token = loaded.value.anthropicApiToken ?? "";
      break;
    case "zai":
      token = loaded.value.zaiApiToken ?? "";
      break;
    default:
      token = loaded.value.openaiApiToken ?? "";
      break;
  }

  const tokenConfigured = token.trim()
    ? Result.succeed()
    : Result.fail("missing-token" as const);

  if (Result.isFailure(tokenConfigured)) {
    deps.showNotification(
      {
        message: "API Tokenが未設定です",
        action: {
          label: "→ 設定を開く",
          onClick: () => {
            deps.navigateToPane("pane-settings");
            deps.focusTokenInput();
          },
        },
      },
      "error"
    );
  }

  return tokenConfigured;
}
