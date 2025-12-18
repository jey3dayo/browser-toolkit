import type { ContextAction, ContextActionKind } from '../../../context_actions';

type Props = {
  actions: ContextAction[];
  editorId: string;
  editorTitle: string;
  editorKind: ContextActionKind;
  editorPrompt: string;
  onSelectActionId: (actionId: string) => void;
  onChangeTitle: (value: string) => void;
  onChangeKind: (value: ContextActionKind) => void;
  onChangePrompt: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onClear: () => void;
  onReset: () => void;
};

export function ActionEditorPanel(props: Props): React.JSX.Element {
  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
      <h3 style={{ margin: 0, fontSize: 14 }}>アクション編集</h3>

      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>対象</span>
          <select
            data-testid="action-editor-select"
            onChange={event => {
              props.onSelectActionId(event.currentTarget.value);
            }}
            value={props.editorId}
          >
            <option value="">新規作成</option>
            {props.actions.map(action => (
              <option key={action.id} value={action.id}>
                {action.title}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>タイトル</span>
          <input
            data-testid="action-editor-title"
            onChange={event => {
              props.onChangeTitle(event.currentTarget.value);
            }}
            type="text"
            value={props.editorTitle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>種類</span>
          <select
            data-testid="action-editor-kind"
            onChange={event => {
              props.onChangeKind(event.currentTarget.value === 'event' ? 'event' : 'text');
            }}
            value={props.editorKind}
          >
            <option value="text">text</option>
            <option value="event">event</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>プロンプト</span>
          <textarea
            data-testid="action-editor-prompt"
            onChange={event => {
              props.onChangePrompt(event.currentTarget.value);
            }}
            rows={6}
            value={props.editorPrompt}
          />
        </label>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            data-testid="action-editor-save"
            onClick={() => {
              props.onSave();
            }}
            type="button"
          >
            保存
          </button>
          <button
            data-testid="action-editor-delete"
            disabled={!props.editorId}
            onClick={() => {
              props.onDelete();
            }}
            type="button"
          >
            削除
          </button>
          <button
            data-testid="action-editor-clear"
            onClick={() => {
              props.onClear();
            }}
            type="button"
          >
            クリア
          </button>
          <button
            data-testid="action-editor-reset"
            onClick={() => {
              props.onReset();
            }}
            type="button"
          >
            デフォルトに戻す
          </button>
        </div>
      </div>
    </div>
  );
}
