import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { Icon } from "@/components/icon";
import { PaneCard } from "@/components/shared/Layout";
import { Hint, PaneTitle } from "@/components/shared/Typography";
import {
  PopupContent,
  PopupContentBody,
  PopupContentHeader,
  PopupShell,
  PopupTitleBlock,
} from "@/popup/components/PopupLayout";

function PopupLayoutReference(): React.JSX.Element {
  return (
    <PopupShell>
      <PopupContent>
        <PopupContentHeader>
          <PopupTitleBlock>
            <div className="hero-logo-wrap">
              <Icon aria-hidden="true" className="hero-logo" name="zap" />
            </div>
            <div className="title-text">
              <div className="title-row">
                <h1>Browser Toolkit</h1>
              </div>
            </div>
          </PopupTitleBlock>
        </PopupContentHeader>
        <PopupContentBody>
          <PaneCard>
            <PaneTitle>Popup shell</PaneTitle>
            <Hint>
              800x600 の固定作業面。長い内容は content body 内でスクロールする。
            </Hint>
          </PaneCard>
          {Array.from({ length: 8 }, (_, index) => (
            <PaneCard key={index}>
              <PaneTitle>Reference row {index + 1}</PaneTitle>
              <Hint>
                Card gap、surface、border、scrollbar gutter の基準確認用。
              </Hint>
            </PaneCard>
          ))}
        </PopupContentBody>
      </PopupContent>
      <aside aria-label="Reference rail" className="sidebar">
        <button className="sidebar-brand" type="button">
          <Icon aria-hidden="true" name="menu" />
        </button>
        <div role="tablist">
          <button
            aria-selected="true"
            className="nav-item"
            role="tab"
            type="button"
          >
            <span className="nav-icon">
              <Icon aria-hidden="true" name="zap" />
            </span>
          </button>
          <button className="nav-item" type="button">
            <span className="nav-icon">
              <Icon aria-hidden="true" name="settings" />
            </span>
          </button>
        </div>
      </aside>
    </PopupShell>
  );
}

const meta = {
  title: "Popup/Components/PopupLayout",
  component: PopupLayoutReference,
  tags: ["test"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PopupLayoutReference>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ShellAndScroll: Story = {
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByText("Popup shell")).toBeTruthy();
    expect(canvas.getByLabelText("Reference rail")).toBeTruthy();
  },
};
