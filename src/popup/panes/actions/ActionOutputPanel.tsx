import { Button } from "@/components/shared/Button";
import { ButtonRow, OutputPanel, RowBetween } from "@/components/shared/Layout";
import { Textarea } from "@/components/shared/Textarea";
import { MetaTitle } from "@/components/shared/Typography";

type Props = {
  title: string;
  value: string;
  canCopy: boolean;
  onCopy: () => void;
};

export function ActionOutputPanel(props: Props): React.JSX.Element {
  return (
    <OutputPanel>
      <RowBetween>
        <MetaTitle>{props.title}</MetaTitle>
        <ButtonRow>
          <Button
            data-testid="copy-output"
            disabled={!props.canCopy}
            onClick={() => {
              props.onCopy();
            }}
            size="small"
            type="button"
            variant="ghost"
          >
            コピー
          </Button>
        </ButtonRow>
      </RowBetween>
      <Textarea
        data-testid="action-output"
        readOnly
        size="small"
        value={props.value}
        variant="summary"
      />
    </OutputPanel>
  );
}
