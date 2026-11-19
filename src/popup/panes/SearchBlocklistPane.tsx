import { useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { PaneCard } from "@/components/shared/Layout";
import { PatternAddForm } from "@/components/shared/PatternAddForm";
import { PatternList } from "@/components/shared/PatternListItem";
import { ScrollArea } from "@/components/shared/ScrollArea";
import { EmptyMessage, Hint } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { SearchBlocklistListItem } from "@/popup/panes/search-blocklist/SearchBlocklistListItem";
import { useSearchBlocklistRules } from "@/popup/panes/search-blocklist/useSearchBlocklistRules";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

export type SearchBlocklistPaneProps = PopupPaneBaseProps;

export function SearchBlocklistPane(
  props: SearchBlocklistPaneProps
): React.JSX.Element {
  const {
    rules,
    corrupted,
    corruptedCount,
    addError,
    patternInput,
    setPatternInput,
    addRule,
    removeRule,
    purgeCorrupted,
    editingId,
    editingValue,
    setEditingValue,
    startEditing,
    cancelEditing,
    saveEditing,
  } = useSearchBlocklistRules(props);

  const handleSubmitError = useCallback(() => {
    props.notify.error(t("common.unknownError"));
  }, [props.notify]);

  const handlePurgeCorrupted = useCallback(() => {
    purgeCorrupted().catch(() => {
      props.notify.error(t("searchBlocklist.errors.purgeFailed"));
    });
  }, [props.notify, purgeCorrupted]);

  return (
    <PaneCard className="search-blocklist-pane">
      <Hint as="div">{t("searchBlocklist.description")}</Hint>

      {corrupted ? (
        <Hint as="div" data-testid="search-blocklist-corrupted">
          {corruptedCount > 0
            ? t("searchBlocklist.errors.corruptedCount", {
                count: corruptedCount,
              })
            : t("searchBlocklist.errors.corrupted")}
          {corruptedCount > 0 ? (
            <Button
              data-testid="search-blocklist-purge-corrupted"
              onClick={handlePurgeCorrupted}
              size="small"
              type="button"
              variant="danger"
            >
              {t("searchBlocklist.purgeCorrupted")}
            </Button>
          ) : null}
        </Hint>
      ) : null}

      <PatternAddForm
        buttonTestId="search-blocklist-add"
        errorMessage={addError ?? undefined}
        errorTestId="search-blocklist-error"
        inputTestId="search-blocklist-input"
        onSubmit={addRule}
        onSubmitError={handleSubmitError}
        onValueChange={setPatternInput}
        placeholder="example.com"
        value={patternInput}
      />

      {rules.length > 0 ? (
        <ScrollArea>
          <PatternList aria-label={t("searchBlocklist.listAria")}>
            {rules.map((rule) => (
              <SearchBlocklistListItem
                editingValue={editingValue}
                isEditing={editingId === rule.id}
                key={rule.id}
                onCancelEditing={cancelEditing}
                onEditingValueChange={setEditingValue}
                onRemove={removeRule}
                onSaveEditing={saveEditing}
                onStartEditing={startEditing}
                rule={rule}
              />
            ))}
          </PatternList>
        </ScrollArea>
      ) : (
        <EmptyMessage>{t("searchBlocklist.empty")}</EmptyMessage>
      )}
    </PaneCard>
  );
}
