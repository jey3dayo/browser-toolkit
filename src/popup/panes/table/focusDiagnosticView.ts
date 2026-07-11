import { t } from "@/i18n";
import type {
  FocusDiagnosticBadgeVariant,
  FocusDiagnosticKind,
  FocusDiagnosticView,
} from "@/popup/panes/table/FocusDiagnosticPanel";
import type { FocusOverrideDiagnosticSnapshot } from "@/popup/runtime";

type FocusDiagnosticViewParams = Omit<
  FocusDiagnosticView,
  "label" | "matchedPattern"
> & {
  matchedPattern?: string | null;
};

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
