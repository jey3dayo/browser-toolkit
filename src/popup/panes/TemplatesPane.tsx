import { useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { PaneCard, RowBetween, Stack } from "@/components/shared/Layout";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { TemplateEditForm } from "@/popup/panes/templates/TemplateEditForm";
import { TemplateList } from "@/popup/panes/templates/TemplateList";
import { useTemplatesState } from "@/popup/panes/templates/useTemplatesState";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import type { TextTemplate } from "@/text_templates";

export type TemplatesPaneProps = PopupPaneBaseProps;

export function TemplatesPane(props: TemplatesPaneProps): React.JSX.Element {
  const {
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
  } = useTemplatesState({ notify: props.notify, runtime: props.runtime });

  const handleResetToDefaults = useCallback(() => {
    resetToDefaults().catch(() => {
      // no-op
    });
  }, [resetToDefaults]);

  const handleSaveEdit = useCallback(() => {
    saveEdit().catch(() => {
      // no-op
    });
  }, [saveEdit]);

  const handleRemoveTemplate = useCallback(
    (templateId: string) => {
      removeTemplate(templateId).catch(() => {
        // no-op
      });
    },
    [removeTemplate]
  );

  const handleReorderTemplates = useCallback(
    (reordered: TextTemplate[]) => {
      handleReorder(reordered).catch(() => {
        // no-op
      });
    },
    [handleReorder]
  );

  const handleToggleTemplateHidden = useCallback(
    (templateId: string, hidden: boolean) => {
      toggleTemplateHidden(templateId, hidden).catch(() => {
        // no-op
      });
    },
    [toggleTemplateHidden]
  );

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
            onClick={handleResetToDefaults}
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
          <TemplateEditForm
            contentInput={contentInput}
            onCancel={cancelEdit}
            onContentInputChange={setContentInput}
            onSave={handleSaveEdit}
            onTitleInputChange={setTitleInput}
            titleInput={titleInput}
          />
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

        <TemplateList
          onEdit={startEdit}
          onRemove={handleRemoveTemplate}
          onReorder={handleReorderTemplates}
          onToggleHidden={handleToggleTemplateHidden}
          templates={templates}
        />
      </section>
    </PaneCard>
  );
}
