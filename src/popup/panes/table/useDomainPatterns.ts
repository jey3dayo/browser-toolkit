import { Result } from "@praha/byethrow";
import { useState } from "react";
import type { DomainPatternConfig } from "@/domain-pattern-configs";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { EnableTableSortMessage } from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";

export type UseDomainPatternsResult = {
  patterns: DomainPatternConfig[];
  patternInput: string;
  setPatternInput: (value: string) => void;
  setPatterns: (patterns: DomainPatternConfig[]) => void;
  enableNow: () => Promise<void>;
  togglePatternRowFilter: (pattern: string, checked: boolean) => Promise<void>;
  addPattern: () => Promise<void>;
  removePattern: (pattern: string) => Promise<void>;
};

export function useDomainPatterns(
  props: PopupPaneBaseProps
): UseDomainPatternsResult {
  const [patterns, setPatterns] = useState<DomainPatternConfig[]>([]);
  const [patternInput, setPatternInput] = useState("");

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

  return {
    patterns,
    patternInput,
    setPatternInput,
    setPatterns,
    enableNow,
    togglePatternRowFilter,
    addPattern,
    removePattern,
  };
}
