import type { ContextAction } from '../../../context_actions';

type Props = {
  actions: ContextAction[];
  onRun: (actionId: string) => void;
};

export function ActionButtons(props: Props): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
      {props.actions.map(action => (
        <button
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
