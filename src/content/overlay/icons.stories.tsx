import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect } from "storybook/test";
import { CopyIcon, PinIcon } from "./icons";

const meta = {
  tags: ["test"],
  title: "Content/Overlay/Icons",
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const PinIconStory: Story = {
  play: ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  },
  render: () => <PinIcon />,
};

export const CopyIconStory: Story = {
  play: ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  },
  render: () => <CopyIcon />,
};

export const BothIcons: Story = {
  play: ({ canvasElement }) => {
    const svgs = canvasElement.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
    for (const svg of svgs) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  },
  render: () => (
    <div style={{ display: "flex", gap: 16, padding: 16 }}>
      <PinIcon />
      <CopyIcon />
    </div>
  ),
};
