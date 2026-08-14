import { useCallback } from "react";
import { Button } from "@/components/shared/Button";
import { ActionButtonsRow } from "@/components/shared/Layout";
import type { ContextAction } from "@/context_actions";

type Props = {
  actions: ContextAction[];
  onRun: (actionId: string) => void;
};

type ActionButtonProps = {
  action: ContextAction;
  onRun: (actionId: string) => void;
};

function ActionButton({ action, onRun }: ActionButtonProps): React.JSX.Element {
  const handleClick = useCallback(() => {
    onRun(action.id);
  }, [action.id, onRun]);

  return (
    <Button
      data-action-id={action.id}
      onClick={handleClick}
      size="small"
      type="button"
      variant="ghost"
    >
      {action.title}
    </Button>
  );
}

export function ActionButtons(props: Props): React.JSX.Element {
  return (
    <ActionButtonsRow>
      {props.actions.map((action) => (
        <ActionButton action={action} key={action.id} onRun={props.onRun} />
      ))}
    </ActionButtonsRow>
  );
}
