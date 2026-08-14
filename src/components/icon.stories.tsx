import type { Meta, StoryObj } from "@storybook/react-vite";

import { expect, within } from "storybook/test";

import { Icon, type IconName } from "./icon";

const iconNames: IconName[] = [
  "menu",
  "zap",
  "table",
  "link",
  "settings",
  "monitor",
  "sun",
  "moon",
  "pin",
  "copy",
  "close",
  "eye",
  "eye-off",
];

function IconGallery(): React.JSX.Element {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        padding: 16,
      }}
    >
      {iconNames.map((name) => (
        <div
          key={name}
          style={{
            alignItems: "center",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-ui)",
            borderRadius: 12,
            display: "flex",
            gap: 10,
            padding: 12,
          }}
        >
          <Icon aria-hidden="true" data-testid={`icon-${name}`} name={name} />
          <code style={{ fontSize: 12 }}>{name}</code>
        </div>
      ))}
    </div>
  );
}

const meta = {
  component: IconGallery,
  tags: ["test"],
  title: "Shared/Components/Icon",
} satisfies Meta<typeof IconGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gallery: Story = {
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const name of iconNames) {
      const svg = canvas.getByTestId(`icon-${name}`);
      expect(svg.tagName.toLowerCase()).toBe("svg");
    }
  },
};

function IconWithProps(): React.JSX.Element {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-ui)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 12,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>Default Size</div>
        <Icon aria-hidden="true" data-testid="icon-default" name="settings" />
      </div>
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-ui)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 12,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>Custom Size (24px)</div>
        <Icon
          aria-hidden="true"
          data-testid="icon-size-24"
          name="settings"
          size={24}
        />
      </div>
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border-ui)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 12,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600 }}>Custom Color</div>
        <Icon
          aria-hidden="true"
          color="var(--color-accent)"
          data-testid="icon-color"
          name="settings"
        />
      </div>
    </div>
  );
}

export const WithProps: Story = {
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const defaultIcon = canvas.getByTestId("icon-default");
    const size24Icon = canvas.getByTestId("icon-size-24");
    const colorIcon = canvas.getByTestId("icon-color");

    expect(defaultIcon.tagName.toLowerCase()).toBe("svg");
    expect(size24Icon.tagName.toLowerCase()).toBe("svg");
    expect(colorIcon.tagName.toLowerCase()).toBe("svg");

    expect(size24Icon.getAttribute("width")).toBe("24");
    expect(size24Icon.getAttribute("height")).toBe("24");
  },
  render: () => <IconWithProps />,
};

export const Accessibility: Story = {
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);

    for (const name of iconNames) {
      const svg = canvas.getByTestId(`icon-${name}`);
      const ariaHidden = svg.getAttribute("aria-hidden");
      expect(ariaHidden).toBe("true");
    }
  },
};
