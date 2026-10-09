import { Stack } from "@/components/shared/Layout";
import { Hint } from "@/components/shared/Typography";
import { t } from "@/i18n";
import { DebugLogsSection } from "@/popup/panes/debug/DebugLogsSection";
import { DebugModeSection } from "@/popup/panes/debug/DebugModeSection";
import { SearchBlocklistDiagnosticsSection } from "@/popup/panes/debug/SearchBlocklistDiagnosticsSection";
import { useDebugLogs } from "@/popup/panes/debug/useDebugLogs";
import { useSearchBlocklistDiagnostics } from "@/popup/panes/debug/useSearchBlocklistDiagnostics";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

export type DebugPaneProps = PopupPaneBaseProps;

export function DebugPane(props: DebugPaneProps): React.JSX.Element {
  const debugLogs = useDebugLogs(props);
  const searchBlocklistDiagnostics = useSearchBlocklistDiagnostics(
    props.runtime
  );

  return (
    <Stack className="settings-surface debug-settings-pane">
      <Hint as="div">{t("debug.description")}</Hint>

      <DebugModeSection
        debugMode={debugLogs.debugMode}
        handleToggleDebugMode={debugLogs.handleToggleDebugMode}
        logStats={debugLogs.logStats}
      />

      <SearchBlocklistDiagnosticsSection state={searchBlocklistDiagnostics} />

      {debugLogs.debugMode && (
        <DebugLogsSection
          handleClearLogsClick={debugLogs.handleClearLogsClick}
          handleDownloadLogsClick={debugLogs.handleDownloadLogsClick}
          handleHideLogsClick={debugLogs.handleHideLogsClick}
          handleShowLogsClick={debugLogs.handleShowLogsClick}
          logContent={debugLogs.logContent}
          showLogs={debugLogs.showLogs}
        />
      )}
    </Stack>
  );
}
