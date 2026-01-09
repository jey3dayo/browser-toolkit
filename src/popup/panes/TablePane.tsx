import { Button } from "@base-ui/react/button";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { Switch } from "@base-ui/react/switch";
import { Tooltip } from "@base-ui/react/tooltip";
import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type {
  DomainPatternConfig,
  EnableTableSortMessage,
  SyncStorageData,
} from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";

export type TablePaneProps = PopupPaneBaseProps;

type TooltipSwitchProps = {
  tooltip: string;
  children: React.ReactElement;
};

function TooltipSwitch(props: TooltipSwitchProps): React.JSX.Element {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={props.children} />
      <Tooltip.Portal>
        <Tooltip.Positioner className="mbu-tooltip-positioner" sideOffset={6}>
          <Tooltip.Popup className="mbu-tooltip">{props.tooltip}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * ストレージデータからDomainPatternConfig配列を正規化する
 * @param data - ストレージデータ
 * @returns 成功時はDomainPatternConfig配列、失敗時はエラーメッセージ
 */
function normalizeDomainPatternConfigsForPopup(
  data: Partial<SyncStorageData>
): Result.Result<DomainPatternConfig[], string> {
  // 1. domainPatternConfigsが存在する場合はバリデーション
  if (data.domainPatternConfigs) {
    if (!Array.isArray(data.domainPatternConfigs)) {
      return Result.fail("domainPatternConfigs must be an array");
    }

    const configs: DomainPatternConfig[] = [];
    for (const item of data.domainPatternConfigs) {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof item.pattern !== "string" ||
        typeof item.enableRowFilter !== "boolean"
      ) {
        return Result.fail("Invalid domainPatternConfig item format");
      }
      const pattern = item.pattern.trim();
      if (!pattern) {
        continue;
      }
      configs.push({
        pattern,
        enableRowFilter: item.enableRowFilter,
      });
    }
    return Result.succeed(configs.slice(0, 200));
  }

  // 2. 未設定 → 空配列
  return Result.succeed([]);
}

export function TablePane(props: TablePaneProps): React.JSX.Element {
  const [patterns, setPatterns] = useState<DomainPatternConfig[]>([]);
  const [patternInput, setPatternInput] = useState("");
  const rowFilterTooltip = "0円・ハイフン・空白・N/A の行を非表示にします";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await props.runtime.storageSyncGet(["domainPatternConfigs"]);
      if (Result.isFailure(data)) {
        return;
      }
      if (cancelled) {
        return;
      }
      const configsResult = normalizeDomainPatternConfigsForPopup(data.value);
      if (Result.isSuccess(configsResult)) {
        setPatterns(configsResult.value);
      }
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

  const togglePatternRowFilter = async (
    pattern: string,
    checked: boolean
  ): Promise<void> => {
    const next = patterns.map((config) =>
      config.pattern === pattern
        ? { ...config, enableRowFilter: checked }
        : config
    );
    await persistWithRollback({
      applyNext: () => {
        setPatterns(next);
      },
      rollback: () => {
        setPatterns(patterns);
      },
      persist: () =>
        props.runtime.storageSyncSet({ domainPatternConfigs: next }),
      onFailure: () => {
        props.notify.error("保存に失敗しました");
      },
    });
  };

  const addPattern = async (): Promise<void> => {
    const raw = patternInput.trim();
    if (!raw) {
      props.notify.error("パターンを入力してください");
      return;
    }
    if (patterns.some((config) => config.pattern === raw)) {
      props.notify.info("既に追加されています");
      setPatternInput("");
      return;
    }

    const next: DomainPatternConfig[] = [
      ...patterns,
      { pattern: raw, enableRowFilter: false },
    ];
    await persistWithRollback({
      applyNext: () => {
        setPatterns(next);
        setPatternInput("");
      },
      rollback: () => {
        setPatterns(patterns);
      },
      persist: () =>
        props.runtime.storageSyncSet({ domainPatternConfigs: next }),
      onSuccess: () => {
        props.notify.success("追加しました");
      },
      onFailure: () => {
        props.notify.error("追加に失敗しました");
      },
    });
  };

  const removePattern = async (pattern: string): Promise<void> => {
    const next = patterns.filter((config) => config.pattern !== pattern);
    await persistWithRollback({
      applyNext: () => {
        setPatterns(next);
      },
      rollback: () => {
        setPatterns(patterns);
      },
      persist: () =>
        props.runtime.storageSyncSet({ domainPatternConfigs: next }),
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

      <div className="stack">
        <div className="hint">
          URLパターン（<code>*</code>ワイルドカード対応 / protocolは無視）
        </div>
        <div className="hint">
          各パターンごとに行フィルタリング（0円、ハイフン、空白、N/Aを非表示）を有効化できます
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
                  {patterns.map((config) => (
                    <li className="pattern-item" key={config.pattern}>
                      <code className="pattern-text">{config.pattern}</code>
                      <TooltipSwitch tooltip={rowFilterTooltip}>
                        <Switch.Root
                          aria-label={`${config.pattern}の行フィルタリング`}
                          checked={config.enableRowFilter}
                          className="mbu-switch"
                          data-testid={`row-filter-${config.pattern}`}
                          onCheckedChange={(checked) => {
                            togglePatternRowFilter(
                              config.pattern,
                              checked
                            ).catch(() => {
                              // no-op
                            });
                          }}
                        >
                          <Switch.Thumb className="mbu-switch-thumb" />
                        </Switch.Root>
                      </TooltipSwitch>
                      <Button
                        className="btn-delete"
                        data-pattern-remove={config.pattern}
                        onClick={() => {
                          removePattern(config.pattern).catch(() => {
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
