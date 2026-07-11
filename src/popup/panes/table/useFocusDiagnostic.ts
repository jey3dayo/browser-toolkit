import { Result } from "@praha/byethrow";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import {
  FOCUS_DIAGNOSTIC_SLOW_MS,
  type FocusDiagnosticBadgeVariant,
  type FocusDiagnosticView,
} from "@/popup/panes/table/FocusDiagnosticPanel";
import {
  buildFocusDiagnosticView,
  getFocusDiagnosticBadgeVariant,
  isFocusOverrideApplied,
  summarizeUrl,
} from "@/popup/panes/table/focusDiagnosticView";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

export type UseFocusDiagnosticResult = {
  focusDiagnostic: FocusDiagnosticView | null;
  focusDiagnosticRunning: boolean;
  focusDiagnosticSlow: boolean;
  focusDiagnosticBadgeVariant: FocusDiagnosticBadgeVariant;
  runFocusDiagnostic: (showToast: boolean) => Promise<void>;
  requestFocusDiagnostic: (showToast: boolean) => void;
  reloadCurrentTab: () => Promise<void>;
  syncFocusPatternsRef: (patterns: string[]) => void;
};

export function useFocusDiagnostic(
  props: PopupPaneBaseProps,
  focusPatterns: string[]
): UseFocusDiagnosticResult {
  const [focusDiagnostic, setFocusDiagnostic] =
    useState<FocusDiagnosticView | null>(null);
  const [focusDiagnosticRunning, setFocusDiagnosticRunning] = useState(false);
  const [focusDiagnosticSlow, setFocusDiagnosticSlow] = useState(false);
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

  const runFocusDiagnosticRef = useRef(runFocusDiagnostic);
  runFocusDiagnosticRef.current = runFocusDiagnostic;
  const requestFocusDiagnostic = useCallback((showToast: boolean) => {
    runFocusDiagnosticRef.current(showToast).catch(() => {
      // no-op
    });
  }, []);

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

  const focusDiagnosticBadgeVariant =
    getFocusDiagnosticBadgeVariant(focusDiagnostic);

  const syncFocusPatternsRef = (patterns: string[]): void => {
    focusPatternsRef.current = patterns;
  };

  return {
    focusDiagnostic,
    focusDiagnosticRunning,
    focusDiagnosticSlow,
    focusDiagnosticBadgeVariant,
    runFocusDiagnostic,
    requestFocusDiagnostic,
    reloadCurrentTab,
    syncFocusPatternsRef,
  };
}
