import type { Meta, StoryObj } from "@storybook/react-vite";
import { PopupApp } from "./App";

function PopupAppStory(): React.JSX.Element {
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

export const Default: Story = {};
