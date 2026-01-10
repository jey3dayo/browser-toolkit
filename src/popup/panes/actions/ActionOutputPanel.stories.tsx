import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, userEvent, waitFor, within } from "storybook/test";
import { ActionOutputPanel } from "./ActionOutputPanel";

function ActionOutputPanelStory(
  props: React.ComponentProps<typeof ActionOutputPanel>
): React.JSX.Element {
  return <ActionOutputPanel {...props} />;
}

const meta = {
  title: "Popup/Panes/Actions/ActionOutputPanel",
  component: ActionOutputPanelStory,
  tags: ["test"],
} satisfies Meta<typeof ActionOutputPanelStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    title: "出力結果",
    value: "これは出力テキストです。",
    canCopy: true,
    onCopy: () => {
      console.log("Copy clicked");
    },
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const title = canvas.getByText("出力結果");
    expect(title).toBeTruthy();

    const textarea = canvas.getByTestId("action-output");
    expect(textarea).toBeTruthy();
    expect((textarea as HTMLTextAreaElement).value).toBe(
      "これは出力テキストです。"
    );
    expect((textarea as HTMLTextAreaElement).readOnly).toBe(true);

    const copyButton = canvas.getByTestId("copy-output");
    expect(copyButton).toBeTruthy();
    expect(copyButton).not.toBeDisabled();
  },
};

export const LongText: Story = {
  args: {
    title: "長い出力",
    value: "あ".repeat(1000),
    canCopy: true,
    onCopy: () => {
      console.log("Copy clicked");
    },
  },
  play: ({ canvasElement }) => {
    const textarea = canvasElement.querySelector<HTMLTextAreaElement>(
      "[data-testid='action-output']"
    );
    expect(textarea?.value.length).toBe(1000);
  },
};

export const DisabledCopy: Story = {
  args: {
    title: "出力結果",
    value: "コピーできない状態",
    canCopy: false,
    onCopy: () => {
      console.log("Copy clicked");
    },
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const copyButton = canvas.getByTestId("copy-output");
    expect(copyButton).toBeDisabled();
  },
};

export const EmptyValue: Story = {
  args: {
    title: "空の出力",
    value: "",
    canCopy: false,
    onCopy: () => {
      console.log("Copy clicked");
    },
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByTestId("action-output");
    expect((textarea as HTMLTextAreaElement).value).toBe("");

    const copyButton = canvas.getByTestId("copy-output");
    expect(copyButton).toBeDisabled();
  },
};

export const CopyAction: Story = {
  args: {
    title: "出力結果",
    value: "コピー可能なテキスト",
    canCopy: true,
    onCopy: () => {
      const button = document.querySelector(
        "[data-testid='copy-output']"
      ) as HTMLElement;
      if (button) {
        button.setAttribute("data-copied", "true");
      }
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const copyButton = canvas.getByTestId("copy-output");

    await userEvent.click(copyButton);
    await waitFor(() => {
      expect(copyButton.getAttribute("data-copied")).toBe("true");
    });
  },
};
