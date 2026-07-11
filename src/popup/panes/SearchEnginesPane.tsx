import { SortableList } from "@/components/SortableList";
import { Button } from "@/components/shared/Button";
import { PaneCard, RowBetween, Stack } from "@/components/shared/Layout";
import { EmptyMessage, Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { SearchEngineAddForm } from "@/popup/panes/search-engines/SearchEngineAddForm";
import { SearchEngineListItem } from "@/popup/panes/search-engines/SearchEngineListItem";
import { useSearchEnginesController } from "@/popup/panes/search-engines/useSearchEnginesController";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

export type SearchEnginesPaneProps = PopupPaneBaseProps;

export function SearchEnginesPane(
  props: SearchEnginesPaneProps
): React.JSX.Element {
  const controller = useSearchEnginesController(props);

  return (
    <PaneCard>
      <RowBetween>
        <PaneTitle>{t("searchEngines.title")}</PaneTitle>
        <Button
          data-testid="reset-search-engines"
          onClick={() => {
            controller.resetToDefaults().catch(() => {
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

      <Stack>
        <Hint as="div">{t("searchEngines.description")}</Hint>
        <Hint as="div">
          {t("searchEngines.urlTemplateHint", { query: "{query}" })}
        </Hint>

        <SearchEngineAddForm
          encodingInput={controller.encodingInput}
          nameInput={controller.nameInput}
          onAddEngine={controller.addEngine}
          onEncodingInputChange={controller.setEncodingInput}
          onNameInputChange={controller.setNameInput}
          onUrlInputChange={controller.setUrlInput}
          urlInput={controller.urlInput}
        />

        {controller.engines.length > 0 ? (
          <SortableList
            items={controller.engines}
            onReorder={(reordered) => {
              controller.handleReorder(reordered).catch(() => {
                // no-op
              });
            }}
          >
            {(engine) => (
              <SearchEngineListItem
                engine={engine}
                onRemove={controller.removeEngine}
                onToggleEnabled={controller.toggleEngineEnabled}
              />
            )}
          </SortableList>
        ) : (
          <EmptyMessage>{t("searchEngines.empty")}</EmptyMessage>
        )}
      </Stack>
    </PaneCard>
  );
}
