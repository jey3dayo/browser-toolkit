import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
import { requireTrimmedString } from "@/popup/utils/required-input";
import type { SearchEngine, SearchEngineEncoding } from "@/search_engine_types";
import {
  DEFAULT_SEARCH_ENGINES,
  isValidUrlTemplate,
  MAX_SEARCH_ENGINES,
  normalizeSearchEngines,
} from "@/search_engines";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export type SearchEnginesController = {
  engines: SearchEngine[];
  nameInput: string;
  setNameInput: (value: string) => void;
  urlInput: string;
  setUrlInput: (value: string) => void;
  encodingInput: SearchEngineEncoding;
  setEncodingInput: (value: SearchEngineEncoding) => void;
  toggleEngineEnabled: (engineId: string, checked: boolean) => Promise<void>;
  addEngine: () => Promise<void>;
  removeEngine: (engineId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  handleReorder: (reorderedEngines: SearchEngine[]) => Promise<void>;
};

export function useSearchEnginesController(
  props: PopupPaneBaseProps
): SearchEnginesController {
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
        props.notify.error(t("searchEngines.errors.saveFailed"));
      },
    });
  };

  const addEngine = async (): Promise<void> => {
    const name = requireTrimmedString({
      value: nameInput,
      emptyMessage: t("searchEngines.errors.nameRequired"),
      notify: props.notify,
    });
    if (!name) {
      return;
    }

    const urlTemplate = requireTrimmedString({
      value: urlInput,
      emptyMessage: t("searchEngines.errors.urlTemplateRequired"),
      notify: props.notify,
    });
    if (!urlTemplate) {
      return;
    }

    if (!isValidUrlTemplate(urlTemplate)) {
      props.notify.error(t("searchEngines.errors.queryRequired"));
      return;
    }

    if (engines.some((engine) => engine.name === name)) {
      props.notify.info(t("searchEngines.info.duplicate"));
      return;
    }

    if (engines.length >= MAX_SEARCH_ENGINES) {
      props.notify.error(
        t("searchEngines.errors.max", { count: MAX_SEARCH_ENGINES })
      );
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
        props.notify.success(t("searchEngines.success.added"));
      },
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.addFailed"));
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
        props.notify.success(t("searchEngines.success.deleted"));
      },
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.deleteFailed"));
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
        props.notify.success(t("searchEngines.success.reset"));
      },
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.resetFailed"));
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
        props.notify.success(t("searchEngines.success.reordered"));
      },
      onFailure: () => {
        props.notify.error(t("searchEngines.errors.reorderFailed"));
      },
    });
  };

  return {
    engines,
    nameInput,
    setNameInput,
    urlInput,
    setUrlInput,
    encodingInput,
    setEncodingInput,
    toggleEngineEnabled,
    addEngine,
    removeEngine,
    resetToDefaults,
    handleReorder,
  };
}
