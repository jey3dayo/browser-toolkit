import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { CheckboxInline } from "@/components/shared/Checkbox";
import { Field } from "@/components/shared/Field";
import { Fieldset } from "@/components/shared/Fieldset";
import { Input, InputWithIcon } from "@/components/shared/Input";
import { ButtonRow, PaneCard, Stack } from "@/components/shared/Layout";
import { RadioFieldset } from "@/components/shared/RadioFieldset";
import { Select } from "@/components/shared/Select";
import { Separator } from "@/components/shared/Separator";
import { SwitchField } from "@/components/shared/SwitchField";
import { Textarea } from "@/components/shared/Textarea";
import { Toggle } from "@/components/shared/Toggle";
import { Hint, PaneTitle } from "@/components/shared/Typography";

const colorTokens = [
  ["Primary", "--color-primary"],
  ["Primary Alt", "--color-primary-2"],
  ["Surface", "--color-surface"],
  ["Raised", "--color-surface-2"],
  ["Border", "--color-border"],
  ["Text", "--color-text"],
  ["Muted", "--color-text-muted"],
  ["Danger", "--color-danger"],
] as const;

function ReferenceSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.JSX.Element {
  return (
    <section className="card card-stack" data-testid="reference-section">
      <div className="row-between">
        <PaneTitle>{title}</PaneTitle>
        <Badge variant="chipSoft">reference</Badge>
      </div>
      {children}
    </section>
  );
}

function ColorSwatches(): React.JSX.Element {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
      }}
    >
      {colorTokens.map(([label, token]) => (
        <div
          key={token}
          style={{
            display: "grid",
            gap: 8,
            minWidth: 0,
            padding: 10,
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              height: 38,
              background: `var(${token})`,
              border: "1px solid var(--color-border-ui)",
              borderRadius: "var(--radius-sm)",
            }}
          />
          <strong style={{ fontSize: 12 }}>{label}</strong>
          <code style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
            {token}
          </code>
        </div>
      ))}
    </div>
  );
}

function ControlMatrix(): React.JSX.Element {
  const tokenId = useId();
  const promptId = useId();
  const [showToken, setShowToken] = useState(false);
  const [model, setModel] = useState<string | null>("gpt-5.4");
  const [provider, setProvider] = useState("openai");

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      }}
    >
      <PaneCard className="settings-pane-card">
        <Fieldset legend="Buttons" spacing="stack">
          <ButtonRow>
            <Button variant="primary">保存</Button>
            <Button variant="ghost">確認</Button>
            <Button variant="danger">削除</Button>
          </ButtonRow>
          <ButtonRow>
            <Button disabled variant="primary">
              Disabled
            </Button>
            <Button size="small" variant="ghost">
              Small
            </Button>
          </ButtonRow>
        </Fieldset>
      </PaneCard>

      <PaneCard className="settings-pane-card">
        <Fieldset legend="Inputs" spacing="stack">
          <Field htmlFor={tokenId} label="トークン">
            <InputWithIcon>
              <Input
                id={tokenId}
                readOnly
                type={showToken ? "text" : "password"}
                value="sk-story-reference"
                variant="token"
                withIcon
              />
              <Toggle
                aria-label="トークン表示"
                onPressedChange={setShowToken}
                pressed={showToken}
                type="button"
                variant="icon"
              >
                <Icon aria-hidden="true" name={showToken ? "eye-off" : "eye"} />
              </Toggle>
            </InputWithIcon>
          </Field>
          <Field htmlFor={promptId} label="カスタムプロンプト">
            <Textarea
              id={promptId}
              readOnly
              rows={3}
              value="日本語で要点を整理してください"
              variant="prompt"
            />
          </Field>
        </Fieldset>
      </PaneCard>

      <PaneCard className="settings-pane-card">
        <Fieldset legend="Choice controls" spacing="stack">
          <RadioFieldset
            groups={[
              {
                className: "settings-provider-options",
                options: [
                  { label: "OpenAI", value: "openai" },
                  { label: "Anthropic", value: "anthropic" },
                  { label: "z.ai", value: "zai" },
                ],
                testId: "provider-reference-options",
              },
            ]}
            legend="AIプロバイダー"
            name="referenceProvider"
            onValueChange={setProvider}
            value={provider}
          />
          <Field label="モデル">
            <Select
              ariaLabel="モデル"
              onValueChange={setModel}
              options={[
                { label: "gpt-5.4", value: "gpt-5.4" },
                { label: "gpt-5.4-mini", value: "gpt-5.4-mini" },
                { label: "claude-sonnet", value: "claude-sonnet" },
              ]}
              value={model}
              variant="token"
            />
          </Field>
          <CheckboxInline defaultChecked id="reference-checkbox">
            自動で有効化
          </CheckboxInline>
          <SwitchField defaultChecked id="reference-switch" label="通知" />
        </Fieldset>
      </PaneCard>
    </div>
  );
}

