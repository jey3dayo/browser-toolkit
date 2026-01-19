import { Button } from "@base-ui/react/button";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { Switch } from "@base-ui/react/switch";
import { Result } from "@praha/byethrow";
import { useEffect, useState } from "react";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { persistWithRollback } from "@/popup/utils/persist";
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
  ): Promise<Result.Result<void, string>> => {
    return await props.runtime.storageSyncSet({
      textTemplates: nextTemplates,
    });
  };

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
        props.notify.error("保存に失敗しました");
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

  const saveEdit = async (): Promise<void> => {
    const title = titleInput.trim();
    const content = contentInput.trim();

    if (!title) {
      props.notify.error("タイトルを入力してください");
      return;
    }

    if (!content) {
      props.notify.error("内容を入力してください");
      return;
    }

    let next: TextTemplate[];

    if (editingId === "new") {
      // 新規追加
      const id = generateTemplateId(title);
      if (templates.some((t) => t.id === id)) {
        props.notify.error("既に同じタイトルのテンプレートが存在します");
        return;
      }

      const newTemplate: TextTemplate = {
        id,
        title,
        content,
        hidden: false,
      };
      next = [...templates, newTemplate];
    } else {
      // 編集
      next = templates.map((template) =>
        template.id === editingId ? { ...template, title, content } : template
      );
    }

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
        props.notify.success(
          editingId === "new" ? "追加しました" : "更新しました"
        );
      },
      onFailure: () => {
        props.notify.error("保存に失敗しました");
      },
    });
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
        props.notify.success("削除しました");
      },
      onFailure: () => {
        props.notify.error("削除に失敗しました");
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
        props.notify.success("デフォルトに戻しました");
      },
      onFailure: () => {
        props.notify.error("リセットに失敗しました");
      },
    });
  };

  return (
    <div className="card card-stack">
      <div className="row-between">
        <h2 className="pane-title">テキストテンプレート</h2>
        <Button
          className="btn btn-ghost btn-small"
          data-testid="reset-templates"
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
        <div className="hint">
          右クリックメニューから定型文を貼り付けられます。
        </div>
        <div className="hint">
          非表示にしたテンプレートはメニューに表示されません。
        </div>

        {editingId ? (
          <Form
            className="stack"
            onFormSubmit={() => {
              saveEdit().catch(() => {
                // no-op
              });
            }}
          >
            <Input
              className="pattern-input"
              data-testid="template-title-input"
              onValueChange={setTitleInput}
              placeholder="タイトル（例: LGTM）"
              type="text"
              value={titleInput}
            />
            <textarea
              className="pattern-input template-content-input"
              data-testid="template-content-input"
              onChange={(e) => setContentInput(e.target.value)}
              placeholder="内容（例: LGTM :+1:）"
              rows={4}
              value={contentInput}
            />
            <div className="row-between">
              <Button
                className="btn btn-ghost btn-small"
                data-testid="save-template"
                onClick={() => {
                  saveEdit().catch(() => {
                    // no-op
                  });
                }}
                type="button"
              >
                保存
              </Button>
              <Button
                className="btn btn-ghost btn-small"
                data-testid="cancel-edit"
                onClick={cancelEdit}
                type="button"
              >
                キャンセル
              </Button>
            </div>
          </Form>
        ) : (
          <Button
            className="btn btn-ghost btn-small"
            data-testid="add-template"
            onClick={startNew}
            type="button"
          >
            新規追加
          </Button>
        )}

        {templates.length > 0 ? (
          <ul aria-label="登録済みテンプレート" className="search-engines-list">
            {templates.map((template) => (
              <li className="search-engine-item" key={template.id}>
                <div className="search-engine-content">
                  <strong className="search-engine-name">
                    {template.title}
                  </strong>
                  <code className="search-engine-url">{template.content}</code>
                </div>
                <div className="search-engine-controls">
                  <Switch.Root
                    aria-label={`${template.title}を表示`}
                    checked={!template.hidden}
                    className="mbu-switch"
                    data-testid={`template-visible-${template.id}`}
                    onCheckedChange={(checked) => {
                      toggleTemplateHidden(template.id, !checked).catch(() => {
                        // no-op
                      });
                    }}
                  >
                    <Switch.Thumb className="mbu-switch-thumb" />
                  </Switch.Root>
                  <Button
                    className="btn-edit"
                    data-testid={`edit-template-${template.id}`}
                    onClick={() => {
                      startEdit(template);
                    }}
                    type="button"
                  >
                    編集
                  </Button>
                  <Button
                    className="btn-delete"
                    data-testid={`remove-template-${template.id}`}
                    onClick={() => {
                      removeTemplate(template.id).catch(() => {
                        // no-op
                      });
                    }}
                    type="button"
                  >
                    削除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-message">テンプレートが登録されていません</p>
        )}
      </div>
    </div>
  );
}
