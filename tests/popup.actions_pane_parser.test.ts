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

  it("returns error when response is a failure with error message", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "テストアクション",
      responseUnknown: Result.fail("カスタムエラーメッセージ"),
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("カスタムエラーメッセージ");
    }
  });

  it("returns success with text type result", () => {
    const result = parseRunContextActionResponseToOutput({
      actionTitle: "要約",
      responseUnknown: Result.succeed({
        resultType: "text",
        text: "テキスト結果",
        source: "selection",
      }),
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
      responseUnknown: Result.succeed({
        resultType: "event",
        eventText: "2024-12-25 14:00 クリスマスパーティー",
        source: "page",
      }),
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

  // Note: TypeScript type checking prevents invalid payload structures
  // inside Result.succeed(), so we only test runtime edge cases

  it("returns error when resultType is invalid (runtime type mismatch)", () => {
    // @ts-expect-error: Testing runtime behavior with invalid type
    const invalidResult = Result.succeed({
      resultType: "invalid",
      text: "テキスト結果",
      source: "selection",
    });

    const result = parseRunContextActionResponseToOutput({
      actionTitle: "テストアクション",
      responseUnknown: invalidResult,
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("結果の形式が不正です");
    }
  });

  it("handles missing source field gracefully with default label", () => {
    // @ts-expect-error: Testing runtime behavior with missing required field
    const resultWithMissingSource = Result.succeed({
      resultType: "text",
      text: "テキスト結果",
    });

    const result = parseRunContextActionResponseToOutput({
      actionTitle: "要約",
      responseUnknown: resultWithMissingSource,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.sourceLabel).toBe("-");
    }
  });

  it("handles unknown source value gracefully with default label", () => {
    // @ts-expect-error: Testing runtime behavior with invalid source value
    const resultWithUnknownSource = Result.succeed({
      resultType: "text",
      text: "テキスト結果",
      source: "unknown-source",
    });

    const result = parseRunContextActionResponseToOutput({
      actionTitle: "要約",
      responseUnknown: resultWithUnknownSource,
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.sourceLabel).toBe("-");
    }
  });
});
