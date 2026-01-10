import { Result } from "@praha/byethrow";
import { useEffect, useMemo, useState } from "react";
import {
  type ContextAction,
  DEFAULT_CONTEXT_ACTIONS,
  normalizeContextActions,
} from "@/context_actions";
import type { PaneId } from "@/popup/panes";
import { ActionButtons } from "@/popup/panes/actions/ActionButtons";
import { ActionEditorPanel } from "@/popup/panes/actions/ActionEditorPanel";
import { ActionOutputPanel } from "@/popup/panes/actions/ActionOutputPanel";
import { ActionTargetAccordion } from "@/popup/panes/actions/ActionTargetAccordion";
import { useActionEditor } from "@/popup/panes/actions/useActionEditor";
import { useActionRunner } from "@/popup/panes/actions/useActionRunner";
import type { PopupRuntime } from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";
import { coerceSummarySourceLabel } from "@/popup/utils/summary_source_label";
import type { Notifier } from "@/ui/toast";

export type ActionsPaneProps = {
  runtime: PopupRuntime;
  notify: Notifier;
  navigateToPane: (paneId: PaneId) => void;
  focusTokenInput: () => void;
};

export function ActionsPane(props: ActionsPaneProps): React.JSX.Element {
  const [actions, setActions] = useState<ContextAction[]>([]);

  const actionsById = useMemo(
    () => new Map(actions.map((action) => [action.id, action])),
    [actions]
  );

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

  const persistActionsUpdate = async (
    nextActions: ContextAction[],
    successMessage: string,
    failureMessage: string
  ): Promise<void> => {
    const previous = actions;
    await persistWithRollback({
      applyNext: () => {
        setActions(nextActions);
        resetEditorState();
      },
      rollback: () => {
        setActions(previous);
      },
      persist: () =>
        props.runtime.storageSyncSet({
          contextActions: nextActions,
        }),
      onSuccess: () => {
        props.notify.success(successMessage);
      },
      onFailure: () => {
        props.notify.error(failureMessage);
      },
    });
  };

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

  useEffect(() => {
    let cancelled = false;
    const setActionsSafe = (next: ContextAction[]): void => {
      if (!cancelled) {
        setActions(next);
      }
    };

    (async () => {
      const data = await props.runtime.storageSyncGet(["contextActions"]);
      if (Result.isSuccess(data)) {
        const normalized = normalizeContextActions(data.value.contextActions);
        if (normalized.length > 0) {
          setActionsSafe(normalized);
          return;
        }
      }

      setActionsSafe(DEFAULT_CONTEXT_ACTIONS);
      await props.runtime
        .storageSyncSet({
          contextActions: DEFAULT_CONTEXT_ACTIONS,
        })
        .catch(() => {
          // no-op
        });
    })().catch(() => {
      // no-op
    });
    return () => {
      cancelled = true;
    };
  }, [props.runtime]);

  const resetActions = async (): Promise<void> => {
    await persistActionsUpdate(
      DEFAULT_CONTEXT_ACTIONS,
      "リセットしました",
      "リセットに失敗しました"
    );
  };

  return (
    <div className="card card-stack">
      <div className="row-between">
        <h2 className="pane-title">Context Actions</h2>
        <span className="chip chip-soft" data-testid="action-source">
          {output.status === "ready" ? output.sourceLabel : "-"}
        </span>
      </div>

      <p className="hint" data-testid="template-vars">
        テンプレ変数: <code>{"{{text}}"}</code> <code>{"{{title}}"}</code>{" "}
        <code>{"{{url}}"}</code> <code>{"{{source}}"}</code>
      </p>

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
    </div>
  );
}
