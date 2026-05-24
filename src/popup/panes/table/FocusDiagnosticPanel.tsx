import { cva } from "class-variance-authority";
import type { ComponentPropsWithoutRef } from "react";
import { Badge, type BadgeProps } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { ButtonRow, RowBetween, Stack } from "@/components/shared/Layout";
import { t } from "@/i18n";
import type { FocusOverrideDiagnosticSnapshot } from "@/popup/runtime";

export type FocusDiagnosticKind =
  | "not-configured"
  | "active"
  | "reload-required"
  | "unavailable";

export type FocusDiagnosticView = {
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

export type FocusDiagnosticBadgeVariant = BadgeProps["variant"];

export const FOCUS_DIAGNOSTIC_SLOW_MS = 300;

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

type FocusDiagnosticPanelProps = {
  focusDiagnostic: FocusDiagnosticView | null;
  focusDiagnosticBadgeVariant: FocusDiagnosticBadgeVariant;
  focusDiagnosticRunning: boolean;
  focusDiagnosticSlow: boolean;
  onRefresh: () => void;
  onReloadCurrentTab: () => void;
};

export function FocusDiagnosticPanel({
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

export function summarizeUrl(url: string | undefined): string | null {
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

export function isFocusOverrideApplied(
  snapshot: FocusOverrideDiagnosticSnapshot
): boolean {
  return (
    snapshot.markerPresent &&
    snapshot.visibilityState === "visible" &&
    snapshot.hidden === false &&
    snapshot.hasFocus === true
  );
}

export function buildFocusDiagnosticView(
  params: FocusDiagnosticViewParams
): FocusDiagnosticView {
  const labelMap: Record<FocusDiagnosticKind, string> = {
    "not-configured": t("tablePane.diagnostic.labels.notConfigured"),
    active: t("tablePane.diagnostic.labels.active"),
    "reload-required": t("tablePane.diagnostic.labels.reloadRequired"),
    unavailable: t("tablePane.diagnostic.labels.unavailable"),
  };

  return {
    ...params,
    label: labelMap[params.kind],
    matchedPattern: params.matchedPattern ?? null,
  };
}

export function getFocusDiagnosticBadgeVariant(
  focusDiagnostic: FocusDiagnosticView | null
): FocusDiagnosticBadgeVariant {
  if (focusDiagnostic?.kind === "active") {
    return "focusDiagnosticActive";
  }
  if (focusDiagnostic?.kind === "reload-required") {
    return "focusDiagnosticWarning";
  }
  return "focusDiagnosticNeutral";
}
