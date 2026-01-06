import { Button } from "@base-ui/react/button";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { Switch } from "@base-ui/react/switch";
import { Result } from "@praha/byethrow";
import { useEffect, useId, useState } from "react";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { EnableTableSortMessage } from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";

export type TablePaneProps = PopupPaneBaseProps;

function normalizePatterns(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 200);
}

export function TablePane(props: TablePaneProps): React.JSX.Element {
  const [autoEnable, setAutoEnable] = useState(false);
  const [enableRowFilter, setEnableRowFilter] = useState(false);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [patternInput, setPatternInput] = useState("");
  const autoEnableLabelId = useId();
  const rowFilterLabelId = useId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await props.runtime.storageSyncGet([
        "domainPatterns",
        "autoEnableSort",
        "enableRowFilter",
      ]);
      if (Result.isFailure(data)) {
        return;
      }
      if (cancelled) {
        return;
      }
      setAutoEnable(Boolean(data.value.autoEnableSort));
      setEnableRowFilter(Boolean(data.value.enableRowFilter));
      setPatterns(normalizePatterns(data.value.domainPatterns));
    })().catch(() => {
      // no-op
    });
    return () => {
      cancelled = true;
    };
  }, [props.runtime]);

  const enableNow = async (): Promise<void> => {
    const tabIdResult = await props.runtime.getActiveTabId();
    if (Result.isFailure(tabIdResult)) {
      props.notify.error(tabIdResult.error);
      return;
    }
    const tabId = tabIdResult.value;
    if (tabId === null) {
      props.notify.error("有効なタブが見つかりません");
      return;
    }

    const sent = await props.runtime.sendMessageToTab<
      EnableTableSortMessage,
      unknown
    >(tabId, { action: "enableTableSort" });
    if (Result.isFailure(sent)) {
      props.notify.error(sent.error);
      return;
    }

    props.notify.success("テーブルソートを有効化しました");
  };

  const toggleAutoEnable = async (checked: boolean): Promise<void> => {
    setAutoEnable(checked);
    const saved = await props.runtime.storageSyncSet({
      autoEnableSort: checked,
    });
    if (Result.isSuccess(saved)) {
      props.notify.success("保存しました");
      return;
    }
    props.notify.error("保存に失敗しました");
    setAutoEnable(!checked);
  };

  const toggleRowFilter = async (checked: boolean): Promise<void> => {
    setEnableRowFilter(checked);
    const saved = await props.runtime.storageSyncSet({
      enableRowFilter: checked,
    });
    if (Result.isSuccess(saved)) {
      props.notify.success("保存しました");
      return;
    }
    props.notify.error("保存に失敗しました");
    setEnableRowFilter(!checked);
  };

  const addPattern = async (): Promise<void> => {
    const raw = patternInput.trim();
    if (!raw) {
      props.notify.error("パターンを入力してください");
      return;
    }
    if (patterns.includes(raw)) {
      props.notify.info("既に追加されています");
      setPatternInput("");
      return;
    }

    const next = [...patterns, raw];
    await persistWithRollback({
      applyNext: () => {
        setPatterns(next);
        setPatternInput("");
      },
      rollback: () => {
        setPatterns(patterns);
      },
      persist: () => props.runtime.storageSyncSet({ domainPatterns: next }),
      onSuccess: () => {
        props.notify.success("追加しました");
      },
      onFailure: () => {
        props.notify.error("追加に失敗しました");
      },
    });
  };

  const removePattern = async (pattern: string): Promise<void> => {
    const next = patterns.filter((item) => item !== pattern);
    await persistWithRollback({
      applyNext: () => {
        setPatterns(next);
      },
      rollback: () => {
        setPatterns(patterns);
      },
      persist: () => props.runtime.storageSyncSet({ domainPatterns: next }),
      onSuccess: () => {
        props.notify.success("削除しました");
      },
      onFailure: () => {
        props.notify.error("削除に失敗しました");
      },
    });
  };

  return (
    <div className="card card-stack">
      <div className="row-between">
        <h2 className="pane-title">テーブルソート</h2>
        <Button
          className="btn btn-primary"
          data-testid="enable-table-sort"
          onClick={() => {
            enableNow().catch(() => {
              // no-op
            });
          }}
          type="button"
        >
          このタブで有効化
        </Button>
      </div>

      <div className="mbu-switch-field">
        <span className="mbu-switch-text" id={autoEnableLabelId}>
          自動で有効化する
        </span>
        <Switch.Root
          aria-labelledby={autoEnableLabelId}
          checked={autoEnable}
          className="mbu-switch"
          data-testid="auto-enable-sort"
          onCheckedChange={(checked) => {
            toggleAutoEnable(checked).catch(() => {
              // no-op
            });
          }}
        >
          <Switch.Thumb className="mbu-switch-thumb" />
        </Switch.Root>
      </div>

      <div className="mbu-switch-field">
        <span className="mbu-switch-text" id={rowFilterLabelId}>
          行フィルタリングを有効化
        </span>
        <Switch.Root
          aria-labelledby={rowFilterLabelId}
          checked={enableRowFilter}
          className="mbu-switch"
          data-testid="enable-row-filter"
          onCheckedChange={(checked) => {
            toggleRowFilter(checked).catch(() => {
              // no-op
            });
          }}
        >
          <Switch.Thumb className="mbu-switch-thumb" />
        </Switch.Root>
      </div>

      <div className="hint">
        ソート時に0円、ハイフン（-）、空白、N/A の行を自動的に非表示にします
      </div>

      <div className="stack">
        <div className="hint">
          URLパターン（<code>*</code>ワイルドカード対応 / protocolは無視）
        </div>
        <Form
          className="pattern-input-group"
          onFormSubmit={() => {
            addPattern().catch(() => {
              // no-op
            });
          }}
        >
          <Input
            className="pattern-input"
            data-testid="pattern-input"
            onValueChange={setPatternInput}
            placeholder="example.com/path*"
            type="text"
            value={patternInput}
          />
          <Button
            className="btn btn-ghost btn-small"
            data-testid="pattern-add"
            onClick={() => {
              addPattern().catch(() => {
                // no-op
              });
            }}
            type="button"
          >
            追加
          </Button>
        </Form>

        {patterns.length > 0 ? (
          <ScrollArea.Root className="pattern-scrollarea">
            <ScrollArea.Viewport className="pattern-list">
              <ScrollArea.Content>
                <ul
                  aria-label="登録済みパターン"
                  className="pattern-list-inner"
                >
                  {patterns.map((pattern) => (
                    <li className="pattern-item" key={pattern}>
                      <code className="pattern-text">{pattern}</code>
                      <Button
                        className="btn-delete"
                        data-pattern-remove={pattern}
                        onClick={() => {
                          removePattern(pattern).catch(() => {
                            // no-op
                          });
                        }}
                        type="button"
                      >
                        削除
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="pattern-scrollbar">
              <ScrollArea.Thumb className="pattern-thumb" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        ) : (
          <p className="empty-message">まだパターンが登録されていません</p>
        )}
      </div>
    </div>
  );
}
