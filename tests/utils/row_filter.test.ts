import { describe, expect, it } from "vitest";
import { parseNumericValue } from "@/utils/number_parser";
import { shouldHideRow } from "@/utils/row_filter";

describe("shouldHideRow", () => {
  describe("ゼロ値のフィルタリング", () => {
    it("0円 を非表示対象とする", () => {
      expect(shouldHideRow("0円", parseNumericValue)).toBe(true);
    });

    it("¥0 を非表示対象とする", () => {
      expect(shouldHideRow("¥0", parseNumericValue)).toBe(true);
    });

    it("$0.00 を非表示対象とする", () => {
      expect(shouldHideRow("$0.00", parseNumericValue)).toBe(true);
    });

    it("0 を非表示対象とする", () => {
      expect(shouldHideRow("0", parseNumericValue)).toBe(true);
    });

    it("100円 は表示対象とする", () => {
      expect(shouldHideRow("100円", parseNumericValue)).toBe(false);
    });
  });

  describe("ハイフンのフィルタリング", () => {
    it('ASCII ハイフン "-" を非表示対象とする', () => {
      expect(shouldHideRow("-", parseNumericValue)).toBe(true);
    });

    it('Unicode ハイフン "−" (U+2212) を非表示対象とする', () => {
      expect(shouldHideRow("−", parseNumericValue)).toBe(true);
    });

    it("前後の空白を含むハイフンを非表示対象とする", () => {
      expect(shouldHideRow("  -  ", parseNumericValue)).toBe(true);
    });

    it("ハイフンを含む文字列（-100）は表示対象とする", () => {
      expect(shouldHideRow("-100", parseNumericValue)).toBe(false);
    });

    it("負の数値（-100円）は表示対象とする", () => {
      expect(shouldHideRow("-100円", parseNumericValue)).toBe(false);
    });
  });

  describe("空白/N/Aのフィルタリング", () => {
    it("空文字列を非表示対象とする", () => {
      expect(shouldHideRow("", parseNumericValue)).toBe(true);
    });

    it("空白のみの文字列を非表示対象とする", () => {
      expect(shouldHideRow("   ", parseNumericValue)).toBe(true);
    });

    it("N/A を非表示対象とする（大文字小文字不問）", () => {
      expect(shouldHideRow("N/A", parseNumericValue)).toBe(true);
      expect(shouldHideRow("n/a", parseNumericValue)).toBe(true);
      expect(shouldHideRow("N/a", parseNumericValue)).toBe(true);
    });

    it("null を非表示対象とする", () => {
      expect(shouldHideRow("null", parseNumericValue)).toBe(true);
      expect(shouldHideRow("NULL", parseNumericValue)).toBe(true);
    });

    it("undefined を非表示対象とする", () => {
      expect(shouldHideRow("undefined", parseNumericValue)).toBe(true);
      expect(shouldHideRow("UNDEFINED", parseNumericValue)).toBe(true);
    });
  });

  describe("エッジケース", () => {
    it("通常のテキスト（abc）は表示対象とする", () => {
      expect(shouldHideRow("abc", parseNumericValue)).toBe(false);
    });

    it("数値文字列（123）は表示対象とする", () => {
      expect(shouldHideRow("123", parseNumericValue)).toBe(false);
    });

    it("負の数値（-123）は表示対象とする", () => {
      expect(shouldHideRow("-123", parseNumericValue)).toBe(false);
    });

    it("通常の金額（935円）は表示対象とする", () => {
      expect(shouldHideRow("935円", parseNumericValue)).toBe(false);
    });

    it("カンマ区切り金額（254,079円）は表示対象とする", () => {
      expect(shouldHideRow("254,079円", parseNumericValue)).toBe(false);
    });
  });
});
