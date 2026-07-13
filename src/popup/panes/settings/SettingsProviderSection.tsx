import { Result } from "@praha/byethrow";
import { getAiProviderTokenKey } from "@/ai/provider-token";
import { RadioFieldset } from "@/components/shared/RadioFieldset";
import { t } from "@/i18n";
import { SettingsPaneCard } from "@/popup/panes/settings/SettingsPaneLayout";
import type { PopupRuntime } from "@/popup/runtime";
import {
  type AiProvider,
  PROVIDER_CONFIGS,
  safeParseAiProvider,
} from "@/schemas/provider";
import type { LocalStorageData } from "@/storage/types";

export type SettingsProviderSectionProps = {
  runtime: PopupRuntime;
  provider: AiProvider;
  setProvider: (value: AiProvider) => void;
  setModel: (value: string) => void;
  setToken: (value: string) => void;
  saveProvider: (value: AiProvider) => Promise<void>;
  saveModel: (value: string, providerOverride?: AiProvider) => Promise<void>;
};

export function SettingsProviderSection({
  runtime,
  provider,
  setProvider,
  setModel,
  setToken,
  saveProvider,
  saveModel,
}: SettingsProviderSectionProps): React.JSX.Element {
  const handleValueChange = async (value: string): Promise<void> => {
    const newProvider = safeParseAiProvider(value);
    if (!newProvider) {
      return;
    }
    setProvider(newProvider);
    // プロバイダー変更時にモデルをデフォルトにリセット
    const defaultModel = PROVIDER_CONFIGS[newProvider].defaultModel;
    setModel(defaultModel);

    // プロバイダー別トークンをロード（完了を待つ）
    const tokenKey = getAiProviderTokenKey(newProvider);
    try {
      const result = await runtime.storageLocalGet([tokenKey]);
      if (Result.isSuccess(result)) {
        const raw = result.value as Partial<LocalStorageData>;
        const tokenValue = raw[tokenKey];
        setToken(typeof tokenValue === "string" ? tokenValue : "");
      }
    } catch {
      // no-op
    }

    // トークンロード完了後に保存
    try {
      await saveProvider(newProvider);
      await saveModel(defaultModel, newProvider);
    } catch {
      // no-op
    }
  };

  return (
    <SettingsPaneCard section="provider">
      <RadioFieldset
        groups={[
          {
            options: [
              { label: "OpenAI", value: "openai" },
              { label: "Anthropic (Claude)", value: "anthropic" },
              { label: "z.ai", value: "zai" },
            ],
          },
        ]}
        legend={t("settings.provider")}
        name="aiProvider"
        onValueChange={handleValueChange}
        value={provider}
      />
    </SettingsPaneCard>
  );
}
