import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { SearchBlocklistPane } from "@/popup/panes/SearchBlocklistPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

function SearchBlocklistPaneStory(
  props: PopupPaneBaseProps
): React.JSX.Element {
  return <SearchBlocklistPane notify={props.notify} runtime={props.runtime} />;
}

const meta = {
  argTypes: {
    notify: { control: false },
    runtime: { control: false },
  },
  component: SearchBlocklistPaneStory,
  tags: ["test"],
  title: "Popup/Panes/SearchBlocklist",
} satisfies Meta<typeof SearchBlocklistPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      local: { searchBlocklistRules: [] },
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      canvas.getByTestId("search-blocklist-input"),
      "example.com"
    );
    await userEvent.click(canvas.getByTestId("search-blocklist-add"));
    await waitFor(() => {
      expect(args.notify.success).toHaveBeenCalledWith("追加しました");
    });
  },
};

export const Populated: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      local: {
        searchBlocklistRules: [
          {
            createdAt: Date.now(),
            id: "search-blocklist:example-com-1",
            pattern: "example.com",
          },
          {
            createdAt: Date.now(),
            id: "search-blocklist:spam-example-com-2",
            pattern: "*://*.spam-example.com/*",
          },
        ],
      },
    }),
  },
};

export const InvalidPattern: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      local: { searchBlocklistRules: [] },
    }),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.type(
      canvas.getByTestId("search-blocklist-input"),
      "/example\\.(net|org)/"
    );
    await userEvent.click(canvas.getByTestId("search-blocklist-add"));
    await waitFor(() => {
      expect(args.notify.error).toHaveBeenCalledWith(
        "正規表現ルールは v1 未対応です"
      );
    });
  },
};
