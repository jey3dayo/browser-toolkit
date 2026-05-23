import { useRef } from "react";
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
    runtime: props.runtime,
    notify: props.notify,
    onEditorReset: () => {
      resetEditorStateRef.current();
    },
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
    runtime: props.runtime,
    notify: props.notify,
    navigateToPane: props.navigateToPane,
    focusTokenInput: props.focusTokenInput,
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
    setActions,
    persistActionsUpdate,
    runtime: props.runtime,
    notify: props.notify,
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

  return (
    <PaneCard>
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

      <ActionButtons
        actions={actions}
        onRun={(actionId) => {
          runAction(actionId).catch(() => {
            // no-op
          });
        }}
      />

      {target ? (
        <ActionTargetAccordion
          sourceLabel={targetSourceLabel}
          target={target}
        />
      ) : null}

      <ActionOutputPanel
        canCopy={canCopyOutput}
        onCopy={() => {
          copyOutput().catch(() => {
            // no-op
          });
        }}
        title={outputTitle}
        value={outputValue}
      />

      <ActionEditorPanel
        actions={actions}
        editorId={editorId}
        editorKind={editorKind}
        editorPrompt={editorPrompt}
        editorTitle={editorTitle}
        onChangeKind={(next) => {
          setEditorKind(next);
        }}
        onChangePrompt={(next) => {
          setEditorPrompt(next);
        }}
        onChangeTitle={(next) => {
          setEditorTitle(next);
        }}
        onClear={() => {
          selectActionForEdit("");
        }}
        onDelete={() => {
          deleteEditor().catch(() => {
            // no-op
          });
        }}
        onReset={() => {
          resetActions().catch(() => {
            // no-op
          });
        }}
        onSave={() => {
          saveEditor().catch(() => {
            // no-op
          });
        }}
        onSelectActionId={(nextId) => {
          selectActionForEdit(nextId);
        }}
      />

      <EditorPanel>
        <EditorTitle>{t("actions.reorder.title")}</EditorTitle>
        <Hint as="div">{t("actions.reorder.description")}</Hint>
        {actions.length > 0 ? (
          <SortableList
            items={actions}
            onReorder={(reordered) => {
              handleReorder(reordered).catch(() => {
                // no-op
              });
            }}
          >
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
