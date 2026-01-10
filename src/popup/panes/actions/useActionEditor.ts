import { Result } from "@praha/byethrow";
import { useCallback, useEffect, useState } from "react";
import type { ContextAction, ContextActionKind } from "@/context_actions";
import type { PopupRuntime } from "@/popup/runtime";
import type { Notifier } from "@/ui/toast";

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
  const [editorId, setEditorId] = useState<string>("");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorKind, setEditorKind] = useState<ContextActionKind>("text");
  const [editorPrompt, setEditorPrompt] = useState("");

  const resetEditorState = useCallback((): void => {
    setEditorId("");
    setEditorTitle("");
    setEditorKind("text");
    setEditorPrompt("");
  }, []);

  useEffect(() => {
    if (!editorId) {
      return;
    }
    if (params.actions.some((action) => action.id === editorId)) {
      return;
    }
    resetEditorState();
  }, [params.actions, editorId, resetEditorState]);

  const selectActionForEdit = (nextId: string): void => {
    setEditorId(nextId);
    if (!nextId) {
      setEditorTitle("");
      setEditorKind("text");
      setEditorPrompt("");
      return;
    }
    const action = params.actionsById.get(nextId);
    if (!action) {
      return;
    }
    setEditorTitle(action.title);
    setEditorKind(action.kind);
    setEditorPrompt(action.prompt);
  };

  const createActionId = (): string => {
    const uuid =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `custom:${uuid}`;
  };

  const saveEditor = async (): Promise<void> => {
    const title = editorTitle.trim();
    if (!title) {
      params.notify.error("タイトルを入力してください");
      return;
    }

    const prompt = editorPrompt;
    if (editorKind === "text" && !prompt.trim()) {
      params.notify.error("プロンプトを入力してください");
      return;
    }

    const nextId = editorId || createActionId();
    const next: ContextAction = { id: nextId, title, kind: editorKind, prompt };

    const previous = params.actions;
    const nextActions = editorId
      ? params.actions.map((action) => (action.id === editorId ? next : action))
      : [...params.actions, next];

    params.setActions(nextActions);
    setEditorId(nextId);

    const saved = await params.runtime.storageSyncSet({
      contextActions: nextActions,
    });
    if (Result.isSuccess(saved)) {
      params.notify.success("保存しました");
      return;
    }
    params.setActions(previous);
    params.notify.error("保存に失敗しました");
  };

  const deleteEditor = async (): Promise<void> => {
    if (!editorId) {
      return;
    }

    const nextActions = params.actions.filter(
      (action) => action.id !== editorId
    );
    await params.persistActionsUpdate(
      nextActions,
      "削除しました",
      "削除に失敗しました"
    );
  };

  return {
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
  };
}
