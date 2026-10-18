import { Result } from "@praha/byethrow";
import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
import { requireTrimmedString } from "@/popup/utils/required-input";
import {
  DEFAULT_SEARCH_ENGINE_GROUPS,
  generateGroupId,
  MAX_SEARCH_ENGINE_GROUPS,
  normalizeSearchEngineGroups,
  type SearchEngineGroup,
} from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engine_types";
import {
  DEFAULT_SEARCH_ENGINES,
  normalizeSearchEngines,
} from "@/search_engines";
import { runWithSharedLock } from "@/utils/async";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

const GROUP_MUTATION_MAX_ATTEMPTS = 5;

type PreparedGroupMutation = {
  next: SearchEngineGroup[];
  applyNext: () => void;
  onSuccess?: () => void;
  onFailure: () => void;
};

export type SearchGroupsState = {
  groups: SearchEngineGroup[];
  engines: SearchEngine[];
  enginesById: Map<string, SearchEngine>;
  expandedGroupId: string | null;
  editingNameGroupId: string | null;
  editingNameValue: string;
  newGroupNameInput: string;
  newGroupNameError: string | null;
  setEditingNameValue: (value: string) => void;
  setNewGroupNameInput: (value: string) => void;
  toggleGroupEnabled: (groupId: string, checked: boolean) => Promise<void>;
  toggleGroupExpand: (groupId: string) => void;
  startEditingGroupName: (group: SearchEngineGroup) => void;
  cancelEditingGroupName: () => void;
  saveGroupName: (groupId: string) => Promise<void>;
  toggleEngineInGroup: (
    groupId: string,
    engineId: string,
    isIncluded: boolean
  ) => Promise<void>;
  addNewGroup: () => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  handleReorder: (reorderedGroups: SearchEngineGroup[]) => Promise<void>;
};

