import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await runtime.storageSyncGet(["textTemplates"]);
      if (cancelled) {
        return;
      }

      if (Result.isFailure(data)) {
        setTemplates(DEFAULT_TEXT_TEMPLATES);
        return;
      }

      const existing = data.value.textTemplates || [];
      const templatesResult =
        existing.length > 0 ? existing : DEFAULT_TEXT_TEMPLATES;
      setTemplates(templatesResult);
    })().catch((error) => {
      debugLog(
        "TemplatesPane.useEffect[props.runtime]",
        "failed",
        { error: formatErrorLog("", {}, error) },
        "error"
      ).catch(() => {
        // no-op
      });
    });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

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
    const next = templates.map((template) =>
      template.id === templateId ? { ...template, hidden } : template
    );
    await persistWithRollback({
      applyNext: () => {
        setTemplates(next);
      },
      rollback: () => {
        setTemplates(templates);
      },
      persist: () => saveTemplates(next),
      onFailure: () => {
        notify.error(t("templatesPane.errors.saveFailed"));
      },
    });
  };

  const startEdit = (template: TextTemplate): void => {
    setEditingId(template.id);
    setTitleInput(template.title);
    setContentInput(template.content);
  };

  const startNew = (): void => {
    setEditingId("new");
    setTitleInput("");
    setContentInput("");
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setTitleInput("");
    setContentInput("");
  };

  const parseTemplateInput = (): { title: string; content: string } | null => {
    const title = requireTrimmedString({
      value: titleInput,
      emptyMessage: t("templatesPane.errors.titleRequired"),
      notify,
    });
    if (!title) {
      return null;
    }
    const content = requireTrimmedString({
      value: contentInput,
      emptyMessage: t("templatesPane.errors.contentRequired"),
      notify,
    });
    if (!content) {
      return null;
    }
    return { title, content };
  };

  const buildNextTemplates = (params2: {
    title: string;
    content: string;
  }): Result.Result<
    { next: TextTemplate[]; successMessage: string },
    string
  > => {
    if (!editingId) {
      return Result.fail(t("templatesPane.errors.targetNotFound"));
    }

    if (editingId === "new") {
      const id = generateTemplateId(params2.title);
      if (templates.some((template) => template.id === id)) {
        return Result.fail(t("templatesPane.errors.duplicateTitle"));
      }
      const newTemplate: TextTemplate = {
        id,
        title: params2.title,
        content: params2.content,
        hidden: false,
      };
      return Result.succeed({
        next: [...templates, newTemplate],
        successMessage: t("templatesPane.success.added"),
      });
    }

    return Result.succeed({
      next: templates.map((template) =>
        template.id === editingId
          ? { ...template, title: params2.title, content: params2.content }
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
      rollback: () => {
        setTemplates(templates);
      },
      persist: () => saveTemplates(next),
      onSuccess: () => {
        notify.success(successMessage);
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.saveFailed"));
      },
    });
  };

  const saveEdit = async (): Promise<void> => {
    const input = parseTemplateInput();
    if (!input) {
      return;
    }

    const nextResult = buildNextTemplates(input);
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
    const next = templates.filter((template) => template.id !== templateId);
    await persistWithRollback({
      applyNext: () => {
        setTemplates(next);
        if (editingId === templateId) {
          cancelEdit();
        }
      },
      rollback: () => {
        setTemplates(templates);
      },
      persist: () => saveTemplates(next),
      onSuccess: () => {
        notify.success(t("templatesPane.success.deleted"));
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.deleteFailed"));
      },
    });
  };

  const resetToDefaults = async (): Promise<void> => {
    await persistWithRollback({
      applyNext: () => {
        setTemplates(DEFAULT_TEXT_TEMPLATES);
        cancelEdit();
      },
      rollback: () => {
        setTemplates(templates);
      },
      persist: () => saveTemplates(DEFAULT_TEXT_TEMPLATES),
      onSuccess: () => {
        notify.success(t("templatesPane.success.reset"));
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.resetFailed"));
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
      rollback: () => {
        setTemplates(templates);
      },
      persist: () => saveTemplates(reorderedTemplates),
      onSuccess: () => {
        notify.success(t("templatesPane.success.reordered"));
      },
      onFailure: () => {
        notify.error(t("templatesPane.errors.reorderFailed"));
      },
    });
  };

  return {
    templates,
    editingId,
    titleInput,
    contentInput,
    setTitleInput,
    setContentInput,
    toggleTemplateHidden,
    startEdit,
    startNew,
    cancelEdit,
    saveEdit,
    removeTemplate,
    resetToDefaults,
    handleReorder,
  };
}
