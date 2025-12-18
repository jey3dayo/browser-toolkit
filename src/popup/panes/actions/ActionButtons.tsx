import type { ContextAction } from '../../../context_actions';

type Props = {
  actions: ContextAction[];
  onRun: (actionId: string) => void;
};

export function ActionButtons(props: Props): React.JSX.Element {
  return (
    <div className="action-buttons">
      {props.actions.map(action => (
        <button
          className="btn btn-ghost btn-small"
          data-action-id={action.id}
          key={action.id}
          onClick={() => {
            props.onRun(action.id);
          }}
          type="button"
        >
          {action.title}
        </button>
      ))}
    </div>
  );
}
