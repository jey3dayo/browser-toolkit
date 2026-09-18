import type { Meta, StoryObj } from "@storybook/react-vite";

import { fn } from "storybook/test";
import { HistoryPane } from "@/popup/panes/HistoryPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

function HistoryPaneStory(props: PopupPaneBaseProps): React.JSX.Element {
  return <HistoryPane notify={props.notify} runtime={props.runtime} />;
}

const meta = {
  argTypes: {
    notify: { control: false },
    runtime: { control: false },
  },
  component: HistoryPaneStory,
  tags: ["test"],
  title: "Popup/Panes/History",
} satisfies Meta<typeof HistoryPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      local: { actionHistory: [] },
    }),
  },
};

export const Populated: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      local: {
        actionHistory: [
          {
            actionTitle: "要約",
            createdAt: Date.now() - 60_000,
            id: "history:1",
            text: "選択したテキストの要約結果がここに表示されます。",
          },
          {
            actionTitle: "翻訳",
            createdAt: Date.now() - 3_600_000,
            id: "history:2",
            text: "This is a translated sample text used for storybook rendering purposes.",
          },
        ],
      },
    }),
  },
};
