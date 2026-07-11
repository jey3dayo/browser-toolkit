import { OutputPanel, RowBetween } from "@/components/shared/Layout";
import { Textarea } from "@/components/shared/Textarea";
import { MetaTitle } from "@/components/shared/Typography";

type Props = {
  outputTitle: string;
  outputValue: string;
};

export function CalendarOutputPanel(props: Props): React.JSX.Element {
  return (
    <OutputPanel className="settings-output-panel">
      <RowBetween>
        <MetaTitle>{props.outputTitle}</MetaTitle>
      </RowBetween>
      <Textarea
        data-testid="calendar-output"
        readOnly
        size="small"
        value={props.outputValue}
        variant="summary"
      />
    </OutputPanel>
  );
}
