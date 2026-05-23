import { Result } from "@praha/byethrow";
import { cva } from "class-variance-authority";
import {
  type ComponentPropsWithoutRef,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { Badge, type BadgeProps } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import {
  ButtonRow,
  PaneCard,
  RowBetween,
  Stack,
} from "@/components/shared/Layout";
import { PatternAddForm } from "@/components/shared/PatternAddForm";
import {
  PatternList,
  PatternListItem,
} from "@/components/shared/PatternListItem";
import { ScrollArea } from "@/components/shared/ScrollArea";
import { Switch } from "@/components/shared/Switch";
import { Tooltip } from "@/components/shared/Tooltip";
import {
  EmptyMessage,
  Hint,
  PaneSubtitle,
  PaneTitle,
} from "@/components/shared/Typography";
import {
  type DomainPatternConfig,
  normalizeDomainPatternConfigs,
} from "@/domain-pattern-configs";
import {
  normalizeFocusOverridePatterns,
  toFocusOverrideMatchPattern,
} from "@/focus-override/patterns";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type {
  EnableTableSortMessage,
  FocusOverrideDiagnosticSnapshot,
} from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";
import { requireTrimmedString } from "@/popup/utils/required-input";

export type TablePaneProps = PopupPaneBaseProps;

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

type FocusDiagnosticViewParams = Omit<
  FocusDiagnosticView,
  "label" | "matchedPattern"
> & {
  matchedPattern?: string | null;
};

const FOCUS_DIAGNOSTIC_SLOW_MS = 300;

function TablePaneHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div className={cva("table-pane-header stack")({ className })} {...props} />
  );
}

function TablePaneHeading({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RowBetween>): React.JSX.Element {
  return (
    <RowBetween
      className={cva("table-pane-heading")({ className })}
      {...props}
    />
  );
}

function TablePaneSection({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">): React.JSX.Element {
  return (
    <section
      className={cva("table-pane-section stack")({ className })}
      data-testid="table-pane-section"
      {...props}
    />
  );
}

function TablePaneSectionHeading({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof Stack>): React.JSX.Element {
  return (
    <Stack
      className={cva("table-pane-section-heading")({ className })}
      spacing="small"
      {...props}
    />
  );
}

function TablePaneSummary({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">): React.JSX.Element {
  return (
    <section
      className={cva("table-pane-summary")({ className })}
      data-testid="table-pane-summary"
      {...props}
    />
  );
}

function TablePaneSummaryHeading({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div
      className={cva("table-pane-summary-heading")({ className })}
      {...props}
    />
  );
}

function TablePaneSummaryTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-title")({ className })} {...props} />
  );
}

function TablePaneSummaryCopy({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-copy")({ className })} {...props} />
  );
}

function TablePaneSummaryStatus({
  className,
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <Badge
      className={cva("table-pane-summary-status")({ className })}
      {...props}
    />
  );
}

function TablePaneSummaryGrid({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div className={cva("table-pane-summary-grid")({ className })} {...props} />
  );
}

function TablePaneSummaryItem({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div className={cva("table-pane-summary-item")({ className })} {...props} />
  );
}

function TablePaneSummaryLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-label")({ className })} {...props} />
  );
}

function TablePaneSummaryValue({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-value")({ className })} {...props} />
  );
}

function TablePaneSummaryMeta({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("table-pane-summary-meta")({ className })} {...props} />
  );
}

function FocusDiagnosticDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p
      className={cva("focus-diagnostic-description")({ className })}
      {...props}
    />
  );
}

function FocusDiagnosticMeta({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("focus-diagnostic-meta")({ className })} {...props} />
  );
}

function FocusDiagnosticLoading({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("focus-diagnostic-loading")({ className })} {...props} />
  );
}

function FocusDiagnosticPanelRoot({
  className,
  ...props
}: ComponentPropsWithoutRef<"section">): React.JSX.Element {
  return (
    <section
      aria-live="polite"
      className={cva("focus-diagnostic-panel")({ className })}
      data-testid="focus-diagnostic-panel"
      {...props}
    />
  );
}

