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
import { runWithSharedLock } from "@/utils/async";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

const TEMPLATE_MUTATION_MAX_ATTEMPTS = 5;

type PreparedTemplateMutation = {
  next: TextTemplate[];
  applyNext: () => void;
  onSuccess?: () => void;
  onFailure: () => void;
};

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

  // 保存は同一 origin の各インスタンス（popup / options）間で共有される lock で
  // 直列化する（Web Locks、テスト環境では realm 内共有 queue）。lock 内の
  // read-latest → write → re-read verify が自分の書き込みと一致しない
  // (別 popup が先んじた / 先に割り込んだ) 場合は最新 base でやり直す。
  // persist 失敗時は既存の rollback / notify を維持し、再試行しない。
  const verifyTemplatesPersisted = async (
    next: TextTemplate[]
  ): Promise<boolean> => {
    const stored = await readLatestTemplates();
    if (!stored) {
      return true;
    }
    return JSON.stringify(stored) === JSON.stringify(next);
  };

  const runTemplateMutationAttempts = async (
    prepare: (base: TextTemplate[]) => PreparedTemplateMutation | null
  ): Promise<void> => {
    let attempt = 0;
    while (attempt < TEMPLATE_MUTATION_MAX_ATTEMPTS) {
      attempt += 1;
      // biome-ignore lint/performance/noAwaitInLoops: intentional serial optimistic-concurrency retries
      const latest = await readLatestTemplates();
      const base = latest ?? templates;
      const mutation = prepare(base);
      if (!mutation) {
        return;
      }
      const saved = await persistWithRollback({
        applyNext: mutation.applyNext,
        onFailure: mutation.onFailure,
        persist: () => saveTemplates(mutation.next),
        rollback: () => {
          setTemplates(templates);
        },
      });
      if (!saved) {
        return;
      }
      if (await verifyTemplatesPersisted(mutation.next)) {
        mutation.onSuccess?.();
        return;
      }
    }
  };

  const runTemplateMutation = (
    prepare: (base: TextTemplate[]) => PreparedTemplateMutation | null
  ): Promise<void> =>
    runWithSharedLock("textTemplates", () =>
      runTemplateMutationAttempts(prepare)
    );

  const toggleTemplateHidden = (templateId: string, hidden: boolean) =>
    runTemplateMutation((base) => {
      const next = base.map((template) =>
        template.id === templateId ? { ...template, hidden } : template
      );
      return {
        applyNext: () => {
          setTemplates(next);
        },
        next,
        onFailure: () => {
          notify.error(t("templatesPane.errors.saveFailed"));
        },
      };
    });

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

  const saveEdit = (): Promise<void> => {
    const input = parseTemplateInput();
    if (!input) {
      return Promise.resolve();
    }

    return runTemplateMutation((base) => {
      const nextResult = buildNextTemplates(input, base);
      if (Result.isFailure(nextResult)) {
        notify.error(nextResult.error);
        return null;
      }
      const { next } = nextResult.value;
      return {
        applyNext: () => {
          setTemplates(next);
          cancelEdit();
        },
        next,
        onFailure: () => {
          notify.error(t("templatesPane.errors.saveFailed"));
        },
        onSuccess: () => {
          notify.success(nextResult.value.successMessage);
        },
      };
    });
  };

  const removeTemplate = (templateId: string) =>
    runTemplateMutation((base) => {
      const next = base.filter((template) => template.id !== templateId);
      return {
        applyNext: () => {
          setTemplates(next);
          if (editingId === templateId) {
            cancelEdit();
          }
        },
        next,
        onFailure: () => {
          notify.error(t("templatesPane.errors.deleteFailed"));
        },
        onSuccess: () => {
          notify.success(t("templatesPane.success.deleted"));
        },
      };
    });

  const resetToDefaults = () =>
    runTemplateMutation(() => ({
      applyNext: () => {
        setTemplates(DEFAULT_TEXT_TEMPLATES);
        cancelEdit();
      },
      next: DEFAULT_TEXT_TEMPLATES,
      onFailure: () => {
        notify.error(t("templatesPane.errors.resetFailed"));
      },
      onSuccess: () => {
        notify.success(t("templatesPane.success.reset"));
      },
    }));

  // 並び替えは drag handler が渡した全オブジェクトではなく、直近の storage の
  // レコードを要求された ID 順に並べて保存する。別インスタンスの直後の
  // hidden / 本文編集が並び替え write で戻されないようにするため。
  const handleReorder = (reorderedTemplates: TextTemplate[]) =>
    runTemplateMutation((base) => {
      const byId = new Map(base.map((template) => [template.id, template]));
      const consumed = new Set<string>();
      const next: TextTemplate[] = [];
      for (const template of reorderedTemplates) {
        if (consumed.has(template.id)) {
          continue;
        }
        const latest = byId.get(template.id);
        if (!latest) {
          continue;
        }
        consumed.add(template.id);
        next.push(latest);
      }
      for (const template of base) {
        if (!consumed.has(template.id)) {
          next.push(template);
        }
      }
      return {
        applyNext: () => {
          setTemplates(next);
        },
        next,
        onFailure: () => {
          notify.error(t("templatesPane.errors.reorderFailed"));
        },
        onSuccess: () => {
          notify.success(t("templatesPane.success.reordered"));
        },
      };
    });

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
