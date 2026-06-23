import { Result } from "@praha/byethrow";
import { cva, type VariantProps } from "class-variance-authority";
import {
  type ComponentPropsWithoutRef,
  useEffect,
  useId,
  useState,
} from "react";
import { getAiProviderTokenKey } from "@/ai/provider-token";
import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { Field } from "@/components/shared/Field";
import { Fieldset } from "@/components/shared/Fieldset";
import { Form } from "@/components/shared/Form";
import { Input, InputWithIcon } from "@/components/shared/Input";
import { ButtonRow, PaneCard, Stack } from "@/components/shared/Layout";
import { RadioFieldset } from "@/components/shared/RadioFieldset";
import { Select } from "@/components/shared/Select";
import { Separator } from "@/components/shared/Separator";
import { Textarea } from "@/components/shared/Textarea";
import { Toggle } from "@/components/shared/Toggle";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { DEFAULT_OPENAI_MODEL } from "@/openai/settings";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { TestAiTokenRequest, TestAiTokenResponse } from "@/popup/runtime";
import {
  type AiProvider,
  normalizeAiModel,
  PROVIDER_CONFIGS,
  safeParseAiProvider,
} from "@/schemas/provider";
import type { LocalStorageData } from "@/storage/types";
import { applyTheme, isTheme, type Theme } from "@/ui/theme";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";
import { isRecord } from "@/utils/guards";

export type SettingsPaneProps = PopupPaneBaseProps & {
  tokenInputRef: React.RefObject<HTMLInputElement | null>;
};

type SettingsPaneCardSection =
  | "provider"
  | "token"
  | "model"
  | "prompt"
  | "theme";

type SettingsPaneCardProps = {
  children: React.ReactNode;
  section: SettingsPaneCardSection;
};

const settingsPaneCardClassName = cva("card settings-card settings-pane-card");
const settingsPaneOverviewClassName = cva("stack-sm settings-pane-overview");

function SettingsPaneCard({
  children,
  section,
}: SettingsPaneCardProps): React.JSX.Element {
  return (
    <section
      className={settingsPaneCardClassName()}
      data-section={section}
      data-testid="settings-card"
    >
      {children}
    </section>
  );
}

function SettingsPaneOverview({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">): React.JSX.Element {
  return (
    <section
      className={settingsPaneOverviewClassName({ className })}
      data-testid="settings-overview"
      {...props}
    />
  );
}

const settingsTokenActionRowVariants = cva("", {
  variants: {
    tone: {
      danger: "settings-token-danger-actions",
      primary: "settings-token-primary-actions",
    },
  },
});

type SettingsTokenActionRowProps = React.ComponentProps<typeof ButtonRow> &
  VariantProps<typeof settingsTokenActionRowVariants>;

function SettingsTokenActionRow({
  className,
  tone,
  ...props
}: SettingsTokenActionRowProps): React.JSX.Element {
  return (
    <ButtonRow
      className={settingsTokenActionRowVariants({ className, tone })}
      {...props}
    />
  );
}

const settingsThemeOptionGroupVariants = cva("stack-sm", {
  variants: {
    variant: {
      auto: "settings-theme-auto-option",
      primary: "settings-theme-primary-options",
    },
  },
});

function isTestAiTokenResponse(value: unknown): value is TestAiTokenResponse {
  // Result type is opaque, so we can't check its structure directly
  // We assume the value is a TestAiTokenResponse if it's an object
  return isRecord(value);
}

export function SettingsPane(props: SettingsPaneProps): React.JSX.Element {
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
    const saved = await props.runtime.storageLocalSet(payload);
    if (Result.isSuccess(saved)) {
      props.notify.success(t("settings.success.saved"));
      return;
    }
    props.notify.error(t("settings.errors.saveFailed"));
  };

  const clearLocalString = async (
    keys: (keyof LocalStorageData)[] | keyof LocalStorageData,
    onCleared: () => void
  ): Promise<void> => {
    const removed = await props.runtime.storageLocalRemove(keys);
    if (Result.isSuccess(removed)) {
      onCleared();
      props.notify.success(t("settings.success.deleted"));
      return;
    }
    props.notify.error(t("settings.errors.deleteFailed"));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await props.runtime.storageLocalGet([
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
  }, [props.runtime]);

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
    const responseUnknown = await props.runtime.sendMessageToBackground<
      TestAiTokenRequest,
      unknown
    >({
      action: "testAiToken",
      token: tokenOverride,
    });

    if (Result.isFailure(responseUnknown)) {
      props.notify.error(responseUnknown.error);
      return;
    }

    if (!isTestAiTokenResponse(responseUnknown.value)) {
      props.notify.error(t("settings.errors.invalidBackgroundResponse"));
      return;
    }

    const response = responseUnknown.value;
    if (Result.isFailure(response)) {
      props.notify.error(response.error);
      return;
    }

    props.notify.success(t("settings.success.tokenOk"));
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
    await props.runtime.storageLocalSet({
      aiModel: normalized,
    });
  };

  const saveProvider = async (value: AiProvider): Promise<void> => {
    await props.runtime.storageLocalSet({
      aiProvider: value,
    });
  };

  const saveTheme = async (value: Theme): Promise<void> => {
    if (!isTheme(value)) {
      return;
    }
    await props.runtime.storageLocalSet({ theme: value });
  };

  return (
    <PaneCard className="settings-surface settings-pane">
      <SettingsPaneOverview>
        <PaneTitle>{t("settings.title")}</PaneTitle>
        <Hint>{t("settings.description")}</Hint>
      </SettingsPaneOverview>

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
          onValueChange={async (value) => {
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
              const result = await props.runtime.storageLocalGet([tokenKey]);
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
              await saveModel(defaultModel);
            } catch {
              // no-op
            }
          }}
          value={provider}
        />
      </SettingsPaneCard>

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
              provider: PROVIDER_CONFIGS[provider].label,
            })}
            spacing="stack"
          >
            <Field htmlFor={tokenInputId} label={t("settings.token")}>
              <InputWithIcon>
                <Input
                  data-testid="ai-token"
                  id={tokenInputId}
                  onValueChange={setToken}
                  ref={props.tokenInputRef}
                  type={showToken ? "text" : "password"}
                  value={token}
                  variant="token"
                  withIcon
                />
                <Toggle
                  aria-controls={tokenInputId}
                  aria-label={
                    showToken
                      ? t("settings.hideToken")
                      : t("settings.showToken")
                  }
                  data-testid="token-visible"
                  onPressedChange={setShowToken}
                  pressed={showToken}
                  title={
                    showToken
                      ? t("settings.hideToken")
                      : t("settings.showToken")
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
              options={PROVIDER_CONFIGS[provider].models.map((option) => ({
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

      <Separator />

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

      <Separator />

      <SettingsPaneCard section="theme">
        <RadioFieldset
          groups={[
            {
              className: settingsThemeOptionGroupVariants({
                variant: "primary",
              }),
              options: [
                { label: t("theme.dark"), value: "dark" },
                { label: t("theme.light"), value: "light" },
              ],
              testId: "theme-primary-options",
            },
            {
              className: settingsThemeOptionGroupVariants({
                variant: "auto",
              }),
              options: [{ label: t("theme.auto"), value: "auto" }],
              testId: "theme-auto-option",
            },
          ]}
          legend={t("settings.theme")}
          name="theme"
          onValueChange={(value) => {
            if (!isTheme(value)) {
              return;
            }
            setTheme(value);
            applyTheme(value, document);
            saveTheme(value).catch(() => {
              // no-op
            });
          }}
          value={theme}
        />
      </SettingsPaneCard>
    </PaneCard>
  );
}