function FocusDiagnosticEyebrow({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): React.JSX.Element {
  return (
    <p className={cva("focus-diagnostic-eyebrow")({ className })} {...props} />
  );
}

function FocusDiagnosticSummary({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">): React.JSX.Element {
  return (
    <div
      className={cva("focus-diagnostic-summary")({ className })}
      {...props}
    />
  );
}

function FocusDiagnosticUrl({
  className,
  ...props
}: ComponentPropsWithoutRef<"code">): React.JSX.Element {
  return (
    <code className={cva("focus-diagnostic-url")({ className })} {...props} />
  );
}

function FocusDiagnosticActions({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ButtonRow>): React.JSX.Element {
  return (
    <ButtonRow
      className={cva("focus-diagnostic-actions")({ className })}
      {...props}
    />
  );
}

type TablePaneSummaryCardProps = {
  focusDiagnosticBadgeVariant: BadgeProps["variant"];
  focusPatternSummaryLabel: string;
  summaryFocusDescription: string;
  summaryFocusStatusLabel: string;
  urlPatternSummaryLabel: string;
};

function TablePaneSummaryCard({
  focusDiagnosticBadgeVariant,
  focusPatternSummaryLabel,
  summaryFocusDescription,
  summaryFocusStatusLabel,
  urlPatternSummaryLabel,
}: TablePaneSummaryCardProps): React.JSX.Element {
  return (
    <TablePaneSummary>
      <TablePaneSummaryHeading>
        <Stack spacing="small">
          <TablePaneSummaryTitle>
            {t("tablePane.summary.title")}
          </TablePaneSummaryTitle>
          <TablePaneSummaryCopy>
            {t("tablePane.summary.description")}
          </TablePaneSummaryCopy>
        </Stack>
        <TablePaneSummaryStatus variant={focusDiagnosticBadgeVariant}>
          {summaryFocusStatusLabel}
        </TablePaneSummaryStatus>
      </TablePaneSummaryHeading>

      <TablePaneSummaryGrid>
        <TablePaneSummaryItem>
          <TablePaneSummaryLabel>
            {t("tablePane.summary.urlPatterns")}
          </TablePaneSummaryLabel>
          <TablePaneSummaryValue>
            {urlPatternSummaryLabel}
          </TablePaneSummaryValue>
          <TablePaneSummaryMeta>
            {t("tablePane.summary.urlPatternsMeta")}
          </TablePaneSummaryMeta>
        </TablePaneSummaryItem>

        <TablePaneSummaryItem>
          <TablePaneSummaryLabel>
            {t("tablePane.summary.focus")}
          </TablePaneSummaryLabel>
          <TablePaneSummaryValue>
            {focusPatternSummaryLabel}
          </TablePaneSummaryValue>
          <TablePaneSummaryMeta>{summaryFocusDescription}</TablePaneSummaryMeta>
        </TablePaneSummaryItem>
      </TablePaneSummaryGrid>
    </TablePaneSummary>
  );
}

type FocusDiagnosticPanelProps = {
  focusDiagnostic: FocusDiagnosticView | null;
  focusDiagnosticBadgeVariant: BadgeProps["variant"];
  focusDiagnosticRunning: boolean;
  focusDiagnosticSlow: boolean;
  onRefresh: () => void;
  onReloadCurrentTab: () => void;
};

function FocusDiagnosticPanel({
  focusDiagnostic,
  focusDiagnosticBadgeVariant,
  focusDiagnosticRunning,
  focusDiagnosticSlow,
  onRefresh,
  onReloadCurrentTab,
}: FocusDiagnosticPanelProps): React.JSX.Element {
  return (
    <FocusDiagnosticPanelRoot>
      <RowBetween>
        <Stack spacing="small">
          <FocusDiagnosticEyebrow>
            {t("tablePane.diagnostic.eyebrow")}
          </FocusDiagnosticEyebrow>
          <FocusDiagnosticSummary>
            <Badge
              data-testid="focus-diagnostic-status"
              variant={focusDiagnosticBadgeVariant}
            >
              {focusDiagnostic?.label ?? t("tablePane.summary.pending")}
            </Badge>
            <FocusDiagnosticUrl data-testid="focus-diagnostic-summary">
              {focusDiagnostic?.currentUrl ??
                t("tablePane.diagnostic.pendingUrl")}
            </FocusDiagnosticUrl>
          </FocusDiagnosticSummary>
        </Stack>
        <FocusDiagnosticActions>
          <Button
            data-testid="focus-diagnostic-refresh"
            disabled={focusDiagnosticRunning}
            onClick={onRefresh}
            size="small"
            type="button"
            variant="ghost"
          >
            {t("tablePane.diagnostic.refresh")}
          </Button>
          {focusDiagnostic?.kind === "reload-required" ? (
            <Button
              data-testid="focus-diagnostic-reload"
              onClick={onReloadCurrentTab}
              size="small"
              type="button"
              variant="primary"
            >
              {t("tablePane.diagnostic.reload")}
            </Button>
          ) : null}
        </FocusDiagnosticActions>
      </RowBetween>

      <FocusDiagnosticDescription>
        {focusDiagnostic?.description ??
          t("tablePane.diagnostic.defaultDescription")}
      </FocusDiagnosticDescription>
      {focusDiagnostic?.matchedPattern ? (
        <FocusDiagnosticMeta>
          {t("tablePane.diagnostic.matchedPattern", {
            pattern: focusDiagnostic.matchedPattern,
          })}
        </FocusDiagnosticMeta>
      ) : null}
      {focusDiagnosticSlow ? (
        <FocusDiagnosticLoading>
          {t("tablePane.diagnostic.loading")}
        </FocusDiagnosticLoading>
      ) : null}
    </FocusDiagnosticPanelRoot>
  );
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

function buildFocusDiagnosticView(
  params: FocusDiagnosticViewParams
): FocusDiagnosticView {
  const labelMap: Record<FocusDiagnosticKind, string> = {
    "not-configured": t("tablePane.diagnostic.labels.notConfigured"),
    active: t("tablePane.diagnostic.labels.active"),
    "reload-required": t("tablePane.diagnostic.labels.reloadRequired"),
    unavailable: t("tablePane.diagnostic.labels.unavailable"),
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

type PatternConfigListItemProps = {
  config: DomainPatternConfig;
  rowFilterTooltip: string;
  onRemove: (pattern: string) => Promise<void>;
  onToggleRowFilter: (pattern: string, checked: boolean) => Promise<void>;
};

function PatternConfigListItem({
  config,
  rowFilterTooltip,
  onRemove,
  onToggleRowFilter,
}: PatternConfigListItemProps): React.JSX.Element {
  const action = useMemo(
    () => (
      <Button
        data-pattern-remove={config.pattern}
        onClick={() => {
          onRemove(config.pattern).catch(() => {
            // no-op
          });
        }}
        type="button"
        variant="danger"
      >
        {t("common.delete")}
      </Button>
    ),
    [config.pattern, onRemove]
  );
  const toggle = useMemo(
    () => (
      <Tooltip content={rowFilterTooltip}>
        <Switch
          aria-label={t("tablePane.rowFilter.aria", {
            pattern: config.pattern,
          })}
          checked={config.enableRowFilter}
          data-testid={`row-filter-${config.pattern}`}
          onCheckedChange={(checked) => {
            onToggleRowFilter(config.pattern, checked).catch(() => {
              // no-op
            });
          }}
        />
      </Tooltip>
    ),
    [
      config.enableRowFilter,
      config.pattern,
      onToggleRowFilter,
      rowFilterTooltip,
    ]
  );

  return (
    <PatternListItem
      action={action}
      key={config.pattern}
      pattern={config.pattern}
      toggle={toggle}
    />
  );
}

export function TablePane(props: TablePaneProps): React.JSX.Element {
  const [patterns, setPatterns] = useState<DomainPatternConfig[]>([]);
  const [patternInput, setPatternInput] = useState("");
  const [focusPatterns, setFocusPatterns] = useState<string[]>([]);
  const [focusPatternInput, setFocusPatternInput] = useState("");
  const [focusDiagnostic, setFocusDiagnostic] =
    useState<FocusDiagnosticView | null>(null);
  const [focusDiagnosticRunning, setFocusDiagnosticRunning] = useState(false);
  const [focusDiagnosticSlow, setFocusDiagnosticSlow] = useState(false);
  const rowFilterTooltip = t("tablePane.rowFilter.tooltip");
  const focusPatternsRef = useRef<string[]>([]);
  const focusDiagnosticRequestIdRef = useRef(0);
  const focusDiagnosticTimerRef = useRef<number | null>(null);

  focusPatternsRef.current = focusPatterns;

  useEffect(
    () => () => {
      focusDiagnosticRequestIdRef.current += 1;
      if (focusDiagnosticTimerRef.current !== null) {
        window.clearTimeout(focusDiagnosticTimerRef.current);
      }
    },
    []
  );

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
        description: t("tablePane.diagnostic.descriptions.urlUnavailable"),
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
            ? t("tablePane.diagnostic.descriptions.noPatterns")
            : t("tablePane.diagnostic.descriptions.noMatch"),
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
        description: t("tablePane.diagnostic.descriptions.active"),
      });
    }

    return buildFocusDiagnosticView({
      kind: "reload-required",
      tabId: tab.id,
      currentUrl,
      matchedPattern,
      description: t("tablePane.diagnostic.descriptions.reloadRequired"),
    });
  }

  function notifyFocusDiagnostic(view: FocusDiagnosticView): void {
    switch (view.kind) {
      case "active": {
        props.notify.success(t("tablePane.diagnostic.notifications.active"));
        return;
      }
      case "reload-required": {
        props.notify.info(
          t("tablePane.diagnostic.notifications.reloadRequired")
        );
        return;
      }
      case "not-configured": {
        props.notify.info(
          t("tablePane.diagnostic.notifications.notConfigured")
        );
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
        description: t("tablePane.diagnostic.descriptions.failed"),
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
    let cancelled = false;
    let focusPatternsHydrated = false;

    const diagnoseIfVisible = (): void => {
      if (!focusPatternsHydrated) {
        return;
      }
      if (window.location.hash !== "#pane-table") {
        return;
      }
      requestFocusDiagnostic(false);
    };

    const markFocusPatternsHydrated = (): void => {
      if (cancelled) {
        return;
      }
      focusPatternsHydrated = true;
      diagnoseIfVisible();
    };

    window.addEventListener("hashchange", diagnoseIfVisible);

    (async () => {
      const data = await props.runtime.storageSyncGet([
        "domainPatternConfigs",
        "focusOverridePatterns",
      ]);
      if (Result.isFailure(data)) {
        markFocusPatternsHydrated();
        return;
      }
      if (cancelled) {
        return;
      }
      const configsResult = normalizeDomainPatternConfigs(data.value);
      if (Result.isSuccess(configsResult)) {
        setPatterns(configsResult.value.slice(0, 200));
      }
      const focusPatternsResult = normalizeFocusOverridePatterns(data.value);
      if (Result.isSuccess(focusPatternsResult)) {
        focusPatternsRef.current = focusPatternsResult.value;
        setFocusPatterns(focusPatternsResult.value);
      }
      markFocusPatternsHydrated();
    })().catch(() => {
      markFocusPatternsHydrated();
    });

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", diagnoseIfVisible);
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
      props.notify.error(t("tablePane.errors.activeTabMissing"));
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

    props.notify.success(t("tablePane.success.enabled"));
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
        props.notify.error(t("tablePane.errors.saveFailed"));
      },
    });
  };

  const parsePatternInput = (): string | null => {
    const raw = patternInput.trim();
    if (!raw) {
      props.notify.error(t("tablePane.errors.patternRequired"));
      return null;
    }
    return raw;
  };

  const buildNextPatterns = (pattern: string): DomainPatternConfig[] | null => {
    if (patterns.some((config) => config.pattern === pattern)) {
      props.notify.info(t("tablePane.info.duplicate"));
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
        props.notify.success(t("tablePane.success.added"));
      },
      onFailure: () => {
        props.notify.error(t("tablePane.errors.addFailed"));
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
        props.notify.success(t("tablePane.success.deleted"));
      },
      onFailure: () => {
        props.notify.error(t("tablePane.errors.deleteFailed"));
      },
    });
  };

  const parseFocusPatternInput = (): string | null => {
    const raw = requireTrimmedString({
      value: focusPatternInput,
      emptyMessage: t("tablePane.errors.patternRequired"),
      notify: props.notify,
    });
    if (!raw) {
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
      props.notify.info(t("tablePane.info.duplicate"));
      setFocusPatternInput("");
      return;
    }

    let addSuccessMessage = t("tablePane.success.added");
    const activeTab = await props.runtime.getActiveTab();
    if (
      Result.isSuccess(activeTab) &&
      activeTab.value?.url &&
      props.runtime.matchesFocusOverridePatterns([raw], activeTab.value.url)
    ) {
      addSuccessMessage = t("tablePane.success.addedReload");
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
        props.notify.error(t("tablePane.errors.addFailed"));
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
        props.notify.success(t("tablePane.success.deleted"));
      },
      onFailure: () => {
        props.notify.error(t("tablePane.errors.deleteFailed"));
      },
    });

    if (saved) {
      await runFocusDiagnostic(false);
    }
  };

  const reloadCurrentTab = async (): Promise<void> => {
    if (!focusDiagnostic?.tabId) {
      props.notify.error(t("tablePane.errors.reloadTabMissing"));
      return;
    }

    const reloaded = await props.runtime.reloadTab(focusDiagnostic.tabId);
    if (Result.isFailure(reloaded)) {
      props.notify.error(reloaded.error);
      return;
    }

    props.notify.success(t("tablePane.success.reloaded"));
  };

  let focusDiagnosticBadgeVariant: BadgeProps["variant"] =
    "focusDiagnosticNeutral";
  if (focusDiagnostic?.kind === "active") {
    focusDiagnosticBadgeVariant = "focusDiagnosticActive";
  } else if (focusDiagnostic?.kind === "reload-required") {
    focusDiagnosticBadgeVariant = "focusDiagnosticWarning";
  }

  const summaryFocusStatusLabel =
    focusDiagnostic?.label ?? t("tablePane.summary.pending");
  const summaryFocusDescription = focusDiagnostic
    ? focusDiagnostic.description
    : t("tablePane.summary.focusDescription");
  const urlPatternSummaryLabel =
    patterns.length === 0
      ? t("tablePane.summary.notRegistered")
      : t("tablePane.summary.registeredCount", { count: patterns.length });
  const focusPatternSummaryLabel =
    focusPatterns.length === 0
      ? t("tablePane.summary.notRegistered")
      : t("tablePane.summary.registeredCount", {
          count: focusPatterns.length,
        });

  return (
    <PaneCard className="table-pane">
      <TablePaneHeader>
        <TablePaneHeading>
          <PaneTitle>{t("tablePane.title")}</PaneTitle>
          <Button
            data-testid="enable-table-sort"
            onClick={() => {
              enableNow().catch(() => {
                // no-op
              });
            }}
            type="button"
            variant="primary"
          >
            {t("tablePane.enableCurrentTab")}
          </Button>
        </TablePaneHeading>

        <TablePaneSummaryCard
          focusDiagnosticBadgeVariant={focusDiagnosticBadgeVariant}
          focusPatternSummaryLabel={focusPatternSummaryLabel}
          summaryFocusDescription={summaryFocusDescription}
          summaryFocusStatusLabel={summaryFocusStatusLabel}
          urlPatternSummaryLabel={urlPatternSummaryLabel}
        />
      </TablePaneHeader>

      <TablePaneSection data-section="url-patterns">
        <TablePaneSectionHeading>
          <PaneSubtitle>{t("tablePane.urlPatterns.title")}</PaneSubtitle>
          <Hint as="div">{t("tablePane.urlPatterns.description")}</Hint>
        </TablePaneSectionHeading>
        <PatternAddForm
          buttonTestId="pattern-add"
          inputTestId="pattern-input"
          onSubmit={addPattern}
          onValueChange={setPatternInput}
          placeholder="example.com/path*"
          value={patternInput}
        />

        {patterns.length > 0 ? (
          <ScrollArea>
            <PatternList aria-label={t("tablePane.urlPatterns.listAria")}>
              {patterns.map((config) => (
                <PatternConfigListItem
                  config={config}
                  key={config.pattern}
                  onRemove={removePattern}
                  onToggleRowFilter={togglePatternRowFilter}
                  rowFilterTooltip={rowFilterTooltip}
                />
              ))}
            </PatternList>
          </ScrollArea>
        ) : (
          <EmptyMessage>{t("tablePane.empty.patterns")}</EmptyMessage>
        )}
      </TablePaneSection>

      <TablePaneSection data-section="focus-override">
        <TablePaneSectionHeading>
          <PaneSubtitle>{t("tablePane.focus.title")}</PaneSubtitle>
          <Hint as="div">{t("tablePane.focus.description")}</Hint>
        </TablePaneSectionHeading>

        <FocusDiagnosticPanel
          focusDiagnostic={focusDiagnostic}
          focusDiagnosticBadgeVariant={focusDiagnosticBadgeVariant}
          focusDiagnosticRunning={focusDiagnosticRunning}
          focusDiagnosticSlow={focusDiagnosticSlow}
          onRefresh={() => {
            runFocusDiagnostic(true).catch(() => {
              // no-op
            });
          }}
          onReloadCurrentTab={() => {
            reloadCurrentTab().catch(() => {
              // no-op
            });
          }}
        />

        <Hint as="div">{t("tablePane.focus.reloadHint")}</Hint>
        <PatternAddForm
          buttonTestId="focus-pattern-add"
          inputTestId="focus-pattern-input"
          onSubmit={addFocusPattern}
          onValueChange={setFocusPatternInput}
          placeholder="example.com/title/*"
          value={focusPatternInput}
        />

        {focusPatterns.length > 0 ? (
          <ScrollArea>
            <PatternList aria-label={t("tablePane.focus.listAria")}>
              {focusPatterns.map((pattern) => (
                <PatternListItem
                  action={
                    <Button
                      data-focus-pattern-remove={pattern}
                      onClick={() => {
                        removeFocusPattern(pattern).catch(() => {
                          // no-op
                        });
                      }}
                      type="button"
                      variant="danger"
                    >
                      {t("common.delete")}
                    </Button>
                  }
                  key={pattern}
                  pattern={pattern}
                />
              ))}
            </PatternList>
          </ScrollArea>
        ) : (
          <EmptyMessage>{t("tablePane.empty.patterns")}</EmptyMessage>
        )}
      </TablePaneSection>
    </PaneCard>
  );
}
