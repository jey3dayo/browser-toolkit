import { Result } from "@praha/byethrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { executeContextAction } from "@/background/action_executor";
import { t } from "@/i18n";
import {
  actionTarget,
  createContextActionHarness,
  eventAction,
  eventDisplayText,
  extractedEvent,
  textAction,
} from "../helpers/contextActionHarness";

describe("executeContextAction", () => {
  let harness: ReturnType<typeof createContextActionHarness>;

  beforeEach(() => {
    harness = createContextActionHarness();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns typed text output and renders the prompt using the resolved target", async () => {
    harness.respondWithText("Summary");

    const result = await executeContextAction({
      action: textAction,
      target: actionTarget,
    });

    expect(result).toStrictEqual(
      Result.succeed({ kind: "text", source: "selection", text: "Summary" })
    );
    expect(harness.fetch).toHaveBeenCalledTimes(1);
    expect(harness.sentBody()).toMatchObject({
      messages: [
        { role: "system" },
        {
          content:
            "Summarize Release planning from Team notes (selection) at https://example.com/notes",
          role: "user",
        },
      ],
    });
    expect(harness.notifications.create).not.toHaveBeenCalled();
    expect(harness.chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });

  it("rejects a blank text prompt before contacting a provider", async () => {
    const result = await executeContextAction({
      action: { ...textAction, prompt: " \n\t " },
      target: actionTarget,
    });

    expect(result).toStrictEqual(
      Result.fail(t("background.actionExecutor.emptyPrompt"))
    );
    expect(harness.fetch).not.toHaveBeenCalled();
  });

  it("returns structured event output and formatted display text without extra instructions", async () => {
    harness.respondWithText(JSON.stringify(extractedEvent));

    const result = await executeContextAction({
      action: { ...eventAction, prompt: " \n " },
      target: { ...actionTarget, source: "page" },
    });

    expect(result).toEqual(
      Result.succeed({
        event: extractedEvent,
        kind: "event",
        source: "page",
        text: eventDisplayText,
      })
    );
    expect(harness.sentBody()).toMatchObject({
      messages: [
        {
          content: expect.not.stringContaining("このアクションの追加指示"),
          role: "system",
        },
        { role: "user" },
      ],
      response_format: { type: "json_object" },
    });
    expect(harness.fetch).toHaveBeenCalledTimes(1);
  });

  it("renders event instructions with clipped text and target metadata", async () => {
    harness.respondWithText(JSON.stringify(extractedEvent));

    await executeContextAction({
      action: {
        ...eventAction,
        prompt: "  {{title}} | {{url}} | {{source}} | {{text}}  ",
      },
      target: { ...actionTarget, text: "x".repeat(1300) },
    });

    expect(harness.sentBody()).toMatchObject({
      messages: [
        {
          content: expect.stringContaining(
            `このアクションの追加指示:\nTeam notes | https://example.com/notes | selection | ${"x".repeat(1200)}`
          ),
          role: "system",
        },
        { role: "user" },
      ],
    });
    expect(harness.sentBody()).toMatchObject({
      messages: [
        {
          content: expect.not.stringContaining("x".repeat(1201)),
          role: "system",
        },
        { role: "user" },
      ],
    });
  });

  it.each([textAction, eventAction])(
    "preserves provider failure for $kind without presentation side effects",
    async (action) => {
      harness.respondWithError("Provider rejected request");

      const result = await executeContextAction({
        action,
        target: actionTarget,
      });

      expect(result).toStrictEqual(Result.fail("Provider rejected request"));
      expect(harness.notifications.create).not.toHaveBeenCalled();
      expect(harness.chrome.tabs.sendMessage).not.toHaveBeenCalled();
    }
  );

  it("returns an event parsing failure instead of treating invalid JSON as text", async () => {
    harness.respondWithText("Not event JSON");

    const result = await executeContextAction({
      action: eventAction,
      target: actionTarget,
    });

    expect(result).toStrictEqual(
      Result.fail("イベント情報の解析に失敗しました")
    );
  });

  it.each([textAction, eventAction])(
    "leaves unexpected storage exceptions to the caller for $kind",
    async (action) => {
      harness.chrome.storage.local.get.mockImplementation(() => {
        throw new Error("Storage unavailable");
      });

      await expect(
        executeContextAction({ action, target: actionTarget })
      ).rejects.toThrow("Storage unavailable");
      expect(harness.fetch).not.toHaveBeenCalled();
    }
  );
});
