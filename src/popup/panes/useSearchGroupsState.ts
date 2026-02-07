import { Result } from "@praha/byethrow";
import { useEffect, useMemo, useState } from "react";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
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
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export type SearchGroupsState = {
  groups: SearchEngineGroup[];
  engines: SearchEngine[];
  enginesById: Map<string, SearchEngine>;
  expandedGroupId: string | null;
  editingNameGroupId: string | null;
  editingNameValue: string;
  newGroupNameInput: string;
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
  const [newGroupNameInput, setNewGroupNameInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await props.runtime.storageSyncGet([
        "searchEngineGroups",
        "searchEngines",
      ]);
      if (cancelled) {
        return;
      }

      // ストレージ読み込み失敗時もデフォルト値を表示
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
    })().catch((error) => {
      debugLog(
        "SearchGroupsPane.useEffect[props.runtime]",
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

  const enginesById = useMemo(() => {
    return new Map(engines.map((engine) => [engine.id, engine]));
  }, [engines]);

  const saveGroups = async (
    nextGroups: SearchEngineGroup[]
  ): Promise<Result.Result<void, string>> => {
    // ストレージ保存のみ。メニューは background.ts の storage.onChanged で自動更新される
    return await props.runtime.storageSyncSet({
      searchEngineGroups: nextGroups,
    });
  };

  const toggleGroupEnabled = async (
    groupId: string,
    checked: boolean
  ): Promise<void> => {
    const next = groups.map((group) =>
      group.id === groupId ? { ...group, enabled: checked } : group
    );
    await persistWithRollback({
      applyNext: () => {
        setGroups(next);
      },
      rollback: () => {
        setGroups(groups);
      },
      persist: () => saveGroups(next),
      onFailure: () => {
        props.notify.error("保存に失敗しました");
      },
    });
  };

  const toggleGroupExpand = (groupId: string): void => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const startEditingGroupName = (group: SearchEngineGroup): void => {
    setEditingNameGroupId(group.id);
    setEditingNameValue(group.name);
  };

  const cancelEditingGroupName = (): void => {
    setEditingNameGroupId(null);
    setEditingNameValue("");
  };

  const saveGroupName = async (groupId: string): Promise<void> => {
    const name = editingNameValue.trim();

    if (!name) {
      props.notify.error("グループ名を入力してください");
      return;
    }

    if (groups.some((g) => g.name === name && g.id !== groupId)) {
      props.notify.info("既に同じ名前のグループが存在します");
      return;
    }

    const next = groups.map((g) => (g.id === groupId ? { ...g, name } : g));
    await persistWithRollback({
      applyNext: () => {
        setGroups(next);
        cancelEditingGroupName();
      },
      rollback: () => {
        setGroups(groups);
      },
      persist: () => saveGroups(next),
      onFailure: () => {
        props.notify.error("更新に失敗しました");
      },
    });
  };

  const toggleEngineInGroup = async (
    groupId: string,
    engineId: string,
    isIncluded: boolean
  ): Promise<void> => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) {
      return;
    }

    // OFFにしようとした時、最後の1つなら防ぐ
    if (!isIncluded && group.engineIds.length <= 1) {
      props.notify.error("少なくとも1つの検索エンジンが必要です");
      return;
    }

    let nextEngineIds: string[];
    if (isIncluded) {
      nextEngineIds = group.engineIds.includes(engineId)
        ? group.engineIds
        : [...group.engineIds, engineId];
    } else {
      nextEngineIds = group.engineIds.filter((id) => id !== engineId);
    }

    const next = groups.map((g) =>
      g.id === groupId ? { ...g, engineIds: nextEngineIds } : g
    );
    await persistWithRollback({
      applyNext: () => {
        setGroups(next);
      },
      rollback: () => {
        setGroups(groups);
      },
      persist: () => saveGroups(next),
      onFailure: () => {
        props.notify.error("保存に失敗しました");
      },
    });
  };

  const addNewGroup = async (): Promise<void> => {
    const name = newGroupNameInput.trim();

    if (!name) {
      props.notify.error("グループ名を入力してください");
      return;
    }

    if (engines.length === 0) {
      props.notify.error("検索エンジンが読み込まれていません");
      return;
    }

    if (groups.some((g) => g.name === name)) {
      props.notify.info("既に同じ名前のグループが存在します");
      return;
    }

    if (groups.length >= MAX_SEARCH_ENGINE_GROUPS) {
      props.notify.error(`グループは最大${MAX_SEARCH_ENGINE_GROUPS}個までです`);
      return;
    }

    // デフォルトで最初のエンジンのみON
    const newGroup: SearchEngineGroup = {
      id: generateGroupId(name),
      name,
      engineIds: [engines[0].id],
      enabled: true,
    };

    const next = [...groups, newGroup];
    await persistWithRollback({
      applyNext: () => {
        setGroups(next);
        setNewGroupNameInput("");
        setExpandedGroupId(newGroup.id);
      },
      rollback: () => {
        setGroups(groups);
      },
      persist: () => saveGroups(next),
      onSuccess: () => {
        props.notify.success("追加しました");
      },
      onFailure: () => {
        props.notify.error("追加に失敗しました");
      },
    });
  };

  const removeGroup = async (groupId: string): Promise<void> => {
    const next = groups.filter((group) => group.id !== groupId);
    await persistWithRollback({
      applyNext: () => {
        setGroups(next);
        if (expandedGroupId === groupId) {
          setExpandedGroupId(null);
        }
      },
      rollback: () => {
        setGroups(groups);
      },
      persist: () => saveGroups(next),
      onSuccess: () => {
        props.notify.success("削除しました");
      },
      onFailure: () => {
        props.notify.error("削除に失敗しました");
      },
    });
  };

  const resetToDefaults = async (): Promise<void> => {
    await persistWithRollback({
      applyNext: () => {
        setGroups(DEFAULT_SEARCH_ENGINE_GROUPS);
        setExpandedGroupId(null);
        cancelEditingGroupName();
      },
      rollback: () => {
        setGroups(groups);
      },
      persist: () => saveGroups(DEFAULT_SEARCH_ENGINE_GROUPS),
      onSuccess: () => {
        props.notify.success("デフォルトに戻しました");
      },
      onFailure: () => {
        props.notify.error("リセットに失敗しました");
      },
    });
  };

  const handleReorder = async (
    reorderedGroups: SearchEngineGroup[]
  ): Promise<void> => {
    await persistWithRollback({
      applyNext: () => {
        setGroups(reorderedGroups);
      },
      rollback: () => {
        setGroups(groups);
      },
      persist: () => saveGroups(reorderedGroups),
      onSuccess: () => {
        props.notify.success("並び替えを保存しました");
      },
      onFailure: () => {
        props.notify.error("並び替えの保存に失敗しました");
      },
    });
  };

  return {
    groups,
    engines,
    enginesById,
    expandedGroupId,
    editingNameGroupId,
    editingNameValue,
    newGroupNameInput,
    setEditingNameValue,
    setNewGroupNameInput,
    toggleGroupEnabled,
    toggleGroupExpand,
    startEditingGroupName,
    cancelEditingGroupName,
    saveGroupName,
    toggleEngineInGroup,
    addNewGroup,
    removeGroup,
    resetToDefaults,
    handleReorder,
  };
}
