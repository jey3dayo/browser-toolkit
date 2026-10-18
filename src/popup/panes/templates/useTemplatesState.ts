import { Result } from "@praha/byethrow";
import { useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import type { PopupRuntime } from "@/popup/runtime";
import { persistWithRollback } from "@/popup/utils/persist";
import { requireTrimmedString } from "@/popup/utils/required-input";
import {
  DEFAULT_TEXT_TEMPLATES,
  generateTemplateId,
  type TextTemplate,
} from "@/text_templates";
import type { Notifier } from "@/ui/toast";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export function useTemplatesState(params: {
  runtime: PopupRuntime;
  notify: Notifier;
}): {
  templates: TextTemplate[];
  editingId: string | null;
  titleInput: string;
  contentInput: string;
  setTitleInput: (value: string) => void;
  setContentInput: (value: string) => void;
  toggleTemplateHidden: (templateId: string, hidden: boolean) => Promise<void>;
  startEdit: (template: TextTemplate) => void;
  startNew: () => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  removeTemplate: (templateId: string) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  handleReorder: (reorderedTemplates: TextTemplate[]) => Promise<void>;
} {
  const { runtime, notify } = params;
  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [contentInput, setContentInput] = useState("");
  const editingIdRef = useRef<string | null>(null);

  const updateEditingId = (value: string | null): void => {
    editingIdRef.current = value;
    setEditingId(value);
  };

  useEffect(() => {
    let cancelled = false;

    const loadTemplates = async (): Promise<void> => {
      const data = await runtime.storageSyncGet(["textTemplates"]);
      if (cancelled) {
        return;
      }

      if (Result.isFailure(data)) {
        setTemplates(DEFAULT_TEXT_TEMPLATES);
        return;
      }

      const existing = data.value.textTemplates;
      const templatesResult = Array.isArray(existing)
        ? existing
        : DEFAULT_TEXT_TEMPLATES;
      setTemplates(templatesResult);
    };

    const reportLoadFailure = async (error: unknown): Promise<void> => {
      try {
        await debugLog(
          "TemplatesPane.useEffect[props.runtime]",
          "failed",
          { error: formatErrorLog("", {}, error) },
          "error"
        );
      } catch {
        // no-op
      }
    };

    loadTemplates().catch(reportLoadFailure);

    const onChanged =
      typeof chrome === "undefined" ? undefined : chrome.storage?.onChanged;
    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ): void => {
      if (areaName !== "sync" || !("textTemplates" in changes)) {
        return;
      }
      const next = changes.textTemplates?.newValue;
      if (editingIdRef.current !== null || !Array.isArray(next)) {
        return;
      }
      setTemplates(next);
    };
    onChanged?.addListener(handleStorageChange);

    return () => {
      cancelled = true;
      onChanged?.removeListener(handleStorageChange);
    };
  }, [runtime]);

  // 保存前に storage を再読込し、直近の配列（自分の保存結果または別タブの更新）に
  // local mutation を再適用する。複数編集画面・連打保存での lost update を止めるため。
  // 読み込み失敗時は直前のローカル state にフォールバックする。
  const readLatestTemplates = async (): Promise<TextTemplate[] | null> => {
    const data = await runtime.storageSyncGet(["textTemplates"]);
    if (Result.isFailure(data)) {
      return null;
    }
    const existing = data.value.textTemplates;
    return Array.isArray(existing) ? existing : DEFAULT_TEXT_TEMPLATES;
  };

  const saveTemplates = async (
    nextTemplates: TextTemplate[]
  ): Promise<Result.Result<void, string>> =>
    await runtime.storageSyncSet({
      textTemplates: nextTemplates,
    });

  const toggleTemplateHidden = async (
    templateId: string,
    hidden: boolean
  ): Promise<void> => {
    const latest = await readLatestTemplates();
    const base = latest ?? templates;
    const next = base.map((template) =>
      template.id === templateId ? { ...template, hidden } : template
    );
    await persistWithRollback({
      applyNext: () => {
        setTemplates(next);
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.saveFailed"));
      },
      persist: () => saveTemplates(next),
      rollback: () => {
        setTemplates(templates);
      },
    });
  };

  const startEdit = (template: TextTemplate): void => {
    updateEditingId(template.id);
    setTitleInput(template.title);
    setContentInput(template.content);
  };

  const startNew = (): void => {
    updateEditingId("new");
    setTitleInput("");
    setContentInput("");
  };

  const cancelEdit = (): void => {
    updateEditingId(null);
    setTitleInput("");
    setContentInput("");
  };

  const parseTemplateInput = (): { title: string; content: string } | null => {
    const title = requireTrimmedString({
      emptyMessage: t("templatesPane.errors.titleRequired"),
      notify,
      value: titleInput,
    });
    if (!title) {
      return null;
    }
    const content = requireTrimmedString({
      emptyMessage: t("templatesPane.errors.contentRequired"),
      notify,
      value: contentInput,
    });
    if (!content) {
      return null;
    }
    return { content, title };
  };

  const buildNextTemplates = (
    params2: {
      title: string;
      content: string;
    },
    base: TextTemplate[]
  ): Result.Result<
    { next: TextTemplate[]; successMessage: string },
    string
  > => {
    if (!editingId) {
      return Result.fail(t("templatesPane.errors.targetNotFound"));
    }

    if (editingId === "new") {
      const id = generateTemplateId(params2.title);
      if (base.some((template) => template.id === id)) {
        return Result.fail(t("templatesPane.errors.duplicateTitle"));
      }
      const newTemplate: TextTemplate = {
        content: params2.content,
        hidden: false,
        id,
        title: params2.title,
      };
      return Result.succeed({
        next: [...base, newTemplate],
        successMessage: t("templatesPane.success.added"),
      });
    }

    return Result.succeed({
      next: base.map((template) =>
        template.id === editingId
          ? { ...template, content: params2.content, title: params2.title }
          : template
      ),
      successMessage: t("templatesPane.success.updated"),
    });
  };

  const persistTemplatesUpdate = async (
    next: TextTemplate[],
    successMessage: string
  ): Promise<void> => {
    await persistWithRollback({
      applyNext: () => {
        setTemplates(next);
        cancelEdit();
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.saveFailed"));
      },
      onSuccess: () => {
        notify.success(successMessage);
      },
      persist: () => saveTemplates(next),
      rollback: () => {
        setTemplates(templates);
      },
    });
  };

  const saveEdit = async (): Promise<void> => {
    const input = parseTemplateInput();
    if (!input) {
      return;
    }

    const latest = await readLatestTemplates();
    const base = latest ?? templates;
    const nextResult = buildNextTemplates(input, base);
    if (Result.isFailure(nextResult)) {
      notify.error(nextResult.error);
      return;
    }

    await persistTemplatesUpdate(
      nextResult.value.next,
      nextResult.value.successMessage
    );
  };

  const removeTemplate = async (templateId: string): Promise<void> => {
    const latest = await readLatestTemplates();
    const base = latest ?? templates;
    const next = base.filter((template) => template.id !== templateId);
    await persistWithRollback({
      applyNext: () => {
        setTemplates(next);
        if (editingId === templateId) {
          cancelEdit();
        }
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.deleteFailed"));
      },
      onSuccess: () => {
        notify.success(t("templatesPane.success.deleted"));
      },
      persist: () => saveTemplates(next),
      rollback: () => {
        setTemplates(templates);
      },
    });
  };

  const resetToDefaults = async (): Promise<void> => {
    await persistWithRollback({
      applyNext: () => {
        setTemplates(DEFAULT_TEXT_TEMPLATES);
        cancelEdit();
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.resetFailed"));
      },
      onSuccess: () => {
        notify.success(t("templatesPane.success.reset"));
      },
      persist: () => saveTemplates(DEFAULT_TEXT_TEMPLATES),
      rollback: () => {
        setTemplates(templates);
      },
    });
  };

  const handleReorder = async (
    reorderedTemplates: TextTemplate[]
  ): Promise<void> => {
    await persistWithRollback({
      applyNext: () => {
        setTemplates(reorderedTemplates);
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.reorderFailed"));
      },
      onSuccess: () => {
        notify.success(t("templatesPane.success.reordered"));
      },
      persist: () => saveTemplates(reorderedTemplates),
      rollback: () => {
        setTemplates(templates);
      },
    });
  };

  return {
    cancelEdit,
    contentInput,
    editingId,
    handleReorder,
    removeTemplate,
    resetToDefaults,
    saveEdit,
    setContentInput,
    setTitleInput,
    startEdit,
    startNew,
    templates,
    titleInput,
    toggleTemplateHidden,
  };
}