export function useSearchGroupsState(
  props: PopupPaneBaseProps
): SearchGroupsState {
  const [groups, setGroups] = useState<SearchEngineGroup[]>([]);
  const [engines, setEngines] = useState<SearchEngine[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [editingNameGroupId, setEditingNameGroupId] = useState<string | null>(
    null
  );
  const [editingNameValue, setEditingNameValue] = useState("");
  const [newGroupNameInput, setNewGroupNameInputValue] = useState("");
  const [newGroupNameError, setNewGroupNameError] = useState<string | null>(
    null
  );
  const editingNameGroupIdRef = useRef<string | null>(null);

  const updateEditingNameGroupId = (value: string | null): void => {
    editingNameGroupIdRef.current = value;
    setEditingNameGroupId(value);
  };

  const setNewGroupNameInput = (value: string): void => {
    setNewGroupNameInputValue(value);
    setNewGroupNameError(null);
  };

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async (): Promise<void> => {
      const data = await props.runtime.storageSyncGet([
        "searchEngineGroups",
        "searchEngines",
      ]);
      if (cancelled) {
        return;
      }

      if (Result.isFailure(data)) {
        setGroups(DEFAULT_SEARCH_ENGINE_GROUPS);
        setEngines(DEFAULT_SEARCH_ENGINES);
        return;
      }

      const existingGroups = normalizeSearchEngineGroups(
        data.value.searchEngineGroups
      );
      const groupsResult =
        existingGroups.length > 0
          ? existingGroups
          : DEFAULT_SEARCH_ENGINE_GROUPS;
      setGroups(groupsResult);

      const existingEngines = normalizeSearchEngines(data.value.searchEngines);
      const enginesResult =
        existingEngines.length > 0 ? existingEngines : DEFAULT_SEARCH_ENGINES;
      setEngines(enginesResult);
    };

    const reportLoadFailure = async (error: unknown): Promise<void> => {
      try {
        await debugLog(
          "SearchGroupsPane.useEffect[props.runtime]",
          "failed",
          { error: formatErrorLog("", {}, error) },
          "error"
        );
      } catch {
        // no-op
      }
    };

    loadGroups().catch(reportLoadFailure);

    const onChanged =
      typeof chrome === "undefined" ? undefined : chrome.storage?.onChanged;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ): void => {
      if (areaName !== "sync" || !("searchEngineGroups" in changes)) {
        return;
      }
      const raw = changes.searchEngineGroups?.newValue;
      if (!Array.isArray(raw) || editingNameGroupIdRef.current !== null) {
        return;
      }
      const existingGroups = normalizeSearchEngineGroups(raw);
      setGroups(
        existingGroups.length > 0
          ? existingGroups
          : DEFAULT_SEARCH_ENGINE_GROUPS
      );
    };
    onChanged?.addListener(handleStorageChange);

    return () => {
      cancelled = true;
      onChanged?.removeListener(handleStorageChange);
    };
  }, [props.runtime]);

  // 保存前に storage を再読込し、直近の配列（自分の保存結果または別タブの更新）に
  // local mutation を再適用する。複数編集画面・連打保存での lost update を止めるため。
  // 読み込み失敗時は直前のローカル state にフォールバックする。
  const readLatestGroups = async (): Promise<SearchEngineGroup[] | null> => {
    const data = await props.runtime.storageSyncGet(["searchEngineGroups"]);
    if (Result.isFailure(data)) {
      return null;
    }
    const existingGroups = normalizeSearchEngineGroups(
      data.value.searchEngineGroups
    );
    return existingGroups.length > 0
      ? existingGroups
      : DEFAULT_SEARCH_ENGINE_GROUPS;
  };

  const enginesById = useMemo(
    () => new Map(engines.map((engine) => [engine.id, engine])),
    [engines]
  );

  const saveGroups = async (
    nextGroups: SearchEngineGroup[]
  ): Promise<Result.Result<void, string>> => {
    // ストレージ保存のみ。メニューは background.ts の storage.onChanged で自動更新される
    return await props.runtime.storageSyncSet({
      searchEngineGroups: nextGroups,
    });
  };

  // 保存は同一 origin の各インスタンス（popup / options）間で共有される lock で
  // 直列化する（Web Locks、テスト環境では realm 内共有 queue）。lock 内の
  // read-latest → write → re-read verify が自分の書き込みと一致しない
  // (別 popup が先んじた / 先に割り込んだ) 場合は最新 base でやり直す。
  // persist 失敗時は既存の rollback / notify を維持し、再試行しない。
  const verifyGroupsPersisted = async (
    next: SearchEngineGroup[]
  ): Promise<boolean> => {
    const stored = await readLatestGroups();
    if (!stored) {
      return true;
    }
    return (
      JSON.stringify(normalizeSearchEngineGroups(stored)) ===
      JSON.stringify(normalizeSearchEngineGroups(next))
    );
  };

  const runGroupMutationAttempts = async (
    prepare: (base: SearchEngineGroup[]) => PreparedGroupMutation | null
  ): Promise<void> => {
    let attempt = 0;
    while (attempt < GROUP_MUTATION_MAX_ATTEMPTS) {
      attempt += 1;
      // biome-ignore lint/performance/noAwaitInLoops: intentional serial optimistic-concurrency retries
      const latest = await readLatestGroups();
      const base = latest ?? groups;
      const mutation = prepare(base);
      if (!mutation) {
        return;
      }
      const saved = await persistWithRollback({
        applyNext: mutation.applyNext,
        onFailure: mutation.onFailure,
        persist: () => saveGroups(mutation.next),
        rollback: () => {
          setGroups(groups);
        },
      });
      if (!saved) {
        return;
      }
      if (await verifyGroupsPersisted(mutation.next)) {
        mutation.onSuccess?.();
        return;
      }
    }
  };

  const runGroupMutation = (
    prepare: (base: SearchEngineGroup[]) => PreparedGroupMutation | null
  ): Promise<void> =>
    runWithSharedLock("searchEngineGroups", () =>
      runGroupMutationAttempts(prepare)
    );

  const toggleGroupEnabled = (groupId: string, checked: boolean) =>
    runGroupMutation((base) => {
      const next = base.map((group) =>
        group.id === groupId ? { ...group, enabled: checked } : group
      );
      return {
        applyNext: () => {
          setGroups(next);
        },
        next,
        onFailure: () => {
          props.notify.error(t("searchGroups.errors.saveFailed"));
        },
      };
    });

  const toggleGroupExpand = (groupId: string): void => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const startEditingGroupName = (group: SearchEngineGroup): void => {
    updateEditingNameGroupId(group.id);
    setEditingNameValue(group.name);
  };

  const cancelEditingGroupName = (): void => {
    updateEditingNameGroupId(null);
    setEditingNameValue("");
  };

  const saveGroupName = (groupId: string): Promise<void> => {
    const name = requireTrimmedString({
      emptyMessage: t("searchGroups.errors.nameRequired"),
      notify: props.notify,
      value: editingNameValue,
    });
    if (!name) {
      return Promise.resolve();
    }

    return runGroupMutation((base) => {
      if (base.some((g) => g.name === name && g.id !== groupId)) {
        props.notify.info(t("searchGroups.info.duplicate"));
        return null;
      }

      const next = base.map((g) => (g.id === groupId ? { ...g, name } : g));
      return {
        applyNext: () => {
          setGroups(next);
          cancelEditingGroupName();
        },
        next,
        onFailure: () => {
          props.notify.error(t("searchGroups.errors.updateFailed"));
        },
      };
    });
  };

  const toggleEngineInGroup = (
    groupId: string,
    engineId: string,
    isIncluded: boolean
  ) =>
    runGroupMutation((base) => {
      const group = base.find((g) => g.id === groupId);
      if (!group) {
        return null;
      }

      if (!isIncluded && group.engineIds.length <= 1) {
        props.notify.error(t("searchGroups.errors.minEngine"));
        return null;
      }

      let nextEngineIds: string[];
      if (isIncluded) {
        nextEngineIds = group.engineIds.includes(engineId)
          ? group.engineIds
          : [...group.engineIds, engineId];
      } else {
        nextEngineIds = group.engineIds.filter((id) => id !== engineId);
      }

      const next = base.map((g) =>
        g.id === groupId ? { ...g, engineIds: nextEngineIds } : g
      );
      return {
        applyNext: () => {
          setGroups(next);
        },
        next,
        onFailure: () => {
          props.notify.error(t("searchGroups.errors.saveFailed"));
        },
      };
    });

  const addNewGroup = (): Promise<void> => {
    const name = newGroupNameInput.trim();
    if (!name) {
      setNewGroupNameError(t("searchGroups.errors.nameRequired"));
      return Promise.resolve();
    }

    if (engines.length === 0) {
      props.notify.error(t("searchGroups.errors.enginesNotLoaded"));
      return Promise.resolve();
    }

    return runGroupMutation((base) => {
      if (base.some((g) => g.name === name)) {
        setNewGroupNameError(t("searchGroups.info.duplicate"));
        return null;
      }

      if (base.length >= MAX_SEARCH_ENGINE_GROUPS) {
        props.notify.error(
          t("searchGroups.errors.max", { count: MAX_SEARCH_ENGINE_GROUPS })
        );
        return null;
      }

      const newGroup: SearchEngineGroup = {
        enabled: true,
        engineIds: [engines[0].id],
        id: generateGroupId(name),
        name,
      };

      const next = [...base, newGroup];
      return {
        applyNext: () => {
          setGroups(next);
          setNewGroupNameInput("");
          setExpandedGroupId(newGroup.id);
        },
        next,
        onFailure: () => {
          props.notify.error(t("searchGroups.errors.addFailed"));
        },
        onSuccess: () => {
          props.notify.success(t("searchGroups.success.added"));
        },
      };
    });
  };

  const removeGroup = (groupId: string) =>
    runGroupMutation((base) => {
      const next = base.filter((group) => group.id !== groupId);
      return {
        applyNext: () => {
          setGroups(next);
          if (expandedGroupId === groupId) {
            setExpandedGroupId(null);
          }
        },
        next,
        onFailure: () => {
          props.notify.error(t("searchGroups.errors.deleteFailed"));
        },
        onSuccess: () => {
          props.notify.success(t("searchGroups.success.deleted"));
        },
      };
    });

  const resetToDefaults = () =>
    runGroupMutation(() => ({
      applyNext: () => {
        setGroups(DEFAULT_SEARCH_ENGINE_GROUPS);
        setExpandedGroupId(null);
        cancelEditingGroupName();
      },
      next: DEFAULT_SEARCH_ENGINE_GROUPS,
      onFailure: () => {
        props.notify.error(t("searchGroups.errors.resetFailed"));
      },
      onSuccess: () => {
        props.notify.success(t("searchGroups.success.reset"));
      },
    }));

  // 並び替えは drag handler が渡した全オブジェクトではなく、直近の storage の
  // レコードを要求された ID 順に並べて保存する。別インスタンスの直後の
  // 有効 / 名前編集が並び替え write で戻されないようにするため。
  const handleReorder = (reorderedGroups: SearchEngineGroup[]) =>
    runGroupMutation((base) => {
      const byId = new Map(base.map((group) => [group.id, group]));
      const consumed = new Set<string>();
      const next: SearchEngineGroup[] = [];
      for (const group of reorderedGroups) {
        if (consumed.has(group.id)) {
          continue;
        }
        const latest = byId.get(group.id);
        if (!latest) {
          continue;
        }
        consumed.add(group.id);
        next.push(latest);
      }
      for (const group of base) {
        if (!consumed.has(group.id)) {
          next.push(group);
        }
      }
      return {
        applyNext: () => {
          setGroups(next);
        },
        next,
        onFailure: () => {
          props.notify.error(t("searchGroups.errors.reorderFailed"));
        },
        onSuccess: () => {
          props.notify.success(t("searchGroups.success.reordered"));
        },
      };
    });

  return {
    addNewGroup,
    cancelEditingGroupName,
    editingNameGroupId,
    editingNameValue,
    engines,
    enginesById,
    expandedGroupId,
    groups,
    handleReorder,
    newGroupNameError,
    newGroupNameInput,
    removeGroup,
    resetToDefaults,
    saveGroupName,
    setEditingNameValue,
    setNewGroupNameInput,
    startEditingGroupName,
    toggleEngineInGroup,
    toggleGroupEnabled,
    toggleGroupExpand,
  };
}
