import { Button } from "@base-ui/react/button";
import { Input } from "@base-ui/react/input";
import { Switch } from "@base-ui/react/switch";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import type { SearchEngineGroup } from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engine_types";

export type SearchGroupItemProps = {
  group: SearchEngineGroup;
  engines: SearchEngine[];
  enginesById: Map<string, SearchEngine>;
  isExpanded: boolean;
  isEditingName: boolean;
  editingNameValue: string;
  setEditingNameValue: (value: string) => void;
  toggleGroupExpand: (groupId: string) => void;
  startEditingGroupName: (group: SearchEngineGroup) => void;
  cancelEditingGroupName: () => void;
  saveGroupName: (groupId: string) => Promise<void>;
  toggleGroupEnabled: (groupId: string, checked: boolean) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  toggleEngineInGroup: (
    groupId: string,
    engineId: string,
    isIncluded: boolean
  ) => Promise<void>;
};

export function SearchGroupItem(
  props: SearchGroupItemProps
): React.JSX.Element {
  const {
    group,
    engines,
    enginesById,
    isExpanded,
    isEditingName,
    editingNameValue,
    setEditingNameValue,
    toggleGroupExpand,
    startEditingGroupName,
    cancelEditingGroupName,
    saveGroupName,
    toggleGroupEnabled,
    removeGroup,
    toggleEngineInGroup,
  } = props;

  const groupEngines = group.engineIds
    .map((id) => enginesById.get(id))
    .filter((engine): engine is SearchEngine => engine !== undefined);

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
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
              <strong className="search-engine-name">{group.name}</strong>
              <code className="search-engine-url">
                {groupEngines.map((engine) => engine.name).join(", ")}
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
            onClick={(event) => {
              event.stopPropagation();
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
                <span className="group-engine-name">{engine.name}</span>
                <Switch.Root
                  aria-label={`${group.name}に${engine.name}を含める`}
                  checked={isInGroup}
                  className="mbu-switch"
                  data-testid={`group-engine-${group.id}-${engine.id}`}
                  onCheckedChange={(checked) => {
                    toggleEngineInGroup(group.id, engine.id, checked).catch(
                      () => {
                        // no-op
                      }
                    );
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
}
