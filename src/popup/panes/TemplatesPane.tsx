import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import { SortableList } from "@/components/SortableList";
import { Button } from "@/components/shared/Button";
import { Form } from "@/components/shared/Form";
import { Input } from "@/components/shared/Input";
import { PaneCard, RowBetween, Stack } from "@/components/shared/Layout";
import { ListItemRow } from "@/components/shared/ListItemRow";
import { Switch } from "@/components/shared/Switch";
import { Textarea } from "@/components/shared/Textarea";
import { EmptyMessage, Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
import { requireTrimmedString } from "@/popup/utils/required-input";
import {
  DEFAULT_TEXT_TEMPLATES,
  generateTemplateId,
  type TextTemplate,
} from "@/text_templates";
import { debugLog } from "@/utils/debug_log";
import { formatErrorLog } from "@/utils/errors";

export type TemplatesPaneProps = PopupPaneBaseProps;

export function TemplatesPane(props: TemplatesPaneProps): React.JSX.Element {
  const [templates, setTemplates] = useState<TextTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [contentInput, setContentInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await props.runtime.storageSyncGet(["textTemplates"]);
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
  }, [props.runtime]);

  const saveTemplates = async (
    nextTemplates: TextTemplate[]
  ): Promise<Result.Result<void, string>> =>
    await props.runtime.storageSyncSet({
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
        props.notify.error(t("templatesPane.errors.saveFailed"));
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
      notify: props.notify,
    });
    if (!title) {
      return null;
    }
    const content = requireTrimmedString({
      value: contentInput,
      emptyMessage: t("templatesPane.errors.contentRequired"),
      notify: props.notify,
    });
    if (!content) {
      return null;
    }
    return { title, content };
  };

  const buildNextTemplates = (params: {
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
      const id = generateTemplateId(params.title);
      if (templates.some((t) => t.id === id)) {
        return Result.fail(t("templatesPane.errors.duplicateTitle"));
      }
      const newTemplate: TextTemplate = {
        id,
        title: params.title,
        content: params.content,
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
          ? { ...template, title: params.title, content: params.content }
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
        props.notify.success(successMessage);
      },
      onFailure: () => {
        props.notify.error(t("templatesPane.errors.saveFailed"));
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
      props.notify.error(nextResult.error);
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
        props.notify.success(t("templatesPane.success.deleted"));
      },
      onFailure: () => {
        props.notify.error(t("templatesPane.errors.deleteFailed"));
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
        props.notify.success(t("templatesPane.success.reset"));
      },
      onFailure: () => {
        props.notify.error(t("templatesPane.errors.resetFailed"));
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
        props.notify.success(t("templatesPane.success.reordered"));
      },
      onFailure: () => {
        props.notify.error(t("templatesPane.errors.reorderFailed"));
      },
    });
  };

  return (
    <PaneCard className="settings-surface templates-settings-pane">
      <section className="settings-pane-overview">
        <RowBetween className="settings-surface-heading">
          <Stack spacing="small">
            <PaneTitle>{t("templatesPane.title")}</PaneTitle>
            <Hint as="div">{t("templatesPane.description")}</Hint>
          </Stack>
          <Button
            data-testid="reset-templates"
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
      </section>

      <section className="card settings-card settings-pane-card">
        <Hint as="div">{t("templatesPane.hiddenDescription")}</Hint>

        {editingId ? (
          <Form
            onFormSubmit={() => {
              saveEdit().catch(() => {
                // no-op
              });
            }}
            variant="stack"
          >
            <Input
              data-testid="template-title-input"
              onValueChange={setTitleInput}
              placeholder={t("templatesPane.titlePlaceholder")}
              type="text"
              value={titleInput}
              variant="pattern"
            />
            <Textarea
              data-testid="template-content-input"
              onChange={(e) => setContentInput(e.target.value)}
              placeholder={t("templatesPane.contentPlaceholder")}
              rows={4}
              value={contentInput}
              variant="pattern"
            />
            <RowBetween>
              <Button
                data-testid="save-template"
                onClick={() => {
                  saveEdit().catch(() => {
                    // no-op
                  });
                }}
                size="small"
                type="button"
                variant="ghost"
              >
                {t("common.save")}
              </Button>
              <Button
                data-testid="cancel-edit"
                onClick={cancelEdit}
                size="small"
                type="button"
                variant="ghost"
              >
                {t("common.cancel")}
              </Button>
            </RowBetween>
          </Form>
        ) : (
          <RowBetween>
            <span className="settings-section-label">
              {t("templatesPane.title")}
            </span>
            <Button
              data-testid="add-template"
              onClick={startNew}
              size="small"
              type="button"
              variant="ghost"
            >
              {t("templatesPane.new")}
            </Button>
          </RowBetween>
        )}

        {templates.length > 0 ? (
          <SortableList
            items={templates}
            onReorder={(reordered) => {
              handleReorder(reordered).catch(() => {
                // no-op
              });
            }}
          >
            {(template) => (
              <ListItemRow
                actions={
                  <>
                    <Switch
                      aria-label={t("templatesPane.visibleAria", {
                        title: template.title,
                      })}
                      checked={!template.hidden}
                      data-testid={`template-visible-${template.id}`}
                      onCheckedChange={(checked) => {
                        toggleTemplateHidden(template.id, !checked).catch(
                          () => {
                            // no-op
                          }
                        );
                      }}
                    />
                    <Button
                      data-testid={`edit-template-${template.id}`}
                      onClick={() => {
                        startEdit(template);
                      }}
                      type="button"
                      variant="edit"
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      data-testid={`remove-template-${template.id}`}
                      onClick={() => {
                        removeTemplate(template.id).catch(() => {
                          // no-op
                        });
                      }}
                      type="button"
                      variant="danger"
                    >
                      {t("common.delete")}
                    </Button>
                  </>
                }
                meta={template.content}
                title={template.title}
              />
            )}
          </SortableList>
        ) : (
          <EmptyMessage>{t("templatesPane.empty")}</EmptyMessage>
        )}
      </section>
    </PaneCard>
  );
}
