import { Result } from "@praha/byethrow";
import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
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
import { persistWithRollback } from "@/popup/utils/persist";
import { requireTrimmedString } from "@/popup/utils/required-input";

export type UseFocusPatternsResult = {
  focusPatternInput: string;
  setFocusPatternInput: (value: string) => void;
  addFocusPattern: () => Promise<void>;
  removeFocusPattern: (pattern: string) => Promise<void>;
};

type UseFocusPatternsOptions = {
  focusPatternsState: [string[], Dispatch<SetStateAction<string[]>>];
  setPatterns: (patterns: DomainPatternConfig[]) => void;
  runFocusDiagnostic: (showToast: boolean) => Promise<void>;
  requestFocusDiagnostic: (showToast: boolean) => void;
  syncFocusPatternsRef: (patterns: string[]) => void;
};

export function useFocusPatterns(
  props: PopupPaneBaseProps,
  {
    focusPatternsState,
    setPatterns,
    runFocusDiagnostic,
    requestFocusDiagnostic,
    syncFocusPatternsRef,
  }: UseFocusPatternsOptions
): UseFocusPatternsResult {
  const [focusPatterns, setFocusPatterns] = focusPatternsState;
  const [focusPatternInput, setFocusPatternInput] = useState("");

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
        syncFocusPatternsRef(focusPatternsResult.value);
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

  return {
    focusPatternInput,
    setFocusPatternInput,
    addFocusPattern,
    removeFocusPattern,
  };
}
