import { useCallback } from "react";
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
  const handleFormSubmit = useCallback(() => {
    savePrompt().catch(() => {
      // no-op
    });
  }, [savePrompt]);

  const handlePromptChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      setCustomPrompt(event.currentTarget.value),
    [setCustomPrompt]
  );

  const handleClearPrompt = useCallback(() => {
    clearPrompt().catch(() => {
      // no-op
    });
  }, [clearPrompt]);

  return (
    <SettingsPaneCard section="prompt">
      <Form onFormSubmit={handleFormSubmit} variant="stack">
        <Fieldset legend={t("settings.customPromptLegend")} spacing="stack">
          <Field htmlFor={promptInputId} label={t("settings.customPrompt")}>
            <Textarea
              data-testid="custom-prompt"
              id={promptInputId}
              name="aiCustomPrompt"
              onChange={handlePromptChange}
              rows={3}
              value={customPrompt}
              variant="prompt"
            />
          </Field>
        </Fieldset>

        <ButtonRow>
          <Button
            data-testid="prompt-save"
            onClick={handleFormSubmit}
            size="small"
            type="button"
            variant="primary"
          >
            {t("common.save")}
          </Button>
          <Button
            data-testid="prompt-clear"
            onClick={handleClearPrompt}
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
