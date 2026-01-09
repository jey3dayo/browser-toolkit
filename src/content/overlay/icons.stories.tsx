import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect } from "storybook/test";
import { CopyIcon, PinIcon } from "./icons";

const meta = {
  title: "Content/Overlay/Icons",
  tags: ["test"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const PinIconStory: Story = {
  render: () => <PinIcon />,
  play: ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  },
};

export const CopyIconStory: Story = {
  render: () => <CopyIcon />,
  play: ({ canvasElement }) => {
    const svg = canvasElement.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  },
};

export const BothIcons: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, padding: 16 }}>
      <PinIcon />
      <CopyIcon />
    </div>
  ),
  play: ({ canvasElement }) => {
    const svgs = canvasElement.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
    for (const svg of svgs) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  },
};
