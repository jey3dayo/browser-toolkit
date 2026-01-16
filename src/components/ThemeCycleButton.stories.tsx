import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import type { Theme } from "@/ui/theme";
import { nextTheme } from "@/ui/themeCycle";

function ThemeCycleButtonStory(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>("auto");

  return (
    <ThemeCycleButton
      className="mbu-overlay-action mbu-overlay-icon-button"
      onToggle={() => {
        setTheme((prev) => nextTheme(prev));
      }}
      testId="theme-cycle"
      theme={theme}
    />
  );
}

const meta = {
  title: "Shared/Components/ThemeCycleButton",
  component: ThemeCycleButtonStory,
  tags: ["test"],
} satisfies Meta<typeof ThemeCycleButtonStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Cycle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId("theme-cycle");

    expect(button.getAttribute("aria-label")).toContain("自動");

    await userEvent.click(button);
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toContain("ライト");
    });

    await userEvent.click(button);
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toContain("ダーク");
    });

    await userEvent.click(button);
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toContain("自動");
    });
  },
};

function ThemeCycleButtonWithActive(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>("light");

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <ThemeCycleButton
        active={false}
        className="mbu-overlay-action mbu-overlay-icon-button"
        onToggle={() => {
          setTheme((prev) => nextTheme(prev));
        }}
        testId="theme-cycle-inactive"
        theme={theme}
      />
      <ThemeCycleButton
        active={true}
        className="mbu-overlay-action mbu-overlay-icon-button"
        onToggle={() => {
          setTheme((prev) => nextTheme(prev));
        }}
        testId="theme-cycle-active"
        theme={theme}
      />
    </div>
  );
}

export const ActiveState: Story = {
  render: () => <ThemeCycleButtonWithActive />,
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inactiveButton = canvas.getByTestId("theme-cycle-inactive");
    const activeButton = canvas.getByTestId("theme-cycle-active");

    expect(inactiveButton.getAttribute("data-active")).toBeNull();
    expect(activeButton.getAttribute("data-active")).toBe("true");
  },
};

function ThemeCycleButtonWithDescribedBy(): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>("auto");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <ThemeCycleButton
        className="mbu-overlay-action mbu-overlay-icon-button"
        describedById="theme-description"
        onToggle={() => {
          setTheme((prev) => nextTheme(prev));
        }}
        testId="theme-cycle-described"
        theme={theme}
      />
      <div
        id="theme-description"
        style={{ fontSize: 12, color: "var(--color-text-muted)" }}
      >
        テーマを切り替えます
      </div>
    </div>
  );
}

export const WithDescription: Story = {
  render: () => <ThemeCycleButtonWithDescribedBy />,
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByTestId("theme-cycle-described");
    const description = canvas.getByText("テーマを切り替えます");

    expect(button.getAttribute("aria-describedby")).toBe("theme-description");
    expect(description.id).toBe("theme-description");
  },
};

export const KeyboardNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup({ document: canvasElement.ownerDocument });
    const button = canvas.getByTestId("theme-cycle");

    button.focus();
    expect(canvasElement.ownerDocument.activeElement).toBe(button);

    const initialLabel = button.getAttribute("aria-label");
    expect(initialLabel).toBeTruthy();

    await user.keyboard("{Enter}");
    await waitFor(() => {
      const newLabel = button.getAttribute("aria-label");
      expect(newLabel).not.toBe(initialLabel);
    });

    const labelAfterEnter = button.getAttribute("aria-label");

    await user.keyboard("{Space}");
    button.click();
    await waitFor(() => {
      const newLabel = button.getAttribute("aria-label");
      expect(newLabel).not.toBe(labelAfterEnter);
    });
  },
};
