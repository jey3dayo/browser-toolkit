import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Select, type SelectOption } from "@/components/shared/Select";

const OPTIONS: SelectOption[] = [
  { label: "GPT-4o", value: "gpt-4o" },
  { label: "GPT-4o mini", value: "gpt-4o-mini" },
];

const TRIGGER_TEST_ID = "select-story-trigger";

type SelectStoryProps = {
  variant: "pattern" | "token";
};

function SelectStory({ variant }: SelectStoryProps): React.JSX.Element {
  const [value, setValue] = useState<string | null>(OPTIONS[0].value);

  return (
    <Select
      ariaLabel="モデル"
      name="model"
      onValueChange={setValue}
      options={OPTIONS}
      triggerTestId={TRIGGER_TEST_ID}
      value={value}
      variant={variant}
    />
  );
}

function SelectResizeStory(): React.JSX.Element {
  const [value, setValue] = useState<string | null>(OPTIONS[0].value);

  return (
    <div style={{ paddingBottom: 400, paddingTop: 400 }}>
      <Select
        ariaLabel="モデル"
        name="model"
        onValueChange={setValue}
        options={OPTIONS}
        triggerTestId={TRIGGER_TEST_ID}
        value={value}
        variant="token"
      />
    </div>
  );
}

function getPopup(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(".mbu-select-popup");
}

function getItems(): HTMLElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>(".mbu-select-item")
  );
}

const meta = {
  argTypes: {
    variant: { control: false },
  },
  component: SelectStory,
  tags: ["test"],
  title: "Components/Shared/Select",
} satisfies Meta<typeof SelectStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Token: Story = {
  args: {
    variant: "token",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId(TRIGGER_TEST_ID);

    expect(trigger.className).toContain("token-input");
    expect(trigger.getAttribute("aria-expanded")).not.toBe("true");

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    });

    const popup = await waitFor(() => {
      const el = getPopup();
      if (!el) {
        throw new Error("select popup not found");
      }
      return el;
    });

    const rect = popup.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);

    const items = getItems();
    expect(items).toHaveLength(OPTIONS.length);

    const secondItem = items.find((item) =>
      item.textContent?.includes("GPT-4o mini")
    );
    if (!secondItem) {
      throw new Error("second option not found");
    }
    await userEvent.click(secondItem);

    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).not.toBe("true");
    });
    expect(trigger.textContent).toContain("GPT-4o mini");
  },
};

export const Pattern: Story = {
  args: {
    variant: "pattern",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId(TRIGGER_TEST_ID);

    expect(trigger.className).toContain("pattern-input");

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    });

    const popup = await waitFor(() => {
      const el = getPopup();
      if (!el) {
        throw new Error("select popup not found");
      }
      return el;
    });

    const rect = popup.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(getItems()).toHaveLength(OPTIONS.length);
  },
};

export const SurvivesWindowResize: Story = {
  args: {
    variant: "token",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId(TRIGGER_TEST_ID);

    await userEvent.click(trigger);

    await waitFor(() => {
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    });

    await waitFor(() => {
      const el = getPopup();
      if (!el) {
        throw new Error("select popup not found");
      }
      return el;
    });

    window.dispatchEvent(new Event("resize"));

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const popup = getPopup();
    if (!popup) {
      throw new Error("select popup closed after window resize");
    }
    const rect = popup.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  },
  render: () => <SelectResizeStory />,
};
