import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { PopupApp } from "./App";

function PopupAppStory({ hash = "" }: { hash?: string }): React.JSX.Element {
  if (hash && window.location.hash !== hash) {
    window.location.hash = hash;
  }

  return <PopupApp />;
}

const meta = {
  title: "Popup/App",
  component: PopupAppStory,
  tags: ["test"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PopupAppStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Actions: Story = {
  args: {
    hash: "#pane-actions",
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("tab", { name: "アクション" })).toBeTruthy();
  },
};

export const Settings: Story = {
  args: {
    hash: "#pane-settings",
  },
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("heading", { name: "設定" })).toBeTruthy();
    expect(canvas.getByRole("tab", { name: "設定" })).toBeTruthy();
  },
};
