import type { Meta, StoryObj } from "@storybook/react-vite";

import { fn } from "storybook/test";
import { SearchEnginesPane } from "@/popup/panes/SearchEnginesPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

function SearchEnginesPaneStory(props: PopupPaneBaseProps): React.JSX.Element {
  return <SearchEnginesPane notify={props.notify} runtime={props.runtime} />;
}

const meta = {
  argTypes: {
    notify: { control: false },
    runtime: { control: false },
  },
  component: SearchEnginesPaneStory,
  tags: ["test"],
  title: "Popup/Panes/SearchEngines",
} satisfies Meta<typeof SearchEnginesPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      sync: { searchEngines: [] },
    }),
  },
};

export const Populated: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      sync: {
        searchEngines: [
          {
            enabled: true,
            id: "engine:google",
            name: "Google",
            urlTemplate: "https://www.google.com/search?q={query}",
          },
          {
            enabled: false,
            encoding: "shift_jis",
            id: "engine:yahoo-jp",
            name: "Yahoo! JAPAN",
            urlTemplate: "https://search.yahoo.co.jp/search?p={query}",
          },
        ],
      },
    }),
  },
};
