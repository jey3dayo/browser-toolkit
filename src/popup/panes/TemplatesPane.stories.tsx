import type { Meta, StoryObj } from "@storybook/react-vite";

import { fn } from "storybook/test";
import { TemplatesPane } from "@/popup/panes/TemplatesPane";
import type { PopupPaneBaseProps } from "@/popup/panes/types";
import { createStoryPopupRuntime } from "@/popup/storybook/createStoryPopupRuntime";

function TemplatesPaneStory(props: PopupPaneBaseProps): React.JSX.Element {
  return <TemplatesPane notify={props.notify} runtime={props.runtime} />;
}

const meta = {
  argTypes: {
    notify: { control: false },
    runtime: { control: false },
  },
  component: TemplatesPaneStory,
  tags: ["test"],
  title: "Popup/Panes/Templates",
} satisfies Meta<typeof TemplatesPaneStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      sync: { textTemplates: [] },
    }),
  },
};

export const Populated: Story = {
  args: {
    notify: { error: fn(), info: fn(), success: fn() },
    runtime: createStoryPopupRuntime({
      sync: {
        textTemplates: [
          {
            content: "LGTM :+1:",
            hidden: false,
            id: "template:lgtm-0023a134",
            title: "LGTM",
          },
          {
            content: "@coderabbitai review",
            hidden: true,
            id: "template:coderabbit-review-0f6905e9",
            title: "coderabbitai review",
          },
        ],
      },
    }),
  },
};
