import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import { SortableList } from "@/components/SortableList";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { Form } from "@/components/shared/Form";
import { Input } from "@/components/shared/Input";
import {
  PaneCard,
  PatternInputRow,
  RowBetween,
  Stack,
} from "@/components/shared/Layout";
import { ListItemRow } from "@/components/shared/ListItemRow";
import { Select } from "@/components/shared/Select";
import { Switch } from "@/components/shared/Switch";
import { EmptyMessage, Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
import { requireTrimmedString } from "@/popup/utils/required-input";
import { isSearchEngineEncoding } from "@/schemas/search_engine_encoding";
import {
  ENCODING_LABELS,
  SEARCH_ENGINE_ENCODINGS,
  type SearchEngine,
  type SearchEngineEncoding,
} from "@/search_engine_types";
import {
  DEFAULT_SEARCH_ENGINES,
  isValidUrlTemplate,
  MAX_SEARCH_ENGINES,
  normalizeSearchEngines,
} from "@/search_engines";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export type SearchEnginesPaneProps = PopupPaneBaseProps;

export function SearchEnginesPane(
  props: SearchEnginesPaneProps
): React.JSX.Element {
  const [engines, setEngines] = useState<SearchEngine[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [encodingInput, setEncodingInput] =
    useState<SearchEngineEncoding>("utf-8");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await props.runtime.storageSyncGet(["searchEngines"]);
      if (cancelled) {
        return;
      }

      // ストレージ読み込み失敗時もデフォルト値を表示
      if (Result.isFailure(data)) {
        setEngines(DEFAULT_SEARCH_ENGINES);
        return;
      }

      const existing = normalizeSearchEngines(data.value.searchEngines);
      const enginesResult =
        existing.length > 0 ? existing : DEFAULT_SEARCH_ENGINES;
      setEngines(enginesResult);
    })().catch((error) => {
      debugLog(
        "SearchEnginesPane.useEffect[props.runtime]",
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

  const saveEngines = async (
    nextEngines: SearchEngine[]
  ): Promise<Result.Result<void, string>> => {
    // ストレージ保存のみ。メニューは background.ts の storage.onChanged で自動更新される
    return await props.runtime.storageSyncSet({
      searchEngines: nextEngines,
    });
  };

  const toggleEngineEnabled = async (
    engineId: string,
    checked: boolean
  ): Promise<void> => {
    const next = engines.map((engine) =>
      engine.id === engineId ? { ...engine, enabled: checked } : engine
    );
    await persistWithRollback({
      applyNext: () => {
        setEngines(next);
      },
      rollback: () => {
        setEngines(engines);
      },
      persist: () => saveEngines(next),
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.saveFailed"));
      },
    });
  };

  const addEngine = async (): Promise<void> => {
    const name = requireTrimmedString({
      value: nameInput,
      emptyMessage: t("searchEngines.errors.nameRequired"),
      notify: props.notify,
    });
    if (!name) {
      return;
    }

    const urlTemplate = requireTrimmedString({
      value: urlInput,
      emptyMessage: t("searchEngines.errors.urlTemplateRequired"),
      notify: props.notify,
    });
    if (!urlTemplate) {
      return;
    }

    if (!isValidUrlTemplate(urlTemplate)) {
      props.notify.error(t("searchEngines.errors.queryRequired"));
      return;
    }

    if (engines.some((engine) => engine.name === name)) {
      props.notify.info(t("searchEngines.info.duplicate"));
      return;
    }

    if (engines.length >= MAX_SEARCH_ENGINES) {
      props.notify.error(
        t("searchEngines.errors.max", { count: MAX_SEARCH_ENGINES })
      );
      return;
    }

    const newEngine: SearchEngine = {
      id: `custom:${Date.now()}`,
      name,
      urlTemplate,
      enabled: true,
      ...(encodingInput === "shift_jis"
        ? { encoding: "shift_jis" as const }
        : {}),
    };

    const next: SearchEngine[] = [...engines, newEngine];
    await persistWithRollback({
      applyNext: () => {
        setEngines(next);
        setNameInput("");
        setUrlInput("");
        setEncodingInput("utf-8");
      },
      rollback: () => {
        setEngines(engines);
      },
      persist: () => saveEngines(next),
      onSuccess: () => {
        props.notify.success(t("searchEngines.success.added"));
      },
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.addFailed"));
      },
    });
  };

  const removeEngine = async (engineId: string): Promise<void> => {
    const next = engines.filter((engine) => engine.id !== engineId);
    await persistWithRollback({
      applyNext: () => {
        setEngines(next);
      },
      rollback: () => {
        setEngines(engines);
      },
      persist: () => saveEngines(next),
      onSuccess: () => {
        props.notify.success(t("searchEngines.success.deleted"));
      },
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.deleteFailed"));
      },
    });
  };

  const resetToDefaults = async (): Promise<void> => {
    await persistWithRollback({
      applyNext: () => {
        setEngines(DEFAULT_SEARCH_ENGINES);
      },
      rollback: () => {
        setEngines(engines);
      },
      persist: () => saveEngines(DEFAULT_SEARCH_ENGINES),
      onSuccess: () => {
        props.notify.success(t("searchEngines.success.reset"));
      },
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.resetFailed"));
      },
    });
  };

  const handleReorder = async (
    reorderedEngines: SearchEngine[]
  ): Promise<void> => {
    await persistWithRollback({
      applyNext: () => {
        setEngines(reorderedEngines);
      },
      rollback: () => {
        setEngines(engines);
      },
      persist: () => saveEngines(reorderedEngines),
      onSuccess: () => {
        props.notify.success(t("searchEngines.success.reordered"));
      },
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.reorderFailed"));
      },
    });
  };

  return (
    <PaneCard>
      <RowBetween>
        <PaneTitle>{t("searchEngines.title")}</PaneTitle>
        <Button
          data-testid="reset-search-engines"
          onClick={() => {
            resetToDefaults().catch(() => {
              // no-op
            });
          }}
          size="small"
          type="button"
          variant="ghost"
        >
          {t("common.resetToDefaults")}
        </Button>
      </RowBetween>

      <Stack>
        <Hint as="div">{t("searchEngines.description")}</Hint>
        <Hint as="div">
          {t("searchEngines.urlTemplateHint", { query: "{query}" })}
        </Hint>

        <Form
          onFormSubmit={() => {
            addEngine().catch(() => {
              // no-op
            });
          }}
          variant="patternGroupWrap"
        >
          <PatternInputRow>
            <Input
              data-testid="search-engine-name"
              onValueChange={setNameInput}
              placeholder={t("searchEngines.namePlaceholder")}
              type="text"
              value={nameInput}
              variant="pattern"
            />
            <Select
              ariaLabel={t("searchEngines.encoding")}
              onValueChange={(value) => {
                if (isSearchEngineEncoding(value)) {
                  setEncodingInput(value);
                }
              }}
              options={SEARCH_ENGINE_ENCODINGS.map((enc) => ({
                label: ENCODING_LABELS[enc],
                value: enc,
              }))}
              triggerTestId="search-engine-encoding"
              value={encodingInput}
              variant="pattern"
            />
          </PatternInputRow>
          <PatternInputRow>
            <Input
              data-testid="search-engine-url"
              onValueChange={setUrlInput}
              placeholder="URLテンプレート（例: https://google.com/search?q={query}）"
              type="text"
              value={urlInput}
              variant="pattern"
            />
            <Button
              data-testid="add-search-engine"
              onClick={() => {
                addEngine().catch(() => {
                  // no-op
                });
              }}
              size="small"
              type="button"
              variant="ghost"
            >
              {t("common.add")}
            </Button>
          </PatternInputRow>
        </Form>

        {engines.length > 0 ? (
          <SortableList
            items={engines}
            onReorder={(reordered) => {
              handleReorder(reordered).catch(() => {
                // no-op
              });
            }}
          >
            {(engine) => (
              <ListItemRow
                actions={
                  <>
                    <Switch
                      aria-label={t("searchEngines.enableAria", {
                        name: engine.name,
                      })}
                      checked={engine.enabled}
                      data-testid={`engine-enabled-${engine.id}`}
                      onCheckedChange={(checked) => {
                        toggleEngineEnabled(engine.id, checked).catch(() => {
                          // no-op
                        });
                      }}
                    />
                    {!engine.id.startsWith("builtin:") && (
                      <Button
                        data-testid={`remove-engine-${engine.id}`}
                        onClick={() => {
                          removeEngine(engine.id).catch(() => {
                            // no-op
                          });
                        }}
                        type="button"
                        variant="danger"
                      >
                        {t("common.delete")}
                      </Button>
                    )}
                  </>
                }
                meta={engine.urlTemplate}
                title={
                  <>
                    {engine.name}
                    {engine.encoding && engine.encoding !== "utf-8" && (
                      <Badge variant="badgeInfo">
                        {ENCODING_LABELS[engine.encoding]}
                      </Badge>
                    )}
                  </>
                }
              />
            )}
          </SortableList>
        ) : (
          <EmptyMessage>{t("searchEngines.empty")}</EmptyMessage>
        )}
      </Stack>
    </PaneCard>
  );
}
