import { cva, type VariantProps } from "class-variance-authority";

export const textSurfaceVariants = cva("", {
  variants: {
    size: {
      default: null,
      small: "summary-output--sm",
    },
    variant: {
      debugLog: "debug-log-output",
      overlayChat: "mbu-overlay-chat-input",
      overlayChatText: "mbu-overlay-chat-text",
      overlayPrimaryText: "mbu-overlay-primary-text",
      overlaySecondaryText: "mbu-overlay-secondary-text",
      pattern: "pattern-input",
      prompt: "prompt-input",
      summary: "summary-output",
    },
  },
});

export type TextSurfaceVariantProps = VariantProps<typeof textSurfaceVariants>;
