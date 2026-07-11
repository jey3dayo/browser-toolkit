import { Button } from "@/components/shared/Button";
import { ButtonRow } from "@/components/shared/Layout";
import { t } from "@/i18n";

type Props = {
  onRun: () => void;
  onCopy: () => void;
  onOpenCalendar: () => void;
  onDownloadIcs: () => void;
  canCopyOutput: boolean;
  canOpenCalendar: boolean;
  canDownloadIcs: boolean;
  hasGoogle: boolean;
  hasIcs: boolean;
};

export function CalendarActionButtons(props: Props): React.JSX.Element {
  return (
    <ButtonRow>
      <Button
        data-testid="calendar-run"
        onClick={props.onRun}
        size="small"
        type="button"
        variant="primary"
      >
        {t("calendarPane.run")}
      </Button>
      <Button
        data-testid="calendar-copy"
        disabled={!props.canCopyOutput}
        onClick={props.onCopy}
        size="small"
        type="button"
        variant="ghost"
      >
        {t("common.copy")}
      </Button>
      {props.hasGoogle ? (
        <Button
          data-testid="calendar-open-google"
          disabled={!props.canOpenCalendar}
          onClick={props.onOpenCalendar}
          size="small"
          type="button"
          variant="ghost"
        >
          {t("calendarPane.googleCalendar")}
        </Button>
      ) : null}
      {props.hasIcs ? (
        <Button
          data-testid="calendar-download-ics"
          disabled={!props.canDownloadIcs}
          onClick={props.onDownloadIcs}
          size="small"
          type="button"
          variant="ghost"
        >
          .ics
        </Button>
      ) : null}
    </ButtonRow>
  );
}
