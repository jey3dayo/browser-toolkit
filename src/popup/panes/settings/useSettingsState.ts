import { Result } from "@praha/byethrow";
import { useEffect, useId, useState } from "react";
import { getAiProviderTokenKey } from "@/ai/provider-token";
import { t } from "@/i18n";
import { DEFAULT_OPENAI_MODEL } from "@/openai/settings";
import { isTestAiTokenResponse } from "@/popup/panes/settings/isTestAiTokenResponse";
import type {
  PopupRuntime,
  TestAiTokenRequest,
  TestAiTokenResponse,
} from "@/popup/runtime";
import {
  type AiProvider,
  normalizeAiModel,
  safeParseAiProvider,
} from "@/schemas/provider";
import type { LocalStorageData } from "@/storage/types";
import { applyTheme, isTheme, type Theme } from "@/ui/theme";
import type { Notifier } from "@/ui/toast";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export type UseSettingsStateParams = {
  runtime: PopupRuntime;
  notify: Notifier;
};

export type UseSettingsState = {
  provider: AiProvider;
  setProvider: (value: AiProvider) => void;
  token: string;
  setToken: (value: string) => void;
  showToken: boolean;
  setShowToken: (value: boolean) => void;
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  model: string;
  setModel: (value: string) => void;
  theme: Theme;
  setTheme: (value: Theme) => void;
  tokenInputId: string;
  promptInputId: string;
  saveToken: () => Promise<void>;
  clearToken: () => Promise<void>;
  testToken: () => Promise<void>;
  savePrompt: () => Promise<void>;
  clearPrompt: () => Promise<void>;
  saveModel: (value: string) => Promise<void>;
  saveProvider: (value: AiProvider) => Promise<void>;
  saveTheme: (value: Theme) => Promise<void>;
};

export function useSettingsState(
  params: UseSettingsStateParams
): UseSettingsState {
  const { runtime, notify } = params;
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [model, setModel] = useState<string>(DEFAULT_OPENAI_MODEL);
  const [theme, setTheme] = useState<Theme>("auto");
  const tokenInputId = useId();
  const promptInputId = useId();

  const saveLocalString = async (
    key: keyof LocalStorageData,
    value: string
  ): Promise<void> => {
    const payload: Record<string, string> = {};
    payload[key] = value;
    const saved = await runtime.storageLocalSet(payload);
    if (Result.isSuccess(saved)) {
      notify.success(t("settings.success.saved"));
      return;
    }
    notify.error(t("settings.errors.saveFailed"));
  };

  const clearLocalString = async (
    keys: (keyof LocalStorageData)[] | keyof LocalStorageData,
    onCleared: () => void
  ): Promise<void> => {
    const removed = await runtime.storageLocalRemove(keys);
    if (Result.isSuccess(removed)) {
      onCleared();
      notify.success(t("settings.success.deleted"));
      return;
    }
    notify.error(t("settings.errors.deleteFailed"));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await runtime.storageLocalGet([
        "aiProvider",
        "aiModel",
        "aiCustomPrompt",
        "openaiApiToken",
        "anthropicApiToken",
        "zaiApiToken",
        "openaiCustomPrompt",
        "openaiModel",
        "theme",
      ]);
      if (Result.isFailure(loaded) || cancelled) {
        return;
      }
      const raw: Partial<LocalStorageData> = loaded.value;

      // プロバイダー（新キー優先、旧キーフォールバック）
      const providerValue = raw.aiProvider ?? "openai";
      const resolvedProvider = safeParseAiProvider(providerValue) ?? "openai";
      setProvider(resolvedProvider);

      // プロバイダー別トークン
      const tokenKey = getAiProviderTokenKey(resolvedProvider);
      const tokenValue = raw[tokenKey];
      setToken(typeof tokenValue === "string" ? tokenValue : "");

      // カスタムプロンプト（新キー優先、旧キーフォールバック）
      setCustomPrompt(raw.aiCustomPrompt ?? raw.openaiCustomPrompt ?? "");

      // モデル（新キー優先、旧キーフォールバック、プロバイダー別に正規化）
      const modelValue = raw.aiModel ?? raw.openaiModel;
      const resolvedModel = normalizeAiModel(resolvedProvider, modelValue);
      setModel(resolvedModel);

      // テーマ
      const resolvedTheme: Theme = isTheme(raw.theme) ? raw.theme : "auto";
      setTheme(resolvedTheme);
      applyTheme(resolvedTheme, document);
    })().catch((error) => {
      debugLog(
        "SettingsPane.useEffect[props.runtime]",
        "failed",
        { error: formatErrorLog("", {}, error) },
        "error"
      ).catch(() => {
        // no-op
      });
    });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  const saveToken = async (): Promise<void> => {
    const tokenKey = getAiProviderTokenKey(provider);
    await saveLocalString(tokenKey, token);
  };

  const clearToken = async (): Promise<void> => {
    const tokenKey = getAiProviderTokenKey(provider);
    await clearLocalString(tokenKey, () => setToken(""));
  };

  const testToken = async (): Promise<void> => {
    const tokenOverride = token.trim() ? token.trim() : undefined;
    const responseUnknown = await runtime.sendMessageToBackground<
      TestAiTokenRequest,
      unknown
    >({
      action: "testAiToken",
      token: tokenOverride,
    });

    if (Result.isFailure(responseUnknown)) {
      notify.error(responseUnknown.error);
      return;
    }

    if (!isTestAiTokenResponse(responseUnknown.value)) {
      notify.error(t("settings.errors.invalidBackgroundResponse"));
      return;
    }

    const response: TestAiTokenResponse = responseUnknown.value;
    if (Result.isFailure(response)) {
      notify.error(response.error);
      return;
    }

    notify.success(t("settings.success.tokenOk"));
  };

  const savePrompt = async (): Promise<void> => {
    await saveLocalString("aiCustomPrompt", customPrompt);
  };

  const clearPrompt = async (): Promise<void> => {
    await clearLocalString(["aiCustomPrompt", "openaiCustomPrompt"], () =>
      setCustomPrompt("")
    );
  };

  const saveModel = async (value: string): Promise<void> => {
    const normalized = normalizeAiModel(provider, value);
    await runtime.storageLocalSet({
      aiModel: normalized,
    });
  };

  const saveProvider = async (value: AiProvider): Promise<void> => {
    await runtime.storageLocalSet({
      aiProvider: value,
    });
  };

  const saveTheme = async (value: Theme): Promise<void> => {
    if (!isTheme(value)) {
      return;
    }
    await runtime.storageLocalSet({ theme: value });
  };

  return {
    provider,
    setProvider,
    token,
    setToken,
    showToken,
    setShowToken,
    customPrompt,
    setCustomPrompt,
    model,
    setModel,
    theme,
    setTheme,
    tokenInputId,
    promptInputId,
    saveToken,
    clearToken,
    testToken,
    savePrompt,
    clearPrompt,
    saveModel,
    saveProvider,
    saveTheme,
  };
}
