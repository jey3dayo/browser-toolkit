import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { ContextAction, ContextActionKind } from "@/context_actions";
import { ActionEditorPanel } from "./ActionEditorPanel";

function ActionEditorPanelStory(props: {
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
}): React.JSX.Element {
  return <ActionEditorPanel {...props} />;
}

const meta = {
  title: "Popup/Panes/Actions/ActionEditorPanel",
  component: ActionEditorPanelStory,
  tags: ["test"],
} satisfies Meta<typeof ActionEditorPanelStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockActions: ContextAction[] = [
  { id: "action-1", title: "要約", kind: "text", prompt: "要約してください" },
  { id: "action-2", title: "翻訳", kind: "text", prompt: "翻訳してください" },
  {
    id: "action-3",
    title: "イベント抽出",
    kind: "event",
    prompt: "イベントを抽出",
  },
];

function ActionEditorPanelInteractive(): React.JSX.Element {
  const [editorId, setEditorId] = useState<string>("");
  const [editorTitle, setEditorTitle] = useState<string>("");
  const [editorKind, setEditorKind] = useState<ContextActionKind>("text");
  const [editorPrompt, setEditorPrompt] = useState<string>("");

  return (
    <ActionEditorPanel
      actions={mockActions}
      editorId={editorId}
      editorKind={editorKind}
      editorPrompt={editorPrompt}
      editorTitle={editorTitle}
      onChangeKind={setEditorKind}
      onChangePrompt={setEditorPrompt}
      onChangeTitle={setEditorTitle}
      onClear={() => {
        setEditorTitle("");
        setEditorPrompt("");
      }}
      onDelete={() => {
        setEditorId("");
        setEditorTitle("");
        setEditorPrompt("");
        setEditorKind("text");
      }}
      onReset={() => {
        setEditorTitle("");
        setEditorPrompt("");
        setEditorKind("text");
      }}
      onSave={() => {
        console.log("Save:", {
          editorId,
          editorTitle,
          editorKind,
          editorPrompt,
        });
      }}
      onSelectActionId={(id) => {
        setEditorId(id);
        if (id) {
          const action = mockActions.find((a) => a.id === id);
          if (action) {
            setEditorTitle(action.title);
            setEditorPrompt(action.prompt);
            setEditorKind(action.kind);
          }
        } else {
          setEditorTitle("");
          setEditorPrompt("");
          setEditorKind("text");
        }
      }}
    />
  );
}

export const NewAction = {
  render: () => <ActionEditorPanelInteractive />,
  play: ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    const titleInput = canvas.getByTestId("action-editor-title");
    expect(titleInput).toBeTruthy();

    const promptTextarea = canvas.getByTestId("action-editor-prompt");
    expect(promptTextarea).toBeTruthy();

    const kindToggle = canvas.getByTestId("action-editor-kind");
    expect(kindToggle).toBeTruthy();

    const deleteButton = canvas.getByTestId("action-editor-delete");
    expect(deleteButton).toBeDisabled();
  },
} as unknown as Story;

export const EditExistingAction: Story = {
  args: {
    actions: mockActions,
    editorId: "action-1",
    editorKind: "text",
    editorPrompt: "要約してください",
    editorTitle: "要約",
    onClear: () => {
      // noop for story
    },
    onDelete: () => {
      // noop for story
    },
    onChangeKind: () => {
      // noop for story
    },
    onChangePrompt: () => {
      // noop for story
    },
    onChangeTitle: () => {
      // noop for story
    },
    onReset: () => {
      // noop for story
    },
    onSave: () => {
      // noop for story
    },
    onSelectActionId: () => {
      // noop for story
    },
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const titleInput = canvas.getByTestId("action-editor-title");
    expect((titleInput as HTMLInputElement).value).toBe("要約");

    const promptTextarea = canvas.getByTestId("action-editor-prompt");
    expect((promptTextarea as HTMLTextAreaElement).value).toBe(
      "要約してください"
    );

    const deleteButton = canvas.getByTestId("action-editor-delete");
    expect(deleteButton).not.toBeDisabled();
  },
};

export const TextKind: Story = {
  args: {
    actions: mockActions,
    editorId: "",
    editorKind: "text",
    editorPrompt: "テキストプロンプト",
    editorTitle: "テキストアクション",
    onClear: () => {
      // noop for story
    },
    onDelete: () => {
      // noop for story
    },
    onChangeKind: () => {
      // noop for story
    },
    onChangePrompt: () => {
      // noop for story
    },
    onChangeTitle: () => {
      // noop for story
    },
    onReset: () => {
      // noop for story
    },
    onSave: () => {
      // noop for story
    },
    onSelectActionId: () => {
      // noop for story
    },
  },
  play: ({ canvasElement }) => {
    const textToggle = canvasElement.querySelector(
      '[data-testid="action-editor-kind"] [value="text"]'
    );
    expect(textToggle).toBeTruthy();
  },
};

export const EventKind: Story = {
  args: {
    actions: mockActions,
    editorId: "",
    editorKind: "event",
    editorPrompt: "イベントプロンプト",
    editorTitle: "イベントアクション",
    onClear: () => {
      // noop for story
    },
    onDelete: () => {
      // noop for story
    },
    onChangeKind: () => {
      // noop for story
    },
    onChangePrompt: () => {
      // noop for story
    },
    onChangeTitle: () => {
      // noop for story
    },
    onReset: () => {
      // noop for story
    },
    onSave: () => {
      // noop for story
    },
    onSelectActionId: () => {
      // noop for story
    },
  },
  play: ({ canvasElement }) => {
    const eventToggle = canvasElement.querySelector(
      '[data-testid="action-editor-kind"] [value="event"]'
    );
    expect(eventToggle).toBeTruthy();
  },
};

export const FormInteraction = {
  render: () => <ActionEditorPanelInteractive />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    const titleInput = canvas.getByTestId("action-editor-title");
    await userEvent.type(titleInput, "新しいアクション");
    await waitFor(() => {
      expect((titleInput as HTMLInputElement).value).toBe("新しいアクション");
    });

    const promptTextarea = canvas.getByTestId("action-editor-prompt");
    await userEvent.type(promptTextarea, "プロンプトテキスト");
    await waitFor(() => {
      expect((promptTextarea as HTMLTextAreaElement).value).toBe(
        "プロンプトテキスト"
      );
    });
  },
} as unknown as Story;

export const SelectAction = {
  render: () => <ActionEditorPanelInteractive />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    const selectTrigger = canvas.getByTestId("action-editor-select");
    await userEvent.click(selectTrigger);

    await waitFor(() => {
      const selectPopup = canvasElement.querySelector(".mbu-select-popup");
      expect(selectPopup).toBeTruthy();
    });

    const actionOption = canvas.getByText("要約");
    await userEvent.click(actionOption);

    await waitFor(() => {
      const titleInput = canvas.getByTestId("action-editor-title");
      expect((titleInput as HTMLInputElement).value).toBe("要約");
    });
  },
} as unknown as Story;

export const ClearButton = {
  render: () => <ActionEditorPanelInteractive />,
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);

    const titleInput = canvas.getByTestId("action-editor-title");
    await userEvent.type(titleInput, "テストタイトル");

    const promptTextarea = canvas.getByTestId("action-editor-prompt");
    await userEvent.type(promptTextarea, "テストプロンプト");

    const clearButton = canvas.getByTestId("action-editor-clear");
    await userEvent.click(clearButton);

    await waitFor(() => {
      expect((titleInput as HTMLInputElement).value).toBe("");
      expect((promptTextarea as HTMLTextAreaElement).value).toBe("");
    });
  },
} as unknown as Story;
