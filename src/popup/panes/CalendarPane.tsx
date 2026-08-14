import { useCallback, useId } from "react";
import { Badge } from "@/components/shared/Badge";
import { PaneCard, RowBetween, Stack } from "@/components/shared/Layout";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import { t } from "@/i18n";
import type { PaneId } from "@/popup/panes";
import { CalendarActionButtons } from "@/popup/panes/calendar/CalendarActionButtons";
import { CalendarOutputPanel } from "@/popup/panes/calendar/CalendarOutputPanel";
import { CalendarTargetsField } from "@/popup/panes/calendar/CalendarTargetsField";
import { useCalendarRun } from "@/popup/panes/calendar/useCalendarRun";
import { useCalendarTargets } from "@/popup/panes/calendar/useCalendarTargets";
import type { PopupPaneBaseProps } from "@/popup/panes/types";

export type CalendarPaneProps = PopupPaneBaseProps & {
  navigateToPane: (paneId: PaneId) => void;
  focusTokenInput: () => void;
};

export function CalendarPane(props: CalendarPaneProps): React.JSX.Element {
  const { focusTokenInput, navigateToPane, notify, runtime } = props;

  const googleId = useId();
  const icsId = useId();

  const { targets, hasGoogle, hasIcs, toggleTarget } = useCalendarTargets({
    notify,
    runtime,
  });

  const {
    output,
    outputTitle,
    outputValue,
    canCopyOutput,
    canOpenCalendar,
    canDownloadIcs,
    runCalendar,
    copyOutput,
    openCalendar,
    downloadIcs,
  } = useCalendarRun({
    focusTokenInput,
    hasGoogle,
    hasIcs,
    navigateToPane,
    notify,
    runtime,
    targets,
  });

  const handleCopy = useCallback(() => {
    copyOutput().catch(() => {
      // no-op
    });
  }, [copyOutput]);

  const handleDownloadIcs = useCallback(() => {
    downloadIcs();
  }, [downloadIcs]);

  const handleOpenCalendar = useCallback(() => {
    openCalendar();
  }, [openCalendar]);

  const handleRun = useCallback(() => {
    runCalendar().catch(() => {
      // no-op
    });
  }, [runCalendar]);

  return (
    <PaneCard className="settings-surface calendar-settings-pane">
      <section className="settings-pane-overview">
        <RowBetween className="settings-surface-heading">
          <Stack spacing="small">
            <PaneTitle>{t("calendarPane.title")}</PaneTitle>
            <Hint>{t("calendarPane.description")}</Hint>
          </Stack>
          <Badge data-testid="calendar-source" variant="chipSoft">
            {output.status === "ready" ? output.sourceLabel : "-"}
          </Badge>
        </RowBetween>
      </section>

      <section className="card settings-card settings-pane-card">
        <CalendarTargetsField
          googleId={googleId}
          hasGoogle={hasGoogle}
          hasIcs={hasIcs}
          icsId={icsId}
          onToggle={toggleTarget}
        />

        <CalendarActionButtons
          copyState={{ enabled: canCopyOutput, visible: true }}
          googleState={{ enabled: canOpenCalendar, visible: hasGoogle }}
          icsState={{ enabled: canDownloadIcs, visible: hasIcs }}
          onCopy={handleCopy}
          onDownloadIcs={handleDownloadIcs}
          onOpenCalendar={handleOpenCalendar}
          onRun={handleRun}
        />
      </section>

      <CalendarOutputPanel
        outputTitle={outputTitle}
        outputValue={outputValue}
      />
    </PaneCard>
  );
}
