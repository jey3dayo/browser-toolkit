import { Button } from "@/components/shared/Button";
import { PaneCard, RowBetween, Stack } from "@/components/shared/Layout";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { TemplateEditForm } from "@/popup/panes/templates/TemplateEditForm";
import { TemplateList } from "@/popup/panes/templates/TemplateList";
import { useTemplatesState } from "@/popup/panes/templates/useTemplatesState";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

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
  } = useTemplatesState({ runtime: props.runtime, notify: props.notify });

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
          <TemplateEditForm
            contentInput={contentInput}
            onCancel={cancelEdit}
            onContentInputChange={setContentInput}
            onSave={() => {
              saveEdit().catch(() => {
                // no-op
              });
            }}
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
          onRemove={(templateId) => {
            removeTemplate(templateId).catch(() => {
              // no-op
            });
          }}
          onReorder={(reordered) => {
            handleReorder(reordered).catch(() => {
              // no-op
            });
          }}
          onToggleHidden={(templateId, hidden) => {
            toggleTemplateHidden(templateId, hidden).catch(() => {
              // no-op
            });
          }}
          templates={templates}
        />
      </section>
    </PaneCard>
  );
}
