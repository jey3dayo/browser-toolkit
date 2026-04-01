import { Button } from "@base-ui/react/button";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { ScrollArea } from "@base-ui/react/scroll-area";
import { Switch } from "@base-ui/react/switch";
import { Tooltip } from "@base-ui/react/tooltip";
import { Result } from "@praha/byethrow";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  normalizeFocusOverridePatterns,
  toFocusOverrideMatchPattern,
} from "@/focus-override/patterns";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type {
  DomainPatternConfig,
  EnableTableSortMessage,
  FocusOverrideDiagnosticSnapshot,
  SyncStorageData,
} from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";

export type TablePaneProps = PopupPaneBaseProps;

type TooltipSwitchProps = {
  tooltip: string;
  children: React.ReactElement;
};

type FocusDiagnosticKind =
  | "not-configured"
  | "active"
  | "reload-required"
  | "unavailable";

type FocusDiagnosticView = {
  kind: FocusDiagnosticKind;
  tabId: number | null;
  currentUrl: string | null;
  matchedPattern: string | null;
  label: string;
  description: string;
};

const FOCUS_DIAGNOSTIC_SLOW_MS = 300;

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

  return Result.succeed([]);
}

function summarizeUrl(url: string | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

function isFocusOverrideApplied(
  snapshot: FocusOverrideDiagnosticSnapshot
): boolean {
  return (
    snapshot.markerPresent &&
    snapshot.visibilityState === "visible" &&
    snapshot.hidden === false &&
    snapshot.hasFocus === true
  );
}

function buildFocusDiagnosticView(params: {
  kind: FocusDiagnosticKind;
  tabId: number | null;
  currentUrl: string | null;
  matchedPattern?: string | null;
  description: string;
}): FocusDiagnosticView {
  const labelMap: Record<FocusDiagnosticKind, string> = {
    "not-configured": "未設定",
    active: "有効",
    "reload-required": "要リロード",
    unavailable: "判定不可",
  };

  return {
    kind: params.kind,
    tabId: params.tabId,
    currentUrl: params.currentUrl,
    matchedPattern: params.matchedPattern ?? null,
    label: labelMap[params.kind],
    description: params.description,
  };
}

export function TablePane(props: TablePaneProps): React.JSX.Element {
  const [patterns, setPatterns] = useState<DomainPatternConfig[]>([]);
  const [patternInput, setPatternInput] = useState("");
  const [focusPatterns, setFocusPatterns] = useState<string[]>([]);
  const [focusPatternInput, setFocusPatternInput] = useState("");
  const [focusPatternsHydrated, setFocusPatternsHydrated] = useState(false);
  const [focusDiagnostic, setFocusDiagnostic] =
    useState<FocusDiagnosticView | null>(null);
  const [focusDiagnosticRunning, setFocusDiagnosticRunning] = useState(false);
  const [focusDiagnosticSlow, setFocusDiagnosticSlow] = useState(false);
  const rowFilterTooltip = "0円・ハイフン・空白・N/A の行を非表示にします";
  const focusPatternsRef = useRef<string[]>([]);
  const focusDiagnosticRequestIdRef = useRef(0);
  const focusDiagnosticTimerRef = useRef<number | null>(null);

  focusPatternsRef.current = focusPatterns;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await props.runtime.storageSyncGet([
        "domainPatternConfigs",
        "focusOverridePatterns",
      ]);
      if (Result.isFailure(data)) {
        if (!cancelled) {
          setFocusPatternsHydrated(true);
        }
        return;
      }
      if (cancelled) {
        return;
      }
      const configsResult = normalizeDomainPatternConfigsForPopup(data.value);
      if (Result.isSuccess(configsResult)) {
        setPatterns(configsResult.value);
      }
      const focusPatternsResult = normalizeFocusOverridePatterns(data.value);
      if (Result.isSuccess(focusPatternsResult)) {
        setFocusPatterns(focusPatternsResult.value);
      }
      setFocusPatternsHydrated(true);
    })().catch(() => {
      if (!cancelled) {
        setFocusPatternsHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [props.runtime]);

  useEffect(() => {
    return () => {
      focusDiagnosticRequestIdRef.current += 1;
      if (focusDiagnosticTimerRef.current !== null) {
        window.clearTimeout(focusDiagnosticTimerRef.current);
      }
    };
  }, []);

  async function resolveFocusDiagnostic(): Promise<FocusDiagnosticView> {
    const activeTab = await props.runtime.getActiveTab();
    if (Result.isFailure(activeTab)) {
      return buildFocusDiagnosticView({
        kind: "unavailable",
        tabId: null,
        currentUrl: null,
        description: activeTab.error,
      });
    }

    const tab = activeTab.value;
    if (!(tab?.id && tab.url)) {
      return buildFocusDiagnosticView({
        kind: "unavailable",
        tabId: tab?.id ?? null,
        currentUrl: summarizeUrl(tab?.url),
        description: "現在のタブのURLを確認できませんでした",
      });
    }

    const currentUrl = summarizeUrl(tab.url);
    const matchedPattern =
      focusPatternsRef.current.find((pattern) =>
        props.runtime.matchesFocusOverridePatterns([pattern], tab.url ?? "")
      ) ?? null;

    if (!matchedPattern) {
      return buildFocusDiagnosticView({
        kind: "not-configured",
        tabId: tab.id,
        currentUrl,
        description:
          focusPatternsRef.current.length === 0
            ? "まだフォーカス維持パターンが登録されていません"
            : "現在のタブのURLは登録済みパターンに一致しません",
      });
    }

    const diagnosis = await props.runtime.diagnoseFocusOverride(tab.id);
    if (Result.isFailure(diagnosis)) {
      return buildFocusDiagnosticView({
        kind: "unavailable",
        tabId: tab.id,
        currentUrl,
        matchedPattern,
        description: diagnosis.error,
      });
    }

    if (isFocusOverrideApplied(diagnosis.value)) {
      return buildFocusDiagnosticView({
        kind: "active",
        tabId: tab.id,
        currentUrl,
        matchedPattern,
        description: "このタブではフォーカス維持が反映済みです",
      });
    }

    return buildFocusDiagnosticView({
      kind: "reload-required",
      tabId: tab.id,
      currentUrl,
      matchedPattern,
      description:
        "登録は一致していますが、まだ反映前です。再読み込みで確実に反映されます",
    });
  }

  function notifyFocusDiagnostic(view: FocusDiagnosticView): void {
    switch (view.kind) {
      case "active": {
        props.notify.success("フォーカス維持は有効です");
        return;
      }
      case "reload-required": {
        props.notify.info("現在のタブでは再読み込みで反映されます");
        return;
      }
      case "not-configured": {
        props.notify.info("現在のタブはフォーカス維持の対象外です");
        return;
      }
      case "unavailable": {
        props.notify.error(view.description);
        return;
      }
      default: {
        return;
      }
    }
  }

  async function runFocusDiagnostic(showToast: boolean): Promise<void> {
    const requestId = focusDiagnosticRequestIdRef.current + 1;
    focusDiagnosticRequestIdRef.current = requestId;

    if (focusDiagnosticTimerRef.current !== null) {
      window.clearTimeout(focusDiagnosticTimerRef.current);
    }
    setFocusDiagnosticRunning(true);
    setFocusDiagnosticSlow(false);
    focusDiagnosticTimerRef.current = window.setTimeout(() => {
      if (focusDiagnosticRequestIdRef.current === requestId) {
        setFocusDiagnosticSlow(true);
      }
    }, FOCUS_DIAGNOSTIC_SLOW_MS);

    let nextView: FocusDiagnosticView;
    try {
      nextView = await resolveFocusDiagnostic();
    } catch {
      nextView = buildFocusDiagnosticView({
        kind: "unavailable",
        tabId: null,
        currentUrl: null,
        description: "フォーカス維持の診断に失敗しました",
      });
    }

    if (focusDiagnosticRequestIdRef.current !== requestId) {
      return;
    }

    if (focusDiagnosticTimerRef.current !== null) {
      window.clearTimeout(focusDiagnosticTimerRef.current);
      focusDiagnosticTimerRef.current = null;
    }
    setFocusDiagnostic(nextView);
    setFocusDiagnosticRunning(false);
    setFocusDiagnosticSlow(false);

    if (showToast) {
      notifyFocusDiagnostic(nextView);
    }
  }

  const requestFocusDiagnostic = useEffectEvent((showToast: boolean) => {
    runFocusDiagnostic(showToast).catch(() => {
      // no-op
    });
  });

  useEffect(() => {
    if (!focusPatternsHydrated) {
      return;
    }

    const diagnoseIfVisible = (): void => {
      if (window.location.hash !== "#pane-table") {
        return;
      }
      requestFocusDiagnostic(false);
    };

    diagnoseIfVisible();
    window.addEventListener("hashchange", diagnoseIfVisible);
    return () => {
      window.removeEventListener("hashchange", diagnoseIfVisible);
    };
  }, [focusPatternsHydrated]);

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

  const parsePatternInput = (): string | null => {
    const raw = patternInput.trim();
    if (!raw) {
      props.notify.error("パターンを入力してください");
      return null;
    }
    return raw;
  };

  const buildNextPatterns = (pattern: string): DomainPatternConfig[] | null => {
    if (patterns.some((config) => config.pattern === pattern)) {
      props.notify.info("既に追加されています");
      setPatternInput("");
      return null;
    }
    return [...patterns, { pattern, enableRowFilter: false }];
  };

  const addPattern = async (): Promise<void> => {
    const raw = parsePatternInput();
    if (!raw) {
      return;
    }
    const next = buildNextPatterns(raw);
    if (!next) {
      return;
    }
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

  const parseFocusPatternInput = (): string | null => {
    const raw = focusPatternInput.trim();
    if (!raw) {
      props.notify.error("パターンを入力してください");
      return null;
    }
    const matchPatternResult = toFocusOverrideMatchPattern(raw);
    if (Result.isFailure(matchPatternResult)) {
      props.notify.error(matchPatternResult.error);
      return null;
    }
    return raw;
  };

  const addFocusPattern = async (): Promise<void> => {
    const raw = parseFocusPatternInput();
    if (!raw) {
      return;
    }
    if (focusPatterns.includes(raw)) {
      props.notify.info("既に追加されています");
      setFocusPatternInput("");
      return;
    }

    let addSuccessMessage = "追加しました";
    const activeTab = await props.runtime.getActiveTab();
    if (
      Result.isSuccess(activeTab) &&
      activeTab.value?.url &&
      props.runtime.matchesFocusOverridePatterns([raw], activeTab.value.url)
    ) {
      addSuccessMessage = "追加しました。このタブでは再読み込みで反映されます";
    }

    const next = [...focusPatterns, raw];
    const saved = await persistWithRollback({
      applyNext: () => {
        setFocusPatterns(next);
        setFocusPatternInput("");
      },
      rollback: () => {
        setFocusPatterns(focusPatterns);
      },
      persist: () =>
        props.runtime.storageSyncSet({ focusOverridePatterns: next }),
      onSuccess: () => {
        props.notify.success(addSuccessMessage);
      },
      onFailure: () => {
        props.notify.error("追加に失敗しました");
      },
    });

    if (saved) {
      await runFocusDiagnostic(false);
    }
  };

  const removeFocusPattern = async (pattern: string): Promise<void> => {
    const next = focusPatterns.filter((item) => item !== pattern);
    const saved = await persistWithRollback({
      applyNext: () => {
        setFocusPatterns(next);
      },
      rollback: () => {
        setFocusPatterns(focusPatterns);
      },
      persist: () =>
        props.runtime.storageSyncSet({ focusOverridePatterns: next }),
      onSuccess: () => {
        props.notify.success("削除しました");
      },
      onFailure: () => {
        props.notify.error("削除に失敗しました");
      },
    });

    if (saved) {
      await runFocusDiagnostic(false);
    }
  };

  const reloadCurrentTab = async (): Promise<void> => {
    if (!focusDiagnostic?.tabId) {
      props.notify.error("再読み込みできるタブが見つかりません");
      return;
    }

    const reloaded = await props.runtime.reloadTab(focusDiagnostic.tabId);
    if (Result.isFailure(reloaded)) {
      props.notify.error(reloaded.error);
      return;
    }

    props.notify.success("このタブを再読み込みしました");
  };

  let focusDiagnosticToneClass = "focus-diagnostic-status--neutral";
  if (focusDiagnostic?.kind === "active") {
    focusDiagnosticToneClass = "focus-diagnostic-status--active";
  } else if (focusDiagnostic?.kind === "reload-required") {
    focusDiagnosticToneClass = "focus-diagnostic-status--warning";
  }

  return (
    <div className="card card-stack">
      <div className="row-between">
        <h2 className="pane-title">サイト別機能</h2>
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

      <div className="stack">
        <div className="row-between">
          <h3 className="pane-subtitle">フォーカス維持</h3>
        </div>
        <div className="hint">
          タブが非アクティブでも常に表示中として扱わせたいサイト向けです
        </div>

        <section
          aria-live="polite"
          className="focus-diagnostic-panel"
          data-testid="focus-diagnostic-panel"
        >
          <div className="row-between">
            <div className="stack-sm">
              <p className="focus-diagnostic-eyebrow">現在のタブ診断</p>
              <div className="focus-diagnostic-summary">
                <span
                  className={`focus-diagnostic-status ${focusDiagnosticToneClass}`}
                  data-testid="focus-diagnostic-status"
                >
                  {focusDiagnostic?.label ?? "診断待ち"}
                </span>
                <code
                  className="focus-diagnostic-url"
                  data-testid="focus-diagnostic-summary"
                >
                  {focusDiagnostic?.currentUrl ?? "現在のURLを確認しています"}
                </code>
              </div>
            </div>
            <div className="button-row">
              <Button
                className="btn btn-ghost btn-small"
                data-testid="focus-diagnostic-refresh"
                disabled={focusDiagnosticRunning}
                onClick={() => {
                  runFocusDiagnostic(true).catch(() => {
                    // no-op
                  });
                }}
                type="button"
              >
                再診断
              </Button>
              {focusDiagnostic?.kind === "reload-required" ? (
                <Button
                  className="btn btn-primary btn-small"
                  data-testid="focus-diagnostic-reload"
                  onClick={() => {
                    reloadCurrentTab().catch(() => {
                      // no-op
                    });
                  }}
                  type="button"
                >
                  このタブを再読み込み
                </Button>
              ) : null}
            </div>
          </div>

          <p className="focus-diagnostic-description">
            {focusDiagnostic?.description ??
              "現在のタブにフォーカス維持が必要かどうかを確認できます"}
          </p>
          {focusDiagnostic?.matchedPattern ? (
            <p className="focus-diagnostic-meta">
              一致パターン: <code>{focusDiagnostic.matchedPattern}</code>
            </p>
          ) : null}
          {focusDiagnosticSlow ? (
            <p className="focus-diagnostic-loading">現在のタブを診断中です…</p>
          ) : null}
        </section>

        <div className="hint">
          パターン追加後、現在のタブが対象なら再読み込みで確実に反映されます
        </div>
        <Form
          className="pattern-input-group"
          onFormSubmit={() => {
            addFocusPattern().catch(() => {
              // no-op
            });
          }}
        >
          <Input
            className="pattern-input"
            data-testid="focus-pattern-input"
            onValueChange={setFocusPatternInput}
            placeholder="example.com/title/*"
            type="text"
            value={focusPatternInput}
          />
          <Button
            className="btn btn-ghost btn-small"
            data-testid="focus-pattern-add"
            onClick={() => {
              addFocusPattern().catch(() => {
                // no-op
              });
            }}
            type="button"
          >
            追加
          </Button>
        </Form>

        {focusPatterns.length > 0 ? (
          <ScrollArea.Root className="pattern-scrollarea">
            <ScrollArea.Viewport className="pattern-list">
              <ScrollArea.Content>
                <ul
                  aria-label="フォーカス維持の登録済みパターン"
                  className="pattern-list-inner"
                >
                  {focusPatterns.map((pattern) => (
                    <li className="pattern-item" key={pattern}>
                      <code className="pattern-text">{pattern}</code>
                      <Button
                        className="btn-delete"
                        data-focus-pattern-remove={pattern}
                        onClick={() => {
                          removeFocusPattern(pattern).catch(() => {
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
