import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { TabsRoot } from "@/components/shared/Tabs";
import { Sidebar } from "@/popup/components/Sidebar";
import type { PaneId } from "@/popup/panes";

function SidebarReference({
  initialMenuOpen = false,
  initialPane = "pane-actions",
}: {
  initialMenuOpen?: boolean;
  initialPane?: PaneId;
}): React.JSX.Element {
  const [currentPane, setCurrentPane] = useState<PaneId>(initialPane);
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);

  return (
    <TabsRoot
      onValueChange={(value) => setCurrentPane(value as PaneId)}
      value={currentPane}
    >
      <div
        className="app-shell mbu-surface"
        style={{
          gridTemplateColumns: "minmax(0, 1fr) var(--rail)",
          height: 600,
          maxWidth: 800,
          minHeight: 0,
        }}
      >
        <main className="content">
          <div className="content-header">
            <div className="title-block">
              <div className="hero-logo-wrap" />
              <div className="title-text">
                <div className="title-row">
                  <h1>Browser Toolkit</h1>
                </div>
              </div>
            </div>
          </div>
          <div className="content-body">
            <section className="card card-stack">
              <h2 className="pane-title">Sidebar reference</h2>
              <p className="hint">
                58px rail、下部設定、224px drawer の基準表示。
              </p>
            </section>
          </div>
        </main>
        <Sidebar
          currentPane={currentPane}
          menuOpen={menuOpen}
          onMenuOpenChange={setMenuOpen}
          onNavigate={setCurrentPane}
        />
      </div>
    </TabsRoot>
  );
}

const meta = {
  title: "Popup/Components/Sidebar",
  component: SidebarReference,
  tags: ["test"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SidebarReference>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rail: Story = {
  play: ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByRole("button", { name: "メニュー" })).toBeTruthy();
    expect(canvas.getByRole("tab", { name: "設定" })).toBeTruthy();
  },
};

export const DrawerOpen: Story = {
  args: {
    initialMenuOpen: true,
    initialPane: "pane-settings",
  },
  play: async ({ canvasElement }) => {
    const closeButton = within(canvasElement.ownerDocument.body).getByLabelText(
      "閉じる"
    );
    expect(closeButton).toBeTruthy();

    await userEvent.click(closeButton);
    expect(
      canvasElement.ownerDocument.body.classList.contains("menu-open")
    ).toBe(false);
  },
};
