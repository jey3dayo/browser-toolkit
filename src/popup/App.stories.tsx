import type { Meta, StoryObj } from "@storybook/react-vite";
import { PopupApp } from "./App";

function PopupAppStory(): React.JSX.Element {
  return <PopupApp />;
}

const meta = {
  component: PopupAppStory,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["test"],
  title: "Popup/App",
} satisfies Meta<typeof PopupAppStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
