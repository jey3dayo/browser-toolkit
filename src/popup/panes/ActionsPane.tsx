import { useCallback, useRef } from "react";
import { SortableList } from "@/components/SortableList";
import { Badge } from "@/components/shared/Badge";
import {
  ActionListItem,
  EditorPanel,
  PaneCard,
  RowBetween,
} from "@/components/shared/Layout";
import {
  ActionTitle,
  EditorTitle,
  EmptyMessage,
  Hint,
  PaneTitle,
} from "@/components/shared/Typography";
import type { ContextAction } from "@/context_actions";
import { t } from "@/i18n";
import type { PaneId } from "@/popup/panes";
import { ActionButtons } from "@/popup/panes/actions/ActionButtons";
import { ActionEditorPanel } from "@/popup/panes/actions/ActionEditorPanel";
import { ActionOutputPanel } from "@/popup/panes/actions/ActionOutputPanel";
import { ActionTargetAccordion } from "@/popup/panes/actions/ActionTargetAccordion";
import { useActionEditor } from "@/popup/panes/actions/useActionEditor";
import { useActionRunner } from "@/popup/panes/actions/useActionRunner";
import { useActions } from "@/popup/panes/actions/useActions";
import type { PopupRuntime } from "@/popup/runtime";
import type { Notifier } from "@/ui/toast";

export type ActionsPaneProps = {
  runtime: PopupRuntime;
  notify: Notifier;
  navigateToPane: (paneId: PaneId) => void;
  focusTokenInput: () => void;
};

export function ActionsPane(props: ActionsPaneProps): React.JSX.Element {
  const resetEditorStateRef = useRef<() => void>(() => {
    // no-op
  });

  const {
    actions,
    actionsById,
    setActions,
    persistActionsUpdate,
    resetActions,
  } = useActions({
    notify: props.notify,
    onEditorReset: () => {
      resetEditorStateRef.current();
    },
    runtime: props.runtime,
  });

  const {
    output,
    target,
    runAction,
    copyOutput,
    outputTitle,
    outputValue,
    canCopyOutput,
    targetSourceLabel,
  } = useActionRunner({
    actionsById,
    focusTokenInput: props.focusTokenInput,
    navigateToPane: props.navigateToPane,
    notify: props.notify,
    runtime: props.runtime,
  });

  const {
    editorId,
    editorTitle,
    editorKind,
    editorPrompt,
    setEditorTitle,
    setEditorKind,
    setEditorPrompt,
    selectActionForEdit,
    saveEditor,
    deleteEditor,
    resetEditorState,
  } = useActionEditor({
    actions,
    actionsById,
    notify: props.notify,
    persistActionsUpdate,
    runtime: props.runtime,
    setActions,
  });
  resetEditorStateRef.current = resetEditorState;

  const handleReorder = async (
    reorderedActions: ContextAction[]
  ): Promise<void> => {
    await persistActionsUpdate(
      reorderedActions,
      t("actions.reorder.saved"),
      t("actions.reorder.saveFailed")
    );
  };

  const handleRunAction = useCallback(
    (actionId: string) => {
      runAction(actionId).catch(() => {
        // no-op
      });
    },
    [runAction]
  );

  const handleCopyOutput = useCallback(() => {
    copyOutput().catch(() => {
      // no-op
    });
  }, [copyOutput]);

  const handleChangeKind = useCallback(
    (next: Parameters<typeof setEditorKind>[0]) => {
      setEditorKind(next);
    },
    [setEditorKind]
  );

  const handleChangePrompt = useCallback(
    (next: string) => {
      setEditorPrompt(next);
    },
    [setEditorPrompt]
  );

  const handleChangeTitle = useCallback(
    (next: string) => {
      setEditorTitle(next);
    },
    [setEditorTitle]
  );

  const handleClearEditor = useCallback(() => {
    selectActionForEdit("");
  }, [selectActionForEdit]);

  const handleDeleteEditor = useCallback(() => {
    deleteEditor().catch(() => {
      // no-op
    });
  }, [deleteEditor]);

  const handleResetActions = useCallback(() => {
    resetActions().catch(() => {
      // no-op
    });
  }, [resetActions]);

  const handleSaveEditor = useCallback(() => {
    saveEditor().catch(() => {
      // no-op
    });
  }, [saveEditor]);

  const handleSelectActionId = useCallback(
    (nextId: string) => {
      selectActionForEdit(nextId);
    },
    [selectActionForEdit]
  );

  const handleReorderList = useCallback(
    (reordered: ContextAction[]) => {
      handleReorder(reordered).catch(() => {
        // no-op
      });
    },
    [handleReorder]
  );

  return (
    <PaneCard className="actions-page">
      <RowBetween>
        <PaneTitle>{t("actions.title")}</PaneTitle>
        <Badge data-testid="action-source" variant="chipSoft">
          {output.status === "ready" ? output.sourceLabel : "-"}
        </Badge>
      </RowBetween>

      <Hint data-testid="template-vars">
        {t("actions.templateVars")} <code>{"{{text}}"}</code>{" "}
        <code>{"{{title}}"}</code> <code>{"{{url}}"}</code>{" "}
        <code>{"{{source}}"}</code>
      </Hint>

      <ActionButtons actions={actions} onRun={handleRunAction} />

      {target ? (
        <ActionTargetAccordion
          sourceLabel={targetSourceLabel}
          target={target}
        />
      ) : null}

      <ActionOutputPanel
        canCopy={canCopyOutput}
        onCopy={handleCopyOutput}
        title={outputTitle}
        value={outputValue}
      />

      <ActionEditorPanel
        actions={actions}
        editorId={editorId}
        editorKind={editorKind}
        editorPrompt={editorPrompt}
        editorTitle={editorTitle}
        onChangeKind={handleChangeKind}
        onChangePrompt={handleChangePrompt}
        onChangeTitle={handleChangeTitle}
        onClear={handleClearEditor}
        onDelete={handleDeleteEditor}
        onReset={handleResetActions}
        onSave={handleSaveEditor}
        onSelectActionId={handleSelectActionId}
      />

      <EditorPanel>
        <EditorTitle>{t("actions.reorder.title")}</EditorTitle>
        <Hint as="div">{t("actions.reorder.description")}</Hint>
        {actions.length > 0 ? (
          <SortableList items={actions} onReorder={handleReorderList}>
            {(action) => (
              <ActionListItem>
                <ActionTitle>{action.title}</ActionTitle>
                <Badge variant="actionKind">
                  {action.kind === "text" && t("actions.kind.text")}
                  {action.kind === "event" && t("actions.kind.event")}
                </Badge>
              </ActionListItem>
            )}
          </SortableList>
        ) : (
          <EmptyMessage>{t("actions.reorder.empty")}</EmptyMessage>
        )}
      </EditorPanel>
    </PaneCard>
  );
}
