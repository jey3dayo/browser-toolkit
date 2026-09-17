import { useCallback } from "react";
import { SortableList } from "@/components/SortableList";
import { EmptyMessage } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { SearchGroupItem } from "@/popup/panes/SearchGroupItem";
import type { SearchGroupsState } from "@/popup/panes/useSearchGroupsState";
import type { SearchEngineGroup } from "@/search_engine_groups";

export type SearchGroupsListProps = Pick<
  SearchGroupsState,
  | "groups"
  | "engines"
  | "enginesById"
  | "expandedGroupId"
  | "editingNameGroupId"
  | "editingNameValue"
  | "setEditingNameValue"
  | "toggleGroupExpand"
  | "startEditingGroupName"
  | "cancelEditingGroupName"
  | "saveGroupName"
  | "toggleGroupEnabled"
  | "removeGroup"
  | "toggleEngineInGroup"
  | "handleReorder"
>;

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

  const handleSortableReorder = useCallback(
    (reordered: SearchEngineGroup[]) => {
      handleReorder(reordered).catch(() => {
        // no-op
      });
    },
    [handleReorder]
  );

  if (groups.length === 0) {
    return <EmptyMessage>{t("searchGroups.empty")}</EmptyMessage>;
  }

  return (
    <SortableList items={groups} onReorder={handleSortableReorder}>
      {(group) => (
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
    </SortableList>
  );
}
