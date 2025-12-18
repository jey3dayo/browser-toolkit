import { Input } from '@base-ui/react/input';
import { useId } from 'react';
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
  const titleInputId = useId();

  return (
    <section className="editor-panel">
      <h3 className="editor-title">アクション編集</h3>

      <div className="editor-form">
        <label className="field">
          <span className="field-name">対象</span>
          <select
            className="token-input"
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

        <label className="field" htmlFor={titleInputId}>
          <span className="field-name">タイトル</span>
          <Input
            className="token-input"
            data-testid="action-editor-title"
            id={titleInputId}
            onChange={event => {
              props.onChangeTitle(event.currentTarget.value);
            }}
            type="text"
            value={props.editorTitle}
          />
        </label>

        <label className="field">
          <span className="field-name">種類</span>
          <select
            className="token-input"
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

        <label className="field">
          <span className="field-name">プロンプト</span>
          <textarea
            className="prompt-input"
            data-testid="action-editor-prompt"
            onChange={event => {
              props.onChangePrompt(event.currentTarget.value);
            }}
            rows={6}
            value={props.editorPrompt}
          />
        </label>

        <div className="button-row">
          <button
            className="btn btn-primary btn-small"
            data-testid="action-editor-save"
            onClick={() => {
              props.onSave();
            }}
            type="button"
          >
            保存
          </button>
          <button
            className="btn-delete"
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
            className="btn btn-ghost btn-small"
            data-testid="action-editor-clear"
            onClick={() => {
              props.onClear();
            }}
            type="button"
          >
            クリア
          </button>
          <button
            className="btn btn-ghost btn-small"
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
    </section>
  );
}
