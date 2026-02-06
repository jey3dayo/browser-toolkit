import { Button } from "@base-ui/react/button";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { Switch } from "@base-ui/react/switch";
import { Result } from "@praha/byethrow";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { SortableList } from "@/components/SortableList";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
import {
  DEFAULT_SEARCH_ENGINE_GROUPS,
  generateGroupId,
  MAX_SEARCH_ENGINE_GROUPS,
  normalizeSearchEngineGroups,
  type SearchEngineGroup,
} from "@/search_engine_groups";
import {
  DEFAULT_SEARCH_ENGINES,
  normalizeSearchEngines,
  type SearchEngine,
} from "@/search_engines";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export type SearchGroupsPaneProps = PopupPaneBaseProps;

export function SearchGroupsPane(
  props: SearchGroupsPaneProps
): React.JSX.Element {
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

  return (
    <div className="card card-stack">
      <div className="row-between">
        <h2 className="pane-title">まとめて検索</h2>
        <Button
          className="btn btn-ghost btn-small"
          data-testid="reset-search-groups"
          onClick={() => {
            resetToDefaults().catch(() => {
              // no-op
            });
          }}
          type="button"
        >
          デフォルトに戻す
        </Button>
      </div>

      <div className="stack">
        <div className="hint">複数の検索エンジンをまとめて実行できます。</div>
        <div className="hint">
          例:
          「お買い物」グループでAmazon、楽天、ビックカメラ、ヨドバシを一括検索
        </div>

        <Form
          className="pattern-input-group"
          onFormSubmit={() => {
            addNewGroup().catch(() => {
              // no-op
            });
          }}
        >
          <Input
            className="pattern-input"
            data-testid="new-group-name"
            onValueChange={setNewGroupNameInput}
            placeholder="グループ名（例: お買い物）"
            type="text"
            value={newGroupNameInput}
          />
          <Button
            className="btn btn-ghost btn-small"
            data-testid="add-search-group"
            disabled={engines.length === 0}
            type="submit"
          >
            追加
          </Button>
        </Form>

        {groups.length > 0 ? (
          <SortableList
            items={groups}
            onReorder={(reordered) => {
              handleReorder(reordered).catch(() => {
                // no-op
              });
            }}
            renderItem={(group) => {
              const isExpanded = expandedGroupId === group.id;
              const isEditingName = editingNameGroupId === group.id;
              const groupEngines = group.engineIds
                .map((id) => engines.find((e) => e.id === id))
                .filter((e): e is SearchEngine => e !== undefined);

              return (
                <div>
                  <div className="search-engine-item">
                    <button
                      className="expand-indicator"
                      data-testid={`expand-group-${group.id}`}
                      onClick={() => {
                        toggleGroupExpand(group.id);
                      }}
                      type="button"
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    <div className="search-engine-content">
                      {isEditingName ? (
                        <div className="inline-edit-row">
                          <Input
                            autoFocus
                            className="pattern-input inline-edit-input"
                            data-testid="edit-group-name-input"
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveGroupName(group.id).catch(() => {
                                  // no-op
                                });
                              }
                              if (e.key === "Escape") {
                                cancelEditingGroupName();
                              }
                            }}
                            onValueChange={setEditingNameValue}
                            type="text"
                            value={editingNameValue}
                          />
                          <Button
                            className="btn btn-ghost btn-small"
                            data-testid="save-group-name"
                            onClick={() => {
                              saveGroupName(group.id).catch(() => {
                                // no-op
                              });
                            }}
                            type="button"
                          >
                            保存
                          </Button>
                          <Button
                            className="btn btn-ghost btn-small"
                            onClick={cancelEditingGroupName}
                            type="button"
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="group-expand-button"
                          onClick={() => {
                            toggleGroupExpand(group.id);
                          }}
                          type="button"
                        >
                          <strong className="search-engine-name">
                            {group.name}
                          </strong>
                          <code className="search-engine-url">
                            {groupEngines.map((e) => e.name).join(", ")}
                          </code>
                        </button>
                      )}
                    </div>
                    <div className="search-engine-controls">
                      <Switch.Root
                        aria-label={`${group.name}を有効化`}
                        checked={group.enabled}
                        className="mbu-switch"
                        data-testid={`group-enabled-${group.id}`}
                        onCheckedChange={(checked) => {
                          toggleGroupEnabled(group.id, checked).catch(() => {
                            // no-op
                          });
                        }}
                      >
                        <Switch.Thumb className="mbu-switch-thumb" />
                      </Switch.Root>
                      <button
                        className="btn-edit"
                        data-testid={`edit-group-${group.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingGroupName(group);
                        }}
                        type="button"
                      >
                        <Pencil size={12} />
                      </button>
                      <Button
                        className="btn-delete"
                        data-testid={`remove-group-${group.id}`}
                        onClick={() => {
                          removeGroup(group.id).catch(() => {
                            // no-op
                          });
                        }}
                        type="button"
                      >
                        削除
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="group-engines-list">
                      {engines.map((engine) => {
                        const isInGroup = group.engineIds.includes(engine.id);
                        return (
                          <div className="group-engine-item" key={engine.id}>
                            <span className="group-engine-name">
                              {engine.name}
                            </span>
                            <Switch.Root
                              aria-label={`${group.name}に${engine.name}を含める`}
                              checked={isInGroup}
                              className="mbu-switch"
                              data-testid={`group-engine-${group.id}-${engine.id}`}
                              onCheckedChange={(checked) => {
                                toggleEngineInGroup(
                                  group.id,
                                  engine.id,
                                  checked
                                ).catch(() => {
                                  // no-op
                                });
                              }}
                            >
                              <Switch.Thumb className="mbu-switch-thumb" />
                            </Switch.Root>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }}
          />
        ) : (
          <p className="empty-message">グループが登録されていません</p>
        )}
      </div>
    </div>
  );
}
