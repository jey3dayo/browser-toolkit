import { Button } from "@base-ui/react/button";
import { Checkbox } from "@base-ui/react/checkbox";
import { Dialog } from "@base-ui/react/dialog";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { Switch } from "@base-ui/react/switch";
import { Result } from "@praha/byethrow";
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

type DialogMode = "none" | "create" | "edit";

export function SearchGroupsPane(
  props: SearchGroupsPaneProps
): React.JSX.Element {
  const [groups, setGroups] = useState<SearchEngineGroup[]>([]);
  const [engines, setEngines] = useState<SearchEngine[]>([]);
  const [dialogMode, setDialogMode] = useState<DialogMode>("none");
  const [editingGroup, setEditingGroup] = useState<SearchEngineGroup | null>(
    null
  );
  const [nameInput, setNameInput] = useState("");
  const [selectedEngineIds, setSelectedEngineIds] = useState<string[]>([]);

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

  const openCreateDialog = (): void => {
    setDialogMode("create");
    setEditingGroup(null);
    setNameInput("");
    setSelectedEngineIds([]);
  };

  const openEditDialog = (group: SearchEngineGroup): void => {
    setDialogMode("edit");
    setEditingGroup(group);
    setNameInput(group.name);
    setSelectedEngineIds([...group.engineIds]);
  };

  const closeDialog = (): void => {
    setDialogMode("none");
    setEditingGroup(null);
    setNameInput("");
    setSelectedEngineIds([]);
  };

  const toggleEngineSelection = (engineId: string): void => {
    setSelectedEngineIds((prev) =>
      prev.includes(engineId)
        ? prev.filter((id) => id !== engineId)
        : [...prev, engineId]
    );
  };

  const saveGroup = async (): Promise<void> => {
    const name = nameInput.trim();

    if (!name) {
      props.notify.error("グループ名を入力してください");
      return;
    }

    if (selectedEngineIds.length === 0) {
      props.notify.error("少なくとも1つの検索エンジンを選択してください");
      return;
    }

    if (dialogMode === "create") {
      // 新規作成
      if (groups.some((g) => g.name === name)) {
        props.notify.info("既に同じ名前のグループが存在します");
        return;
      }

      if (groups.length >= MAX_SEARCH_ENGINE_GROUPS) {
        props.notify.error(
          `グループは最大${MAX_SEARCH_ENGINE_GROUPS}個までです`
        );
        return;
      }

      const newGroup: SearchEngineGroup = {
        id: generateGroupId(name),
        name,
        engineIds: selectedEngineIds,
        enabled: true,
      };

      const next = [...groups, newGroup];
      await persistWithRollback({
        applyNext: () => {
          setGroups(next);
          closeDialog();
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
    } else if (dialogMode === "edit" && editingGroup) {
      // 編集
      if (groups.some((g) => g.name === name && g.id !== editingGroup.id)) {
        props.notify.info("既に同じ名前のグループが存在します");
        return;
      }

      const next = groups.map((g) =>
        g.id === editingGroup.id
          ? { ...g, name, engineIds: selectedEngineIds }
          : g
      );
      await persistWithRollback({
        applyNext: () => {
          setGroups(next);
          closeDialog();
        },
        rollback: () => {
          setGroups(groups);
        },
        persist: () => saveGroups(next),
        onSuccess: () => {
          props.notify.success("更新しました");
        },
        onFailure: () => {
          props.notify.error("更新に失敗しました");
        },
      });
    }
  };

  const removeGroup = async (groupId: string): Promise<void> => {
    const next = groups.filter((group) => group.id !== groupId);
    await persistWithRollback({
      applyNext: () => {
        setGroups(next);
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
    <>
      <div className="card card-stack">
        <div className="row-between">
          <h2 className="pane-title">まとめて検索</h2>
          <div className="row-gap">
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
            <Button
              className="btn btn-primary btn-small"
              data-testid="add-search-group"
              onClick={openCreateDialog}
              type="button"
            >
              グループを追加
            </Button>
          </div>
        </div>

        <div className="stack">
          <div className="hint">複数の検索エンジンをまとめて実行できます。</div>
          <div className="hint">
            例:
            「お買い物」グループでAmazon、楽天、ビックカメラ、ヨドバシを一括検索
          </div>

          {groups.length > 0 ? (
            <SortableList
              items={groups}
              onReorder={(reordered) => {
                handleReorder(reordered).catch(() => {
                  // no-op
                });
              }}
              renderItem={(group) => {
                const groupEngines = group.engineIds
                  .map((id) => engines.find((e) => e.id === id))
                  .filter((e): e is SearchEngine => e !== undefined);

                return (
                  <div className="search-engine-item">
                    <div className="search-engine-content">
                      <strong className="search-engine-name">
                        {group.name}
                      </strong>
                      <code className="search-engine-url">
                        {groupEngines.map((e) => e.name).join(", ")}
                      </code>
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
                      <Button
                        className="btn-edit"
                        data-testid={`edit-group-${group.id}`}
                        onClick={() => {
                          openEditDialog(group);
                        }}
                        type="button"
                      >
                        編集
                      </Button>
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
                );
              }}
            />
          ) : (
            <p className="empty-message">グループが登録されていません</p>
          )}
        </div>
      </div>

      <Dialog.Root onOpenChange={closeDialog} open={dialogMode !== "none"}>
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup className="dialog-popup">
            <Dialog.Title className="dialog-title">
              {dialogMode === "create" ? "グループを追加" : "グループを編集"}
            </Dialog.Title>
            <Form
              className="stack"
              onFormSubmit={() => {
                saveGroup().catch(() => {
                  // no-op
                });
              }}
            >
              <div className="form-field">
                <label htmlFor="group-name-input">グループ名</label>
                <Input
                  className="pattern-input"
                  data-testid="group-name-input"
                  id="group-name-input"
                  onValueChange={setNameInput}
                  placeholder="例: お買い物"
                  type="text"
                  value={nameInput}
                />
              </div>

              <div className="form-field">
                <div className="form-label">検索エンジン</div>
                <div className="checkbox-group">
                  {engines.map((engine) => (
                    <div className="checkbox-label" key={engine.id}>
                      <Checkbox.Root
                        checked={selectedEngineIds.includes(engine.id)}
                        className="mbu-checkbox"
                        data-testid={`checkbox-${engine.id}`}
                        onCheckedChange={() => {
                          toggleEngineSelection(engine.id);
                        }}
                      >
                        <Checkbox.Indicator className="mbu-checkbox-indicator">
                          ✓
                        </Checkbox.Indicator>
                      </Checkbox.Root>
                      <span>{engine.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dialog-actions">
                <Button
                  className="btn btn-ghost"
                  data-testid="dialog-cancel"
                  onClick={closeDialog}
                  type="button"
                >
                  キャンセル
                </Button>
                <Button
                  className="btn btn-primary"
                  data-testid="dialog-save"
                  onClick={() => {
                    saveGroup().catch(() => {
                      // no-op
                    });
                  }}
                  type="button"
                >
                  保存
                </Button>
              </div>
            </Form>
            <Dialog.Close className="dialog-close" />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
