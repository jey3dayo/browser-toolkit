import { Button } from "@/components/shared/Button";
import { PaneCard, RowBetween, Stack } from "@/components/shared/Layout";
import { PatternAddForm } from "@/components/shared/PatternAddForm";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { SearchGroupsList } from "@/popup/panes/SearchGroupsList";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { useSearchGroupsState } from "@/popup/panes/useSearchGroupsState";

export type SearchGroupsPaneProps = PopupPaneBaseProps;

export function SearchGroupsPane(
  props: SearchGroupsPaneProps
): React.JSX.Element {
  const {
    groups,
    engines,
    enginesById,
    expandedGroupId,
    editingNameGroupId,
    editingNameValue,
    newGroupNameInput,
    setEditingNameValue,
    setNewGroupNameInput,
    toggleGroupExpand,
    startEditingGroupName,
    cancelEditingGroupName,
    saveGroupName,
    toggleGroupEnabled,
    toggleEngineInGroup,
    addNewGroup,
    removeGroup,
    resetToDefaults,
    handleReorder,
  } = useSearchGroupsState(props);

  return (
    <PaneCard>
      <RowBetween>
        <PaneTitle>{t("searchGroups.title")}</PaneTitle>
        <Button
          data-testid="reset-search-groups"
          onClick={() => {
            resetToDefaults().catch(() => {
              // no-op
            });
          }}
          size="small"
          type="button"
          variant="ghost"
        >
          {t("common.resetToDefaults")}
        </Button>
      </RowBetween>

      <Stack>
        <Hint as="div">{t("searchGroups.description")}</Hint>
        <Hint as="div">{t("searchGroups.example")}</Hint>

        <PatternAddForm
          buttonTestId="add-search-group"
          disabled={engines.length === 0}
          inputTestId="new-group-name"
          onSubmit={addNewGroup}
          onValueChange={setNewGroupNameInput}
          placeholder={t("searchGroups.namePlaceholder")}
          value={newGroupNameInput}
        />

        <SearchGroupsList
          cancelEditingGroupName={cancelEditingGroupName}
          editingNameGroupId={editingNameGroupId}
          editingNameValue={editingNameValue}
          engines={engines}
          enginesById={enginesById}
          expandedGroupId={expandedGroupId}
          groups={groups}
          handleReorder={handleReorder}
          removeGroup={removeGroup}
          saveGroupName={saveGroupName}
          setEditingNameValue={setEditingNameValue}
          startEditingGroupName={startEditingGroupName}
          toggleEngineInGroup={toggleEngineInGroup}
          toggleGroupEnabled={toggleGroupEnabled}
          toggleGroupExpand={toggleGroupExpand}
        />
      </Stack>
    </PaneCard>
  );
}
