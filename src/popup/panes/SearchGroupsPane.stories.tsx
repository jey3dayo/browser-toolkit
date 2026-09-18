import type { Meta, StoryObj } from "@storybook/react-vite";

import { fn } from "storybook/test";
import { SearchGroupsPane } from "@/popup/panes/SearchGroupsPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

function SearchGroupsPaneStory(props: PopupPaneBaseProps): React.JSX.Element {
  return <SearchGroupsPane notify={props.notify} runtime={props.runtime} />;
}

const meta = {
  argTypes: {
    notify: { control: false },
    runtime: { control: false },
  },
  component: SearchGroupsPaneStory,
  tags: ["test"],
  title: "Popup/Panes/SearchGroups",
} satisfies Meta<typeof SearchGroupsPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      sync: { searchEngineGroups: [], searchEngines: [] },
    }),
  },
};

export const Populated: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      sync: {
        searchEngineGroups: [
          {
            enabled: true,
            engineIds: ["engine:amazon", "engine:rakuten"],
            id: "group:shopping",
            name: "お買い物",
          },
          {
            enabled: false,
            engineIds: ["engine:google"],
            id: "group:research",
            name: "調べ物",
          },
        ],
        searchEngines: [
          {
            enabled: true,
            id: "engine:google",
            name: "Google",
            urlTemplate: "https://www.google.com/search?q={query}",
          },
          {
            enabled: true,
            id: "engine:amazon",
            name: "Amazon",
            urlTemplate: "https://www.amazon.co.jp/s?k={query}",
          },
          {
            enabled: true,
            id: "engine:rakuten",
            name: "楽天市場",
            urlTemplate: "https://search.rakuten.co.jp/search/mall/{query}/",
          },
        ],
      },
    }),
  },
};
