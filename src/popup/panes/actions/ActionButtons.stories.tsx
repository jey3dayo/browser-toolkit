import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, userEvent, waitFor, within } from "storybook/test";
import type { ContextAction } from "@/context_actions";
import { ActionButtons } from "./ActionButtons";

function ActionButtonsStory(props: {
  actions: ContextAction[];
  onRun: (actionId: string) => void;
}): React.JSX.Element {
  return <ActionButtons {...props} />;
}

const meta = {
  title: "Popup/Panes/Actions/ActionButtons",
  component: ActionButtonsStory,
  tags: ["test"],
} satisfies Meta<typeof ActionButtonsStory>;

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

export const Basic: Story = {
  args: {
    actions: mockActions,
    onRun: (actionId) => {
      console.log("Action run:", actionId);
    },
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const action of mockActions) {
      const button = canvas.getByText(action.title);
      expect(button).toBeTruthy();
      expect(button.getAttribute("data-action-id")).toBe(action.id);
    }
  },
};

export const SingleAction: Story = {
  args: {
    actions: [mockActions[0]],
    onRun: (actionId) => {
      console.log("Action run:", actionId);
    },
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText("要約");
    expect(button).toBeTruthy();
  },
};

export const ClickAction: Story = {
  args: {
    actions: mockActions,
    onRun: (actionId) => {
      const button = document.querySelector(
        `[data-action-id="${actionId}"]`
      ) as HTMLElement;
      if (button) {
        button.setAttribute("data-clicked", "true");
      }
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByText("要約");

    await userEvent.click(button);
    await waitFor(() => {
      expect(button.getAttribute("data-clicked")).toBe("true");
    });
  },
};

export const MultipleActions: Story = {
  args: {
    actions: [
      ...mockActions,
      {
        id: "action-4",
        title: "コードレビュー",
        kind: "text",
        prompt: "レビュー",
      },
      { id: "action-5", title: "説明", kind: "text", prompt: "説明" },
    ],
    onRun: (actionId) => {
      console.log("Action run:", actionId);
    },
  },
  play: ({ canvasElement }) => {
    const buttons = canvasElement.querySelectorAll(".action-buttons button");
    expect(buttons.length).toBe(5);
  },
};
