import { Button } from "@/components/shared/Button";
import { ButtonRow } from "@/components/shared/Layout";
import { t } from "@/i18n";

export type CalendarActionButtonState = {
  visible: boolean;
  enabled: boolean;
};

type Props = {
  onRun: () => void;
  onCopy: () => void;
  onOpenCalendar: () => void;
  onDownloadIcs: () => void;
  copyState: CalendarActionButtonState;
  googleState: CalendarActionButtonState;
  icsState: CalendarActionButtonState;
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
        disabled={!props.copyState.enabled}
        onClick={props.onCopy}
        size="small"
        type="button"
        variant="ghost"
      >
        {t("common.copy")}
      </Button>
      {props.googleState.visible ? (
        <Button
          data-testid="calendar-open-google"
          disabled={!props.googleState.enabled}
          onClick={props.onOpenCalendar}
          size="small"
          type="button"
          variant="ghost"
        >
          {t("calendarPane.googleCalendar")}
        </Button>
      ) : null}
      {props.icsState.visible ? (
        <Button
          data-testid="calendar-download-ics"
          disabled={!props.icsState.enabled}
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
