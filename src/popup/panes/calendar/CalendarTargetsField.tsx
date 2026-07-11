import { CheckboxInline } from "@/components/shared/Checkbox";
import { Field } from "@/components/shared/Field";
import { ActionRow } from "@/components/shared/Layout";
import { t } from "@/i18n";
import type { CalendarRegistrationTarget } from "@/shared_types";

type Props = {
  hasGoogle: boolean;
  hasIcs: boolean;
  googleId: string;
  icsId: string;
  onToggle: (target: CalendarRegistrationTarget) => void;
};

export function CalendarTargetsField(props: Props): React.JSX.Element {
  return (
    <Field label={t("calendarPane.target")}>
      <ActionRow>
        <CheckboxInline
          checked={props.hasGoogle}
          id={props.googleId}
          onChange={() => {
            props.onToggle("google");
          }}
        >
          {t("calendarPane.googleCalendar")}
        </CheckboxInline>
        <CheckboxInline
          checked={props.hasIcs}
          id={props.icsId}
          onChange={() => {
            props.onToggle("ics");
          }}
        >
          iCal (.ics)
        </CheckboxInline>
      </ActionRow>
    </Field>
  );
}
