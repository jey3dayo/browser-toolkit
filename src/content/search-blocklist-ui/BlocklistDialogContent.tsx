import type { ChangeEvent, RefObject } from "react";
import { Icon } from "@/components/icon";
import { Accordion } from "@/components/shared/Accordion";
import { Button } from "@/components/shared/Button";
import { Fieldset } from "@/components/shared/Fieldset";
import { ButtonRow, RowBetween, Stack } from "@/components/shared/Layout";
import { Textarea } from "@/components/shared/Textarea";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { BlocklistEntry } from "@/search-blocklist/types";
import { suggestPatternFromUrl } from "./dom";

function openSearchBlocklistSettings(): void {
  chrome.runtime
    .sendMessage({ action: "openPopupPane", paneId: "pane-search-blocklist" })
    .catch(() => {
      // no-op
    });
}

export type BlocklistDialogContentProps = {
  entry: BlocklistEntry;
  engineId: string;
  rulesToAddText: string;
  onRulesToAddChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  addTextareaRef: RefObject<HTMLTextAreaElement | null>;
  primaryButtonRef: RefObject<HTMLElement | null>;
  errorMessage: string | null;
  onCancel: () => void;
  onSubmit: () => void;
};

export function BlocklistDialogContent({
  entry,
  engineId,
  rulesToAddText,
  onRulesToAddChange,
  addTextareaRef,
  primaryButtonRef,
  errorMessage,
  onCancel,
  onSubmit,
}: BlocklistDialogContentProps): React.JSX.Element {
  const hostname = suggestPatternFromUrl(entry.url);
  const rulesToRemoveText = entry.blocked
    ? (entry.matchedPatterns ?? []).join("\n")
    : t("searchBlocklist.dialog.rulesToRemoveEmpty");

  return (
    <Stack spacing="small">
      <PaneTitle>
        {entry.blocked
          ? t("searchBlocklist.dialog.titleUnblock")
          : t("searchBlocklist.dialog.titleBlock")}
      </PaneTitle>
      <Hint>{hostname || t("searchBlocklist.dialog.hostnameFallback")}</Hint>

      <Accordion
        className="mbu-blocklist-details"
        defaultOpen={false}
        itemValue="search-blocklist-details"
        title={t("searchBlocklist.dialog.detailsTitle")}
      >
        <Stack spacing="small">
          <RowBetween>
            <span>{t("searchBlocklist.dialog.detailsUrl")}</span>
            <span>{entry.url}</span>
          </RowBetween>
          <RowBetween>
            <span>{t("searchBlocklist.dialog.detailsTitleField")}</span>
            <span>{entry.title}</span>
          </RowBetween>
          <RowBetween>
            <span>{t("searchBlocklist.dialog.detailsEngine")}</span>
            <span>{engineId}</span>
          </RowBetween>
        </Stack>
      </Accordion>

      {!entry.blocked && (
        <Fieldset legend={t("searchBlocklist.dialog.rulesToAdd")}>
          <Textarea
            onChange={onRulesToAddChange}
            placeholder={t("searchBlocklist.dialog.rulesToAddPlaceholder")}
            ref={addTextareaRef}
            rows={3}
            value={rulesToAddText}
            variant="pattern"
          />
        </Fieldset>
      )}

      <Fieldset legend={t("searchBlocklist.dialog.rulesToRemove")}>
        <Textarea
          readOnly
          rows={2}
          value={rulesToRemoveText}
          variant="pattern"
        />
      </Fieldset>

      {errorMessage && <Hint as="div">{errorMessage}</Hint>}

      <ButtonRow className="mbu-blocklist-footer">
        <Button
          aria-label={t("searchBlocklist.dialog.openSettingsAria")}
          className="mbu-blocklist-footer-settings"
          onClick={openSearchBlocklistSettings}
          size="small"
          type="button"
          variant="ghost"
        >
          <Icon aria-hidden="true" name="settings" size={16} />
        </Button>
        <Button onClick={onCancel} size="small" type="button" variant="ghost">
          {t("searchBlocklist.dialog.cancelAction")}
        </Button>
        <Button
          onClick={onSubmit}
          ref={primaryButtonRef}
          size="small"
          type="button"
          variant="primary"
        >
          {entry.blocked
            ? t("searchBlocklist.dialog.unblockAction")
            : t("searchBlocklist.dialog.blockAction")}
        </Button>
      </ButtonRow>
    </Stack>
  );
}
