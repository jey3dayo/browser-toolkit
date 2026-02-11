import { Button } from "@base-ui/react/button";
import { Field } from "@base-ui/react/field";
import { Fieldset } from "@base-ui/react/fieldset";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Select } from "@base-ui/react/select";
import { Separator } from "@base-ui/react/separator";
import { Toggle } from "@base-ui/react/toggle";
import { Result } from "@praha/byethrow";
import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/icon";
import { DEFAULT_OPENAI_MODEL } from "@/openai/settings";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type {
  TestAiTokenRequest,
  TestAiTokenResponse,
  TestOpenAiTokenResponse,
} from "@/popup/runtime";
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

function _isTestOpenAiTokenResponse(
  value: unknown
): value is TestOpenAiTokenResponse {
  // Result type is opaque, so we can't check its structure directly
  // We assume the value is a TestOpenAiTokenResponse if it's an object
  return isRecord(value);
}

function isTestAiTokenResponse(value: unknown): value is TestAiTokenResponse {
  // Result type is opaque, so we can't check its structure directly
  // We assume the value is a TestAiTokenResponse if it's an object
  return isRecord(value);
}

// プロバイダーからトークンキーへのマッピング
function getTokenKey(provider: AiProvider): keyof LocalStorageData {
  switch (provider) {
    case "openai":
      return "openaiApiToken";
    case "anthropic":
      return "anthropicApiToken";
    case "zai":
      return "zaiApiToken";
    default:
      return "openaiApiToken";
  }
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
      props.notify.success("保存しました");
      return;
    }
    props.notify.error("保存に失敗しました");
  };

  const clearLocalString = async (
    key: keyof LocalStorageData,
    onCleared: () => void
  ): Promise<void> => {
    const removed = await props.runtime.storageLocalRemove(key);
    if (Result.isSuccess(removed)) {
      onCleared();
      props.notify.success("削除しました");
      return;
    }
    props.notify.error("削除に失敗しました");
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
      const tokenKey = getTokenKey(resolvedProvider);
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
    const tokenKey = getTokenKey(provider);
    await saveLocalString(tokenKey, token);
  };

  const clearToken = async (): Promise<void> => {
    const tokenKey = getTokenKey(provider);
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
      props.notify.error("バックグラウンドの応答が不正です");
      return;
    }

    const response = responseUnknown.value;
    if (Result.isFailure(response)) {
      props.notify.error(response.error);
      return;
    }

    props.notify.success("トークンOK");
  };

  const savePrompt = async (): Promise<void> => {
    await saveLocalString("aiCustomPrompt", customPrompt);
  };

  const clearPrompt = async (): Promise<void> => {
    await clearLocalString("aiCustomPrompt", () => setCustomPrompt(""));
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
    <div className="card card-stack">
      <div className="stack-sm">
        <h2 className="pane-title">設定</h2>
        <p className="hint">AI設定はこの端末のみ（同期されません）</p>
      </div>

      <Field.Root name="aiProvider">
        <Fieldset.Root
          className="mbu-fieldset"
          render={
            <RadioGroup
              className="mbu-radio-group mbu-radio-group--horizontal"
              onValueChange={(value) => {
                const newProvider = safeParseAiProvider(value);
                if (!newProvider) {
                  return;
                }
                setProvider(newProvider);
                // プロバイダー変更時にモデルをデフォルトにリセット
                const defaultModel = PROVIDER_CONFIGS[newProvider].defaultModel;
                setModel(defaultModel);
                // プロバイダー別トークンをロード
                const tokenKey = getTokenKey(newProvider);
                props.runtime
                  .storageLocalGet([tokenKey])
                  .then((result) => {
                    if (Result.isSuccess(result)) {
                      const raw = result.value as Partial<LocalStorageData>;
                      const tokenValue = raw[tokenKey];
                      setToken(
                        typeof tokenValue === "string" ? tokenValue : ""
                      );
                    }
                  })
                  .catch(() => {
                    // no-op
                  });
                // 保存
                saveProvider(newProvider).catch(() => {
                  // no-op
                });
                saveModel(defaultModel).catch(() => {
                  // no-op
                });
              }}
              value={provider}
            />
          }
        >
          <Fieldset.Legend className="mbu-fieldset-legend">
            AIプロバイダー
          </Fieldset.Legend>
          <Field.Item>
            <Field.Label className="mbu-radio-label">
              <Radio.Root className="mbu-radio-root" value="openai">
                <Radio.Indicator className="mbu-radio-indicator" />
              </Radio.Root>
              OpenAI
            </Field.Label>
          </Field.Item>
          <Field.Item>
            <Field.Label className="mbu-radio-label">
              <Radio.Root className="mbu-radio-root" value="anthropic">
                <Radio.Indicator className="mbu-radio-indicator" />
              </Radio.Root>
              Anthropic (Claude)
            </Field.Label>
          </Field.Item>
          <Field.Item>
            <Field.Label className="mbu-radio-label">
              <Radio.Root className="mbu-radio-root" value="zai">
                <Radio.Indicator className="mbu-radio-indicator" />
              </Radio.Root>
              z.ai
            </Field.Label>
          </Field.Item>
        </Fieldset.Root>
      </Field.Root>

      <Form
        className="stack"
        onFormSubmit={() => {
          saveToken().catch(() => {
            // no-op
          });
        }}
      >
        <Fieldset.Root className="mbu-fieldset stack">
          <Fieldset.Legend className="mbu-fieldset-legend">
            {PROVIDER_CONFIGS[provider].label} API トークン
          </Fieldset.Legend>

          <label className="field" htmlFor={tokenInputId}>
            <span className="field-name">トークン</span>
            <div className="input-with-icon">
              <Input
                className="token-input token-input--with-icon"
                data-testid="ai-token"
                id={tokenInputId}
                onValueChange={setToken}
                ref={props.tokenInputRef}
                type={showToken ? "text" : "password"}
                value={token}
              />
              <Toggle
                aria-controls={tokenInputId}
                aria-label={showToken ? "トークンを隠す" : "トークンを表示する"}
                className="input-icon-toggle"
                data-testid="token-visible"
                onPressedChange={setShowToken}
                pressed={showToken}
                title={showToken ? "トークンを隠す" : "トークンを表示する"}
                type="button"
              >
                <Icon
                  aria-hidden="true"
                  name={showToken ? "eye-off" : "eye"}
                  size={16}
                />
              </Toggle>
            </div>
          </label>
        </Fieldset.Root>

        <div className="button-row">
          <Button
            className="btn btn-primary btn-small"
            data-testid="token-save"
            onClick={() => {
              saveToken().catch(() => {
                // no-op
              });
            }}
            type="button"
          >
            保存
          </Button>
          <Button
            className="btn-delete"
            data-testid="token-clear"
            onClick={() => {
              clearToken().catch(() => {
                // no-op
              });
            }}
            type="button"
          >
            削除
          </Button>
          <Button
            className="btn btn-ghost btn-small"
            data-testid="token-test"
            onClick={() => {
              testToken().catch(() => {
                // no-op
              });
            }}
            type="button"
          >
            トークン確認
          </Button>
        </div>
      </Form>

      <Fieldset.Root className="mbu-fieldset stack">
        <Fieldset.Legend className="mbu-fieldset-legend">
          モデル
        </Fieldset.Legend>

        <div className="field">
          <Select.Root
            name="aiModel"
            onValueChange={(value) => {
              if (typeof value === "string") {
                const normalized = normalizeAiModel(provider, value);
                setModel(normalized);
                saveModel(normalized).catch(() => {
                  // no-op
                });
              }
            }}
            value={model}
          >
            <Select.Trigger
              aria-label="モデル"
              className="token-input mbu-select-trigger"
              data-testid="ai-model"
              type="button"
            >
              <Select.Value className="mbu-select-value" />
              <Select.Icon className="mbu-select-icon">▾</Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner
                className="mbu-select-positioner"
                sideOffset={6}
              >
                <Select.Popup className="mbu-select-popup">
                  <Select.List className="mbu-select-list">
                    {PROVIDER_CONFIGS[provider].models.map((option) => (
                      <Select.Item
                        className="mbu-select-item"
                        key={option}
                        value={option}
                      >
                        <Select.ItemText>{option}</Select.ItemText>
                        <Select.ItemIndicator className="mbu-select-indicator">
                          ✓
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.List>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>
      </Fieldset.Root>

      <Separator className="mbu-separator" />

      <Form
        className="stack"
        onFormSubmit={() => {
          savePrompt().catch(() => {
            // no-op
          });
        }}
      >
        <Fieldset.Root className="mbu-fieldset stack">
          <Fieldset.Legend className="mbu-fieldset-legend">
            追加指示（オプション）
          </Fieldset.Legend>
          <label className="field" htmlFor={promptInputId}>
            <textarea
              className="prompt-input"
              data-testid="custom-prompt"
              id={promptInputId}
              name="aiCustomPrompt"
              onChange={(event) => setCustomPrompt(event.currentTarget.value)}
              rows={3}
              value={customPrompt}
            />
          </label>
        </Fieldset.Root>

        <div className="button-row">
          <Button
            className="btn btn-primary btn-small"
            data-testid="prompt-save"
            onClick={() => {
              savePrompt().catch(() => {
                // no-op
              });
            }}
            type="button"
          >
            保存
          </Button>
          <Button
            className="btn-delete"
            data-testid="prompt-clear"
            onClick={() => {
              clearPrompt().catch(() => {
                // no-op
              });
            }}
            type="button"
          >
            削除
          </Button>
        </div>
      </Form>

      <Separator className="mbu-separator" />

      <Field.Root name="theme">
        <Fieldset.Root
          className="mbu-fieldset"
          render={
            <RadioGroup
              className="mbu-radio-group mbu-radio-group--horizontal"
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
          }
        >
          <Fieldset.Legend className="mbu-fieldset-legend">
            テーマ
          </Fieldset.Legend>
          <Field.Item>
            <Field.Label className="mbu-radio-label">
              <Radio.Root className="mbu-radio-root" value="auto">
                <Radio.Indicator className="mbu-radio-indicator" />
              </Radio.Root>
              自動
            </Field.Label>
          </Field.Item>
          <Field.Item>
            <Field.Label className="mbu-radio-label">
              <Radio.Root className="mbu-radio-root" value="light">
                <Radio.Indicator className="mbu-radio-indicator" />
              </Radio.Root>
              ライト
            </Field.Label>
          </Field.Item>
          <Field.Item>
            <Field.Label className="mbu-radio-label">
              <Radio.Root className="mbu-radio-root" value="dark">
                <Radio.Indicator className="mbu-radio-indicator" />
              </Radio.Root>
              ダーク
            </Field.Label>
          </Field.Item>
        </Fieldset.Root>
      </Field.Root>
    </div>
  );
}
