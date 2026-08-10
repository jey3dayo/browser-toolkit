import { Fieldset } from "@/components/shared/Fieldset";
import { Select } from "@/components/shared/Select";
import { t } from "@/i18n";
import { SettingsPaneCard } from "@/popup/panes/settings/SettingsPaneLayout";
import {
  type AiProvider,
  normalizeAiModel,
  type PROVIDER_CONFIGS,
} from "@/schemas/provider";

export type SettingsModelSectionProps = {
  provider: AiProvider;
  providerConfigs: typeof PROVIDER_CONFIGS;
  model: string;
  setModel: (value: string) => void;
  saveModel: (value: string, providerOverride?: AiProvider) => Promise<void>;
};

export function SettingsModelSection({
  provider,
  providerConfigs,
  model,
  setModel,
  saveModel,
}: SettingsModelSectionProps): React.JSX.Element {
  return (
    <SettingsPaneCard section="model">
      {/* legend がこのカード唯一の可視ラベル。以前は同じ t("settings.model") を
          Field label にも渡していて「モデル」が二重に表示され、しかもその Field は
          htmlFor 未指定のため <label> ではなく <span> になっていた（コントロールと
          紐付かない見せかけのラベル）。Select のトリガは button なので、
          アクセシブル名は ariaLabel が担う。 */}
      <Fieldset legend={t("settings.model")} spacing="stack">
        <Select
          ariaLabel={t("settings.model")}
          name="aiModel"
          onValueChange={(value) => {
            if (value === null) {
              return;
            }
            const normalized = normalizeAiModel(provider, value);
            setModel(normalized);
            saveModel(normalized).catch(() => {
              // no-op
            });
          }}
          options={providerConfigs[provider].models.map((option) => ({
            label: option,
            value: option,
          }))}
          triggerTestId="ai-model"
          value={model}
          variant="token"
        />
      </Fieldset>
    </SettingsPaneCard>
  );
}
