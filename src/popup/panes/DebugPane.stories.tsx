import type { Meta, StoryObj } from "@storybook/react-vite";

import { fn } from "storybook/test";
import { DebugPane } from "@/popup/panes/DebugPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

function DebugPaneStory(props: PopupPaneBaseProps): React.JSX.Element {
  return <DebugPane notify={props.notify} runtime={props.runtime} />;
}

const meta = {
  argTypes: {
    notify: { control: false },
    runtime: { control: false },
  },
  component: DebugPaneStory,
  tags: ["test"],
  title: "Popup/Panes/Debug",
} satisfies Meta<typeof DebugPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      activeTabId: 1,
      local: { debugMode: false },
    }),
  },
};

export const Enabled: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      activeTabId: 1,
      local: { debugMode: true },
    }),
  },
};
