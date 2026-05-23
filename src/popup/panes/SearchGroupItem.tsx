import { useMemo } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { ListItemRow, ListItemRowText } from "@/components/shared/ListItemRow";
import { Switch } from "@/components/shared/Switch";
import { t } from "@/i18n";
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

type InlineEditRowProps = {
  groupId: string;
  value: string;
  onValueChange: (value: string) => void;
  onSave: (groupId: string) => Promise<void>;
  onCancel: () => void;
};

function InlineEditRow({
  groupId,
  value,
  onValueChange,
  onSave,
  onCancel,
}: InlineEditRowProps): React.JSX.Element {
  const save = () => {
    onSave(groupId).catch(() => {
      // no-op
    });
  };

  return (
    <div className="inline-edit-row">
      <Input
        autoFocus
        className="inline-edit-input"
        data-testid="edit-group-name-input"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter") {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") {
            onCancel();
          }
        }}
        onValueChange={onValueChange}
        type="text"
        value={value}
        variant="pattern"
      />
      <Button
        data-testid="save-group-name"
        onClick={save}
        size="small"
        type="button"
        variant="ghost"
      >
        {t("searchGroups.saveName")}
      </Button>
      <Button onClick={onCancel} size="small" type="button" variant="ghost">
        {t("searchGroups.cancelName")}
      </Button>
    </div>
  );
}

type GroupEngineMembershipRowProps = {
  group: SearchEngineGroup;
  engine: SearchEngine;
  checked: boolean;
  onCheckedChange: (
    groupId: string,
    engineId: string,
    isIncluded: boolean
  ) => Promise<void>;
};

function GroupEngineMembershipRow({
  group,
  engine,
  checked,
  onCheckedChange,
}: GroupEngineMembershipRowProps): React.JSX.Element {
  return (
    <div className="group-engine-item">
      <span className="group-engine-name">{engine.name}</span>
      <Switch
        aria-label={t("searchGroups.includeEngineAria", {
          group: group.name,
          engine: engine.name,
        })}
        checked={checked}
        data-testid={`group-engine-${group.id}-${engine.id}`}
        onCheckedChange={(nextChecked) => {
          onCheckedChange(group.id, engine.id, nextChecked).catch(() => {
            // no-op
          });
        }}
      />
    </div>
  );
}

type GroupEngineMembershipListProps = {
  group: SearchEngineGroup;
  engines: SearchEngine[];
  onCheckedChange: (
    groupId: string,
    engineId: string,
    isIncluded: boolean
  ) => Promise<void>;
};

function GroupEngineMembershipList({
  group,
  engines,
  onCheckedChange,
}: GroupEngineMembershipListProps): React.JSX.Element {
  return (
    <div className="group-engines-list">
      {engines.map((engine) => (
        <GroupEngineMembershipRow
          checked={group.engineIds.includes(engine.id)}
          engine={engine}
          group={group}
          key={engine.id}
          onCheckedChange={onCheckedChange}
        />
      ))}
    </div>
  );
}

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
  const listItemActions = useMemo(
    () => (
      <>
        <Switch
          aria-label={t("searchGroups.enableAria", { name: group.name })}
          checked={group.enabled}
          data-testid={`group-enabled-${group.id}`}
          onCheckedChange={(checked) => {
            toggleGroupEnabled(group.id, checked).catch(() => {
              // no-op
            });
          }}
        />
        <Button
          data-testid={`edit-group-${group.id}`}
          onClick={(event) => {
            event.stopPropagation();
            startEditingGroupName(group);
          }}
          type="button"
          variant="edit"
        >
          <Icon aria-hidden="true" name="pencil" size={12} />
        </Button>
        <Button
          data-testid={`remove-group-${group.id}`}
          onClick={() => {
            removeGroup(group.id).catch(() => {
              // no-op
            });
          }}
          type="button"
          variant="danger"
        >
          {t("common.delete")}
        </Button>
      </>
    ),
    [group, removeGroup, startEditingGroupName, toggleGroupEnabled]
  );
  const listItemLeading = useMemo(
    () => (
      <Button
        data-testid={`expand-group-${group.id}`}
        onClick={() => {
          toggleGroupExpand(group.id);
        }}
        type="button"
        variant="expandIndicator"
      >
        <Icon
          aria-hidden="true"
          name={isExpanded ? "chevron-down" : "chevron-right"}
          size={14}
        />
      </Button>
    ),
    [group.id, isExpanded, toggleGroupExpand]
  );

  return (
    <div>
      <ListItemRow actions={listItemActions} leading={listItemLeading}>
        {isEditingName ? (
          <InlineEditRow
            groupId={group.id}
            onCancel={cancelEditingGroupName}
            onSave={saveGroupName}
            onValueChange={setEditingNameValue}
            value={editingNameValue}
          />
        ) : (
          <Button
            onClick={() => {
              toggleGroupExpand(group.id);
            }}
            type="button"
            variant="groupExpand"
          >
            <ListItemRowText
              meta={groupEngines.map((engine) => engine.name).join(", ")}
              title={group.name}
            />
          </Button>
        )}
      </ListItemRow>

      {isExpanded && (
        <GroupEngineMembershipList
          engines={engines}
          group={group}
          onCheckedChange={toggleEngineInGroup}
        />
      )}
    </div>
  );
}
