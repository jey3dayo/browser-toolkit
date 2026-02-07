import { SortableList } from "@/components/SortableList";
import { SearchGroupItem } from "@/popup/panes/SearchGroupItem";
import type { SearchEngineGroup } from "@/search_engine_groups";
import type { SearchEngine } from "@/search_engine_types";

export type SearchGroupsListProps = {
  groups: SearchEngineGroup[];
  engines: SearchEngine[];
  enginesById: Map<string, SearchEngine>;
  expandedGroupId: string | null;
  editingNameGroupId: string | null;
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
  handleReorder: (reorderedGroups: SearchEngineGroup[]) => Promise<void>;
};

export function SearchGroupsList(
  props: SearchGroupsListProps
): React.JSX.Element {
  const {
    groups,
    engines,
    enginesById,
    expandedGroupId,
    editingNameGroupId,
    editingNameValue,
    setEditingNameValue,
    toggleGroupExpand,
    startEditingGroupName,
    cancelEditingGroupName,
    saveGroupName,
    toggleGroupEnabled,
    removeGroup,
    toggleEngineInGroup,
    handleReorder,
  } = props;

  if (groups.length === 0) {
    return <p className="empty-message">グループが登録されていません</p>;
  }

  return (
    <SortableList
      items={groups}
      onReorder={(reordered) => {
        handleReorder(reordered).catch(() => {
          // no-op
        });
      }}
      renderItem={(group) => (
        <SearchGroupItem
          cancelEditingGroupName={cancelEditingGroupName}
          editingNameValue={editingNameValue}
          engines={engines}
          enginesById={enginesById}
          group={group}
          isEditingName={editingNameGroupId === group.id}
          isExpanded={expandedGroupId === group.id}
          removeGroup={removeGroup}
          saveGroupName={saveGroupName}
          setEditingNameValue={setEditingNameValue}
          startEditingGroupName={startEditingGroupName}
          toggleEngineInGroup={toggleEngineInGroup}
          toggleGroupEnabled={toggleGroupEnabled}
          toggleGroupExpand={toggleGroupExpand}
        />
      )}
    />
  );
}