function NavigationReference(): React.JSX.Element {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "58px minmax(180px, 224px) minmax(0, 1fr)",
      }}
    >
      <div
        className="sidebar"
        style={{ height: 360, position: "relative", width: "var(--rail)" }}
      >
        <button className="sidebar-brand" type="button">
          <Icon aria-hidden="true" name="menu" />
        </button>
        <div role="tablist">
          {(["zap", "calendar", "table", "link", "settings"] as const).map(
            (name, index) => (
              <button
                aria-selected={index === 0}
                className="nav-item"
                data-tooltip={name}
                key={name}
                role="tab"
                type="button"
              >
                <span className="nav-icon">
                  <Icon aria-hidden="true" name={name} />
                </span>
              </button>
            )
          )}
        </div>
      </div>

      <div
        className="menu-drawer"
        style={{
          bottom: "auto",
          height: 360,
          opacity: 1,
          pointerEvents: "auto",
          position: "relative",
          right: "auto",
          top: "auto",
          visibility: "visible",
          width: "min(var(--drawer), 100%)",
        }}
      >
        <div className="menu-drawer-header">
          <button aria-label="閉じる" className="menu-close" type="button">
            <Icon aria-hidden="true" name="close" />
          </button>
        </div>
        <nav className="menu-drawer-nav">
          {[
            ["zap", "アクション"],
            ["calendar", "カレンダー登録"],
            ["table", "サイト別機能"],
            ["link", "リンク作成"],
          ].map(([name, label], index) => (
            <button
              aria-current={index === 0 ? "page" : undefined}
              className={`menu-item${index === 0 ? "active" : ""}`}
              key={label}
              type="button"
            >
              <span className="menu-icon">
                <Icon aria-hidden="true" name={name as "zap"} />
              </span>
              {label}
            </button>
          ))}
        </nav>
        <nav className="menu-drawer-footer">
          <button className="menu-item" type="button">
            <span className="menu-icon">
              <Icon aria-hidden="true" name="settings" />
            </span>
            設定
          </button>
        </nav>
      </div>

      <PaneCard className="settings-surface settings-pane">
        <div className="settings-pane-overview">
          <PaneTitle>Navigation rules</PaneTitle>
          <Hint>
            Rail は icon-only、drawer は compact list。設定は下部へ分離する。
          </Hint>
        </div>
        <Separator />
        <Hint>
          Active state は primary tint と indicator
          を併用し、色だけに依存しない。
        </Hint>
      </PaneCard>
    </div>
  );
}

function DesignSystemReference(): React.JSX.Element {
  return (
    <main className="card-stack" data-testid="design-system-reference">
      <ReferenceSection title="Tokens">
        <ColorSwatches />
      </ReferenceSection>
      <ReferenceSection title="Typography">
        <Stack>
          <PaneTitle>Pane title / 16px / weight 700</PaneTitle>
          <Hint>
            Hint text keeps descriptions compact and should avoid wide line
            lengths inside cards.
          </Hint>
          <p className="field-name">Field label / 12px / muted</p>
        </Stack>
      </ReferenceSection>
      <ReferenceSection title="Controls">
        <ControlMatrix />
      </ReferenceSection>
      <ReferenceSection title="Navigation">
        <NavigationReference />
      </ReferenceSection>
    </main>
  );
}

const meta = {
  title: "Design System/Reference",
  component: DesignSystemReference,
  tags: ["test"],
} satisfies Meta<typeof DesignSystemReference>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getByTestId("design-system-reference")).toBeTruthy();
    expect(canvas.getAllByTestId("reference-section")).toHaveLength(4);

    await userEvent.click(canvas.getByRole("button", { name: "トークン表示" }));
    expect(canvas.getByDisplayValue("sk-story-reference")).toBeTruthy();
  },
};
