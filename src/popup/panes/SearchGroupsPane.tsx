import { Button } from "@base-ui/react/button";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
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
      </div>
    </div>
  );
}
