import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import { parseRunContextActionResponseToOutput } from "@/popup/panes/ActionsPane";

describe("parseRunContextActionResponseToOutput", () => {
  it("returns error when response format is invalid (not a record)", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "テストアクション",
      responseUnknown: null,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("バックグラウンドの応答が不正です");
    }
  });

  it("returns error when response format is invalid (missing ok field)", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "テストアクション",
      responseUnknown: { data: "something" },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("バックグラウンドの応答が不正です");
    }
  });

  it("returns error when response.ok === false with error message", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "テストアクション",
      responseUnknown: {
        ok: false,
        error: "カスタムエラーメッセージ",
      },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("カスタムエラーメッセージ");
    }
  });

  it("returns error when response.ok === false without error message", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "テストアクション",
      responseUnknown: {
        ok: false,
      },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("実行に失敗しました");
    }
  });

  it("returns success with text type result", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "要約",
      responseUnknown: {
        ok: true,
        resultType: "text",
        text: "テキスト結果",
        source: "selection",
      },
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({
        status: "ready",
        title: "要約",
        text: "テキスト結果",
        sourceLabel: "選択範囲",
      });
    }
  });

  it("returns success with event type result", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "予定抽出",
      responseUnknown: {
        ok: true,
        resultType: "event",
        eventText: "2024-12-25 14:00 クリスマスパーティー",
        source: "page",
      },
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({
        status: "ready",
        title: "予定抽出",
        text: "2024-12-25 14:00 クリスマスパーティー",
        sourceLabel: "ページ本文",
      });
    }
  });

  it("returns error when eventText is not a string for event type", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "予定抽出",
      responseUnknown: {
        ok: true,
        resultType: "event",
        eventText: null,
        source: "selection",
      },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("イベント結果が不正です");
    }
  });

  it("returns error when eventText is missing for event type", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "予定抽出",
      responseUnknown: {
        ok: true,
        resultType: "event",
        source: "selection",
      },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("イベント結果が不正です");
    }
  });

  it("returns error when text is not a string for text type", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "要約",
      responseUnknown: {
        ok: true,
        resultType: "text",
        text: 123,
        source: "selection",
      },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("テキスト結果が不正です");
    }
  });

  it("returns error when text is missing for text type", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "要約",
      responseUnknown: {
        ok: true,
        resultType: "text",
        source: "selection",
      },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("テキスト結果が不正です");
    }
  });

  it("returns error when resultType is invalid", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "テストアクション",
      responseUnknown: {
        ok: true,
        resultType: "invalid",
        text: "テキスト結果",
        source: "selection",
      },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("結果の形式が不正です");
    }
  });

  it("returns error when resultType is missing", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "テストアクション",
      responseUnknown: {
        ok: true,
        text: "テキスト結果",
        source: "selection",
      },
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("結果の形式が不正です");
    }
  });

  it("handles missing source field gracefully with default label", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "要約",
      responseUnknown: {
        ok: true,
        resultType: "text",
        text: "テキスト結果",
      },
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.sourceLabel).toBe("-");
    }
  });

  it("handles unknown source value gracefully with default label", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "要約",
      responseUnknown: {
        ok: true,
        resultType: "text",
        text: "テキスト結果",
        source: "unknown-source",
      },
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.sourceLabel).toBe("-");
    }
  });
});
