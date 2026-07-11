import { useCallback, useState } from "react";
import type { ContextAction, ContextActionKind } from "@/context_actions";
import { t } from "@/i18n";
import type { PopupRuntime } from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";
import { requireTrimmedString } from "@/popup/utils/required-input";
import type { Notifier } from "@/ui/toast";

type EditorState = {
  id: string;
  title: string;
  kind: ContextActionKind;
  prompt: string;
};

const EMPTY_EDITOR_STATE: EditorState = {
  id: "",
  title: "",
  kind: "text",
  prompt: "",
} satisfies EditorState;

function createActionId(): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `custom:${uuid}`;
}

export function useActionEditor(params: {
  actions: ContextAction[];
  actionsById: Map<string, ContextAction>;
  setActions: (actions: ContextAction[]) => void;
  persistActionsUpdate: (
    nextActions: ContextAction[],
    successMessage: string,
    failureMessage: string
  ) => Promise<void>;
  runtime: PopupRuntime;
  notify: Notifier;
}): {
  editorId: string;
  editorTitle: string;
  editorKind: ContextActionKind;
  editorPrompt: string;
  setEditorTitle: (title: string) => void;
  setEditorKind: (kind: ContextActionKind) => void;
  setEditorPrompt: (prompt: string) => void;
  selectActionForEdit: (nextId: string) => void;
  saveEditor: () => Promise<void>;
  deleteEditor: () => Promise<void>;
  resetEditorState: () => void;
} {
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR_STATE);

  const resetEditorState = useCallback((): void => {
    setEditor(EMPTY_EDITOR_STATE);
  }, []);

  const selectActionForEdit = (nextId: string): void => {
    if (!nextId) {
      resetEditorState();
      return;
    }
    const action = params.actionsById.get(nextId);
    if (!action) {
      return;
    }
    setEditor({
      id: action.id,
      title: action.title,
      kind: action.kind,
      prompt: action.prompt,
    });
  };

  const saveEditor = async (): Promise<void> => {
    const title = requireTrimmedString({
      value: editor.title,
      emptyMessage: t("actions.errors.titleRequired"),
      notify: params.notify,
    });
    if (!title) {
      return;
    }

    const prompt = editor.prompt;
    if (editor.kind === "text") {
      const hasPrompt = requireTrimmedString({
        value: prompt,
        emptyMessage: t("actions.errors.promptRequired"),
        notify: params.notify,
      });
      if (!hasPrompt) {
        return;
      }
    }

    const nextId = editor.id || createActionId();
    const next: ContextAction = {
      id: nextId,
      title,
      kind: editor.kind,
      prompt,
    };

    const previous = params.actions;
    const nextActions = editor.id
      ? params.actions.map((action) =>
          action.id === editor.id ? next : action
        )
      : [...params.actions, next];

    await persistWithRollback({
      applyNext: () => {
        params.setActions(nextActions);
        setEditor((current) => ({ ...current, id: nextId }));
      },
      rollback: () => {
        params.setActions(previous);
      },
      persist: () =>
        params.runtime.storageSyncSet({
          contextActions: nextActions,
        }),
      onSuccess: () => {
        params.notify.success(t("actions.success.saved"));
      },
      onFailure: () => {
        params.notify.error(t("actions.errors.saveFailed"));
      },
    });
  };

  const deleteEditor = async (): Promise<void> => {
    if (!editor.id) {
      return;
    }

    const nextActions = params.actions.filter(
      (action) => action.id !== editor.id
    );
    await params.persistActionsUpdate(
      nextActions,
      t("actions.success.deleted"),
      t("actions.errors.deleteFailed")
    );
  };

  return {
    editorId: editor.id,
    editorTitle: editor.title,
    editorKind: editor.kind,
    editorPrompt: editor.prompt,
    setEditorTitle: (title) => {
      setEditor((current) => ({ ...current, title }));
    },
    setEditorKind: (kind) => {
      setEditor((current) => ({ ...current, kind }));
    },
    setEditorPrompt: (prompt) => {
      setEditor((current) => ({ ...current, prompt }));
    },
    selectActionForEdit,
    saveEditor,
    deleteEditor,
    resetEditorState,
  };
}
