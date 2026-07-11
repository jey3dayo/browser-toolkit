import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { Field } from "@/components/shared/Field";
import { Fieldset } from "@/components/shared/Fieldset";
import { Form } from "@/components/shared/Form";
import { Input, InputWithIcon } from "@/components/shared/Input";
import { Stack } from "@/components/shared/Layout";
import { Toggle } from "@/components/shared/Toggle";
import { t } from "@/i18n";
import {
  SettingsPaneCard,
  SettingsTokenActionRow,
} from "@/popup/panes/settings/SettingsPaneLayout";
import type { AiProvider, PROVIDER_CONFIGS } from "@/schemas/provider";

export type SettingsTokenSectionProps = {
  provider: AiProvider;
  providerConfigs: typeof PROVIDER_CONFIGS;
  token: string;
  setToken: (value: string) => void;
  showToken: boolean;
  setShowToken: (value: boolean) => void;
  tokenInputId: string;
  tokenInputRef: React.RefObject<HTMLInputElement | null>;
  saveToken: () => Promise<void>;
  clearToken: () => Promise<void>;
  testToken: () => Promise<void>;
};

export function SettingsTokenSection({
  provider,
  providerConfigs,
  token,
  setToken,
  showToken,
  setShowToken,
  tokenInputId,
  tokenInputRef,
  saveToken,
  clearToken,
  testToken,
}: SettingsTokenSectionProps): React.JSX.Element {
  return (
    <SettingsPaneCard section="token">
      <Form
        onFormSubmit={() => {
          saveToken().catch(() => {
            // no-op
          });
        }}
        variant="stack"
      >
        <Fieldset
          legend={t("settings.apiToken", {
            provider: providerConfigs[provider].label,
          })}
          spacing="stack"
        >
          <Field htmlFor={tokenInputId} label={t("settings.token")}>
            <InputWithIcon>
              <Input
                data-testid="ai-token"
                id={tokenInputId}
                onValueChange={setToken}
                ref={tokenInputRef}
                type={showToken ? "text" : "password"}
                value={token}
                variant="token"
                withIcon
              />
              <Toggle
                aria-controls={tokenInputId}
                aria-label={
                  showToken ? t("settings.hideToken") : t("settings.showToken")
                }
                data-testid="token-visible"
                onPressedChange={setShowToken}
                pressed={showToken}
                title={
                  showToken ? t("settings.hideToken") : t("settings.showToken")
                }
                type="button"
                variant="icon"
              >
                <Icon
                  aria-hidden="true"
                  name={showToken ? "eye-off" : "eye"}
                  size={16}
                />
              </Toggle>
            </InputWithIcon>
          </Field>
        </Fieldset>

        <Stack spacing="small">
          <SettingsTokenActionRow
            data-testid="token-primary-actions"
            tone="primary"
          >
            <Button
              data-testid="token-save"
              onClick={() => {
                saveToken().catch(() => {
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
              data-testid="token-test"
              onClick={() => {
                testToken().catch(() => {
                  // no-op
                });
              }}
              size="small"
              type="button"
              variant="ghost"
            >
              {t("settings.testToken")}
            </Button>
          </SettingsTokenActionRow>
          <SettingsTokenActionRow
            data-testid="token-danger-actions"
            tone="danger"
          >
            <Button
              data-testid="token-clear"
              onClick={() => {
                clearToken().catch(() => {
                  // no-op
                });
              }}
              type="button"
              variant="danger"
            >
              {t("common.delete")}
            </Button>
          </SettingsTokenActionRow>
        </Stack>
      </Form>
    </SettingsPaneCard>
  );
}
