import type { Meta, StoryObj } from "@storybook/react-vite";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { expect, fn, waitFor } from "storybook/test";
import type { ChatMessage } from "@/background/runtime_types";
import { ensureShadowUiBaseStyles } from "@/ui/styles";
import { applyTheme, isTheme, type Theme } from "@/ui/theme";
import { OverlayChatInput } from "./OverlayComponents";

const HISTORY_MESSAGES: ChatMessage[] = [
  { content: "この要約をもう少し短くできますか？", role: "user" },
  {
    content: "はい、要点を3行にまとめました。必要なら箇条書きにもできます。",
    role: "assistant",
  },
];

type OverlayChatInputStoryArgs = {
  chatMessages: ChatMessage[];
  isChatting: boolean;
  onSend: (text: string) => void;
};

function OverlayChatInputStory(
  args: OverlayChatInputStoryArgs
): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [mount, setMount] = useState<{
    shadow: ShadowRoot;
    root: HTMLDivElement;
  } | null>(null);

  const docTheme = document.documentElement.getAttribute("data-theme");
  const resolvedTheme: Theme = isTheme(docTheme) ? docTheme : "auto";

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }

    host.id = "overlay-chat-input-story";
    host.style.position = "relative";
    host.style.width = "min(560px, calc(100vw - 32px))";

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    ensureShadowUiBaseStyles(shadow);

    const existingRoot = shadow.getElementById("browser-toolkit-overlay-root");
    const rootEl =
      existingRoot instanceof HTMLDivElement
        ? existingRoot
        : document.createElement("div");
    rootEl.id = "browser-toolkit-overlay-root";
    rootEl.className = "mbu-overlay-panel";
    if (rootEl !== existingRoot) {
      shadow.appendChild(rootEl);
    }

    setMount({ root: rootEl, shadow });

    return () => {
      setMount(null);
    };
  }, []);

  useLayoutEffect(() => {
    if (!mount) {
      return;
    }

    applyTheme(resolvedTheme, mount.shadow);
  }, [mount, resolvedTheme]);

  return (
    <>
      <div ref={hostRef} />
      {mount
        ? createPortal(
            <OverlayChatInput
              chatMessages={args.chatMessages}
              isChatting={args.isChatting}
              onSend={args.onSend}
            />,
            mount.root
          )
        : null}
    </>
  );
}

const meta = {
  argTypes: {
    chatMessages: { control: false },
    isChatting: { control: false },
    onSend: { control: false },
  },
  component: OverlayChatInputStory,
  tags: ["test"],
  title: "Content/Overlay/App/フォローアップチャット",
} satisfies Meta<typeof OverlayChatInputStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithHistoryThinking: Story = {
  args: {
    chatMessages: HISTORY_MESSAGES,
    isChatting: true,
    onSend: fn(),
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const shadow =
        canvasElement.querySelector<HTMLDivElement>("#overlay-chat-input-story")
          ?.shadowRoot ?? null;
      expect(shadow?.querySelector(".mbu-overlay-loader-grid")).toBeTruthy();
    });

    const shadow =
      canvasElement.querySelector<HTMLDivElement>("#overlay-chat-input-story")
        ?.shadowRoot ?? null;
    expect(shadow?.querySelectorAll(".mbu-overlay-loader-grid").length).toBe(1);
    const sendButton = shadow?.querySelector(
      ".mbu-overlay-chat-input-row button"
    );
    expect(sendButton).toBeTruthy();
  },
};

export const WithHistoryIdle: Story = {
  args: {
    chatMessages: HISTORY_MESSAGES,
    isChatting: false,
    onSend: fn(),
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => {
      const shadow =
        canvasElement.querySelector<HTMLDivElement>("#overlay-chat-input-story")
          ?.shadowRoot ?? null;
      expect(shadow?.querySelector(".mbu-overlay-chat-input-row")).toBeTruthy();
    });

    const shadow =
      canvasElement.querySelector<HTMLDivElement>("#overlay-chat-input-story")
        ?.shadowRoot ?? null;
    expect(shadow?.querySelector(".mbu-overlay-loader-grid")).toBeNull();
    const chatRow = shadow?.querySelector(".mbu-overlay-chat-input-row");
    const sendButton = shadow?.querySelector(
      ".mbu-overlay-chat-input-row button"
    );
    expect(sendButton).toBeTruthy();
    if (!(chatRow && sendButton)) {
      throw new Error("chat composer controls not found");
    }
    const chatRowRect = chatRow.getBoundingClientRect();
    const sendRect = sendButton.getBoundingClientRect();
    expect(sendRect.right).toBeLessThanOrEqual(chatRowRect.right);
    expect(sendRect.left).toBeGreaterThanOrEqual(chatRowRect.left);

    const userBubble = shadow?.querySelector(".mbu-overlay-chat-message--user");
    const userItem = userBubble?.parentElement;
    if (!(userBubble && userItem)) {
      throw new Error("user message bubble not found");
    }
    const bubbleRect = userBubble.getBoundingClientRect();
    const itemRect = userItem.getBoundingClientRect();
    expect(bubbleRect.right).toBeCloseTo(itemRect.right, 0);
    expect(bubbleRect.left).toBeGreaterThan(itemRect.left);
  },
};
