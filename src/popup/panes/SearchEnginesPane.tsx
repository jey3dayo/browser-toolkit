import { Button } from "@base-ui/react/button";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { Switch } from "@base-ui/react/switch";
import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import { SortableList } from "@/components/SortableList";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
import {
  DEFAULT_SEARCH_ENGINES,
  isValidUrlTemplate,
  MAX_SEARCH_ENGINES,
  normalizeSearchEngines,
  SEARCH_ENGINE_ENCODINGS,
  type SearchEngine,
  type SearchEngineEncoding,
} from "@/search_engines";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

const ENCODING_LABELS: Record<SearchEngineEncoding, string> = {
  "utf-8": "UTF-8",
  shift_jis: "Shift_JIS",
};

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
        props.notify.error("保存に失敗しました");
      },
    });
  };

  const addEngine = async (): Promise<void> => {
    const name = nameInput.trim();
    const urlTemplate = urlInput.trim();

    if (!name) {
      props.notify.error("検索エンジン名を入力してください");
      return;
    }

    if (!urlTemplate) {
      props.notify.error("URLテンプレートを入力してください");
      return;
    }

    if (!isValidUrlTemplate(urlTemplate)) {
      props.notify.error("URLテンプレートに {query} を含めてください");
      return;
    }

    if (engines.some((engine) => engine.name === name)) {
      props.notify.info("既に同じ名前の検索エンジンが存在します");
      return;
    }

    if (engines.length >= MAX_SEARCH_ENGINES) {
      props.notify.error(`検索エンジンは最大${MAX_SEARCH_ENGINES}個までです`);
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
        props.notify.success("追加しました");
      },
      onFailure: () => {
        props.notify.error("追加に失敗しました");
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
        props.notify.success("削除しました");
      },
      onFailure: () => {
        props.notify.error("削除に失敗しました");
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
        props.notify.success("デフォルトに戻しました");
      },
      onFailure: () => {
        props.notify.error("リセットに失敗しました");
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
        props.notify.success("並び替えを保存しました");
      },
      onFailure: () => {
        props.notify.error("並び替えの保存に失敗しました");
      },
    });
  };

  return (
    <div className="card card-stack">
      <div className="row-between">
        <h2 className="pane-title">検索エンジン</h2>
        <Button
          className="btn btn-ghost btn-small"
          data-testid="reset-search-engines"
          onClick={() => {
            resetToDefaults().catch(() => {
              // no-op
            });
          }}
          type="button"
        >
          デフォルトに戻す
        </Button>
      </div>

      <div className="stack">
        <div className="hint">
          選択したテキストを検索エンジンで検索できます。
        </div>
        <div className="hint">
          URLテンプレートには <code>{"{query}"}</code>{" "}
          を含めてください（選択テキストに置き換わります）
        </div>

        <Form
          className="pattern-input-group pattern-input-group--wrap"
          onFormSubmit={() => {
            addEngine().catch(() => {
              // no-op
            });
          }}
        >
          <Input
            className="pattern-input"
            data-testid="search-engine-name"
            onValueChange={setNameInput}
            placeholder="検索エンジン名（例: Google）"
            type="text"
            value={nameInput}
          />
          <Input
            className="pattern-input"
            data-testid="search-engine-url"
            onValueChange={setUrlInput}
            placeholder="URLテンプレート（例: https://google.com/search?q={query}）"
            type="text"
            value={urlInput}
          />
          <div className="pattern-input-row">
            <select
              className="pattern-input pattern-input--select"
              data-testid="search-engine-encoding"
              onChange={(e) =>
                setEncodingInput(e.target.value as SearchEngineEncoding)
              }
              value={encodingInput}
            >
              {SEARCH_ENGINE_ENCODINGS.map((enc) => (
                <option key={enc} value={enc}>
                  {ENCODING_LABELS[enc]}
                </option>
              ))}
            </select>
            <Button
              className="btn btn-ghost btn-small"
              data-testid="add-search-engine"
              onClick={() => {
                addEngine().catch(() => {
                  // no-op
                });
              }}
              type="button"
            >
              追加
            </Button>
          </div>
        </Form>

        {engines.length > 0 ? (
          <SortableList
            items={engines}
            onReorder={(reordered) => {
              handleReorder(reordered).catch(() => {
                // no-op
              });
            }}
            renderItem={(engine) => (
              <div className="search-engine-item">
                <div className="search-engine-content">
                  <strong className="search-engine-name">
                    {engine.name}
                    {engine.encoding && engine.encoding !== "utf-8" && (
                      <span className="badge badge-info">
                        {ENCODING_LABELS[engine.encoding]}
                      </span>
                    )}
                  </strong>
                  <code className="search-engine-url">
                    {engine.urlTemplate}
                  </code>
                </div>
                <div className="search-engine-controls">
                  <Switch.Root
                    aria-label={`${engine.name}を有効化`}
                    checked={engine.enabled}
                    className="mbu-switch"
                    data-testid={`engine-enabled-${engine.id}`}
                    onCheckedChange={(checked) => {
                      toggleEngineEnabled(engine.id, checked).catch(() => {
                        // no-op
                      });
                    }}
                  >
                    <Switch.Thumb className="mbu-switch-thumb" />
                  </Switch.Root>
                  {!engine.id.startsWith("builtin:") && (
                    <Button
                      className="btn-delete"
                      data-testid={`remove-engine-${engine.id}`}
                      onClick={() => {
                        removeEngine(engine.id).catch(() => {
                          // no-op
                        });
                      }}
                      type="button"
                    >
                      削除
                    </Button>
                  )}
                </div>
              </div>
            )}
          />
        ) : (
          <p className="empty-message">検索エンジンが登録されていません</p>
        )}
      </div>
    </div>
  );
}
