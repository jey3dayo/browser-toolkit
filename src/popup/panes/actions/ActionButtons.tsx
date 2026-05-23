import { Button } from "@/components/shared/Button";
import { ActionButtonsRow } from "@/components/shared/Layout";
import type { ContextAction } from "@/context_actions";

type Props = {
  actions: ContextAction[];
  onRun: (actionId: string) => void;
};

export function ActionButtons(props: Props): React.JSX.Element {
  return (
    <ActionButtonsRow>
      {props.actions.map((action) => (
        <Button
          data-action-id={action.id}
          key={action.id}
          onClick={() => {
            props.onRun(action.id);
          }}
          size="small"
          type="button"
          variant="ghost"
        >
          {action.title}
        </Button>
      ))}
    </ActionButtonsRow>
  );
}
