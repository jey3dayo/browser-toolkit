import { Button } from "@/components/shared/Button";
import { Field } from "@/components/shared/Field";
import { Fieldset } from "@/components/shared/Fieldset";
import { Form } from "@/components/shared/Form";
import { ButtonRow } from "@/components/shared/Layout";
import { Textarea } from "@/components/shared/Textarea";
import { t } from "@/i18n";
import { SettingsPaneCard } from "@/popup/panes/settings/SettingsPaneLayout";

export type SettingsPromptSectionProps = {
  customPrompt: string;
  setCustomPrompt: (value: string) => void;
  promptInputId: string;
  savePrompt: () => Promise<void>;
  clearPrompt: () => Promise<void>;
};

export function SettingsPromptSection({
  customPrompt,
  setCustomPrompt,
  promptInputId,
  savePrompt,
  clearPrompt,
}: SettingsPromptSectionProps): React.JSX.Element {
  return (
    <SettingsPaneCard section="prompt">
      <Form
        onFormSubmit={() => {
          savePrompt().catch(() => {
            // no-op
          });
        }}
        variant="stack"
      >
        <Fieldset legend={t("settings.customPromptLegend")} spacing="stack">
          <Field htmlFor={promptInputId} label={t("settings.customPrompt")}>
            <Textarea
              data-testid="custom-prompt"
              id={promptInputId}
              name="aiCustomPrompt"
              onChange={(event) => setCustomPrompt(event.currentTarget.value)}
              rows={3}
              value={customPrompt}
              variant="prompt"
            />
          </Field>
        </Fieldset>

        <ButtonRow>
          <Button
            data-testid="prompt-save"
            onClick={() => {
              savePrompt().catch(() => {
                // no-op
              });
            }}
            size="small"
            type="button"
            variant="primary"
          >
            {t("common.save")}
          </Button>
          <Button
            data-testid="prompt-clear"
            onClick={() => {
              clearPrompt().catch(() => {
                // no-op
              });
            }}
            type="button"
            variant="danger"
          >
            {t("common.delete")}
          </Button>
        </ButtonRow>
      </Form>
    </SettingsPaneCard>
  );
}
