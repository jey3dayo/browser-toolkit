import type { Meta, StoryObj } from "@storybook/react-vite";
import { useCallback, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { ContextAction, ContextActionKind } from "@/context_actions";
import { ActionEditorPanel } from "./ActionEditorPanel";

function ActionEditorPanelStory(
  props: React.ComponentProps<typeof ActionEditorPanel>
): React.JSX.Element {
  return <ActionEditorPanel {...props} />;
}

const meta = {
  component: ActionEditorPanelStory,
  tags: ["test"],
  title: "Popup/Panes/Actions/ActionEditorPanel",
} satisfies Meta<typeof ActionEditorPanelStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockActions: ContextAction[] = [
  { id: "action-1", kind: "text", prompt: "要約してください", title: "要約" },
  { id: "action-2", kind: "text", prompt: "翻訳してください", title: "翻訳" },
  {
    id: "action-3",
    kind: "event",
    prompt: "イベントを抽出",
    title: "イベント抽出",
  },
];

function ActionEditorPanelInteractive(): React.JSX.Element {
  const [editorId, setEditorId] = useState<string>("");
  const [editorTitle, setEditorTitle] = useState<string>("");
  const [editorKind, setEditorKind] = useState<ContextActionKind>("text");
  const [editorPrompt, setEditorPrompt] = useState<string>("");

  const handleClear = useCallback(() => {
    setEditorTitle("");
    setEditorPrompt("");
  }, []);

  const handleDelete = useCallback(() => {
    setEditorId("");
    setEditorTitle("");
    setEditorPrompt("");
    setEditorKind("text");
  }, []);

  const handleReset = useCallback(() => {
    setEditorTitle("");
    setEditorPrompt("");
    setEditorKind("text");
  }, []);

  const handleSave = useCallback(() => {
    console.log("Save:", {
      editorId,
      editorKind,
      editorPrompt,
      editorTitle,
    });
  }, [editorId, editorTitle, editorKind, editorPrompt]);

  const handleSelectActionId = useCallback((id: string) => {
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
  }, []);

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
      onClear={handleClear}
      onDelete={handleDelete}
      onReset={handleReset}
      onSave={handleSave}
      onSelectActionId={handleSelectActionId}
    />
  );
}

export const NewAction = {
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
  render: () => <ActionEditorPanelInteractive />,
} as unknown as Story;

export const EditExistingAction: Story = {
  args: {
    actions: mockActions,
    editorId: "action-1",
    editorKind: "text",
    editorPrompt: "要約してください",
    editorTitle: "要約",
    onChangeKind: () => {
      // noop for story
    },
    onChangePrompt: () => {
      // noop for story
    },
    onChangeTitle: () => {
      // noop for story
    },
    onClear: () => {
      // noop for story
    },
    onDelete: () => {
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
    onChangeKind: () => {
      // noop for story
    },
    onChangePrompt: () => {
      // noop for story
    },
    onChangeTitle: () => {
      // noop for story
    },
    onClear: () => {
      // noop for story
    },
    onDelete: () => {
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
    if (textToggle) {
      return;
    }
    const canvas = within(canvasElement);
    const toggleGroup = canvas.getByTestId("action-editor-kind");
    const textToggleButton = within(toggleGroup).getByRole("button", {
      name: "text",
    });
    expect(textToggleButton.getAttribute("aria-pressed")).toBe("true");
  },
};

export const EventKind: Story = {
  args: {
    actions: mockActions,
    editorId: "",
    editorKind: "event",
    editorPrompt: "イベントプロンプト",
    editorTitle: "イベントアクション",
    onChangeKind: () => {
      // noop for story
    },
    onChangePrompt: () => {
      // noop for story
    },
    onChangeTitle: () => {
      // noop for story
    },
    onClear: () => {
      // noop for story
    },
    onDelete: () => {
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
    if (eventToggle) {
      return;
    }
    const canvas = within(canvasElement);
    const toggleGroup = canvas.getByTestId("action-editor-kind");
    const eventToggleButton = within(toggleGroup).getByRole("button", {
      name: "event",
    });
    expect(eventToggleButton.getAttribute("aria-pressed")).toBe("true");
  },
};

export const FormInteraction = {
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
  render: () => <ActionEditorPanelInteractive />,
} as unknown as Story;

export const SelectAction = {
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const doc = canvasElement.ownerDocument;

    const selectTrigger = canvas.getByTestId("action-editor-select");
    await userEvent.click(selectTrigger);

    await waitFor(() => {
      const selectPopup = doc.body.querySelector(".mbu-select-popup");
      expect(selectPopup).toBeTruthy();
    });

    const actionOption = within(doc.body).getByText("要約");
    await userEvent.click(actionOption);

    await waitFor(() => {
      const titleInput = canvas.getByTestId("action-editor-title");
      expect((titleInput as HTMLInputElement).value).toBe("要約");
    });
  },
  render: () => <ActionEditorPanelInteractive />,
} as unknown as Story;

export const ClearButton = {
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
  render: () => <ActionEditorPanelInteractive />,
} as unknown as Story;
