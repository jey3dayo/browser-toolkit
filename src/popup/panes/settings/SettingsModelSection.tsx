import { Field } from "@/components/shared/Field";
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
  saveModel: (value: string) => Promise<void>;
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
      <Fieldset legend={t("settings.model")} spacing="stack">
        <Field label={t("settings.model")}>
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
        </Field>
      </Fieldset>
    </SettingsPaneCard>
  );
}
