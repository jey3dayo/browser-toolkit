import { useId } from "react";
import { Button } from "@/components/shared/Button";
import { Field } from "@/components/shared/Field";
import { Fieldset } from "@/components/shared/Fieldset";
import { Form } from "@/components/shared/Form";
import { Input } from "@/components/shared/Input";
import { ButtonRow, EditorPanel } from "@/components/shared/Layout";
import { HelpPopover } from "@/components/shared/Popover";
import { Select } from "@/components/shared/Select";
import { Textarea } from "@/components/shared/Textarea";
import { Toggle, ToggleGroup } from "@/components/shared/Toggle";
import type { ContextAction, ContextActionKind } from "@/context_actions";

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

const ACTION_KIND_HELP_DESCRIPTION = (
  <>
    event は日時・場所・概要などを抽出してイベント形式で返すモードです。 text
    はプロンプトに従って要約/翻訳などを行います。
  </>
);

const ACTION_KIND_LABEL_ACCESSORY = (
  <HelpPopover
    ariaLabel="eventとは"
    description={ACTION_KIND_HELP_DESCRIPTION}
    title="event とは"
  />
);

export function ActionEditorPanel(props: Props): React.JSX.Element {
  const titleInputId = useId();
  const actionLabelId = useId();
  const promptInputId = useId();

  const actions = [
    { label: "新規作成", value: null as string | null },
    ...props.actions.map((action) => ({
      label: action.title,
      value: action.id,
    })),
  ];

  return (
    <EditorPanel>
      <Form
        onFormSubmit={() => {
          props.onSave();
        }}
      >
        <Fieldset
          legend="アクション編集"
          legendVariant="editor"
          variant="editor"
        >
          <Field label="対象" labelId={actionLabelId}>
            <Select
              ariaLabelledBy={actionLabelId}
              onValueChange={(value) => {
                props.onSelectActionId(value ?? "");
              }}
              options={actions}
              triggerTestId="action-editor-select"
              value={props.editorId || null}
              variant="token"
            />
          </Field>

          <Field htmlFor={titleInputId} label="タイトル">
            <Input
              data-testid="action-editor-title"
              id={titleInputId}
              onValueChange={props.onChangeTitle}
              type="text"
              value={props.editorTitle}
              variant="token"
            />
          </Field>

          <Field label="種類" labelAccessory={ACTION_KIND_LABEL_ACCESSORY}>
            <ToggleGroup
              data-testid="action-editor-kind"
              onValueChange={(groupValue) => {
                const next = groupValue[0];
                props.onChangeKind(next === "event" ? "event" : "text");
              }}
              value={[props.editorKind]}
            >
              <Toggle value="text" variant="groupItem">
                text
              </Toggle>
              <Toggle value="event" variant="groupItem">
                event
              </Toggle>
            </ToggleGroup>
          </Field>

          <Field htmlFor={promptInputId} label="プロンプト">
            <Textarea
              data-testid="action-editor-prompt"
              id={promptInputId}
              onChange={(event) => {
                props.onChangePrompt(event.currentTarget.value);
              }}
              rows={6}
              value={props.editorPrompt}
              variant="prompt"
            />
          </Field>

          <ButtonRow>
            <Button
              data-testid="action-editor-save"
              onClick={() => {
                props.onSave();
              }}
              size="small"
              type="button"
              variant="primary"
            >
              保存
            </Button>
            <Button
              data-testid="action-editor-delete"
              disabled={!props.editorId}
              onClick={() => {
                props.onDelete();
              }}
              type="button"
              variant="danger"
            >
              削除
            </Button>
            <Button
              data-testid="action-editor-clear"
              onClick={() => {
                props.onClear();
              }}
              size="small"
              type="button"
              variant="ghost"
            >
              クリア
            </Button>
            <Button
              data-testid="action-editor-reset"
              onClick={() => {
                props.onReset();
              }}
              size="small"
              type="button"
              variant="ghost"
            >
              デフォルトに戻す
            </Button>
          </ButtonRow>
        </Fieldset>
      </Form>
    </EditorPanel>
  );
}
