import { Button } from "@/components/shared/Button";
import { Fieldset } from "@/components/shared/Fieldset";
import { ButtonRow, RowBetween, Stack } from "@/components/shared/Layout";
import { TextOutput } from "@/components/shared/TextOutput";
import { t } from "@/i18n";
import type { UseDebugLogsResult } from "@/popup/panes/debug/useDebugLogs";

export type DebugLogsSectionProps = Pick<
  UseDebugLogsResult,
  | "showLogs"
  | "logContent"
  | "handleShowLogsClick"
  | "handleDownloadLogsClick"
  | "handleClearLogsClick"
  | "handleHideLogsClick"
>;

export function DebugLogsSection(
  props: DebugLogsSectionProps
): React.JSX.Element {
  const {
    showLogs,
    logContent,
    handleShowLogsClick,
    handleDownloadLogsClick,
    handleClearLogsClick,
    handleHideLogsClick,
  } = props;
  return (
    <section className="settings-pane-card">
      <Fieldset legend={t("debug.logActions")} spacing="stack">
        <ButtonRow>
          <Button
            data-testid="show-debug-logs"
            onClick={handleShowLogsClick}
            size="small"
            type="button"
            variant="ghost"
          >
            {t("debug.showLogs")}
          </Button>
          <Button
            data-testid="download-debug-logs"
            onClick={handleDownloadLogsClick}
            size="small"
            type="button"
            variant="ghost"
          >
            {t("debug.download")}
          </Button>
          <Button
            data-testid="clear-debug-logs"
            onClick={handleClearLogsClick}
            type="button"
            variant="danger"
          >
            {t("debug.clear")}
          </Button>
        </ButtonRow>
      </Fieldset>

      {showLogs && (
        <Stack className="settings-log-panel">
          <RowBetween>
            <strong>{t("debug.logContent")}</strong>
            <Button
              data-testid="hide-debug-logs"
              onClick={handleHideLogsClick}
              type="button"
              variant="danger"
            >
              {t("common.close")}
            </Button>
          </RowBetween>
          <TextOutput variant="debugLog">
            {logContent || t("debug.emptyLogs")}
          </TextOutput>
        </Stack>
      )}
    </section>
  );
}
