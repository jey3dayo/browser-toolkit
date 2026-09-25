import { describe, expect, it } from "vitest";
import { parseNumericValue } from "@/utils/number_parser";

describe("parseNumericValue", () => {
  describe("通貨記号付き数値", () => {
    it("日本円（後置）", () => {
      expect(parseNumericValue("935円")).toBe(935);
      expect(parseNumericValue("254,079円")).toBe(254_079);
      expect(parseNumericValue("1,000,000円")).toBe(1_000_000);
    });

    it("日本円（前置）", () => {
      expect(parseNumericValue("¥935")).toBe(935);
      expect(parseNumericValue("¥254,079")).toBe(254_079);
    });

    it("ドル", () => {
      expect(parseNumericValue("$1,234.56")).toBe(1234.56);
      expect(parseNumericValue("$1000")).toBe(1000);
    });

    it("その他の通貨", () => {
      expect(parseNumericValue("€1,234.56")).toBe(1234.56);
      expect(parseNumericValue("£999.99")).toBe(999.99);
      expect(parseNumericValue("1,234元")).toBe(1234);
    });
  });

  describe("カンマ区切り数値", () => {
    it("整数", () => {
      expect(parseNumericValue("1,000")).toBe(1000);
      expect(parseNumericValue("1,000,000")).toBe(1_000_000);
      expect(parseNumericValue("123,456,789")).toBe(123_456_789);
    });

    it("小数", () => {
      expect(parseNumericValue("1,234.56")).toBe(1234.56);
      expect(parseNumericValue("999,999.99")).toBe(999_999.99);
    });
  });

  describe("通常の数値", () => {
    it("整数", () => {
      expect(parseNumericValue("123")).toBe(123);
      expect(parseNumericValue("0")).toBe(0);
    });

    it("小数", () => {
      expect(parseNumericValue("123.456")).toBe(123.456);
      expect(parseNumericValue("0.5")).toBe(0.5);
    });

    it("指数表記", () => {
      expect(parseNumericValue("1e3")).toBe(1000);
      expect(parseNumericValue("1.5e2")).toBe(150);
    });
  });

  describe("負の数", () => {
    it("通貨記号付き", () => {
      expect(parseNumericValue("-100円")).toBe(-100);
      expect(parseNumericValue("-$50.00")).toBe(-50);
    });

    it("カンマ区切り", () => {
      expect(parseNumericValue("-1,000")).toBe(-1000);
    });

    it("通常の数値", () => {
      expect(parseNumericValue("-123")).toBe(-123);
    });
  });

  describe("エッジケース", () => {
    it("空白を含む", () => {
      expect(parseNumericValue("  935円  ")).toBe(935);
      expect(parseNumericValue("$ 1,000")).toBe(1000);
    });

    it("空文字列", () => {
      expect(Number.isNaN(parseNumericValue(""))).toBe(true);
      expect(Number.isNaN(parseNumericValue("   "))).toBe(true);
    });

    it("数値でない文字列", () => {
      expect(Number.isNaN(parseNumericValue("abc"))).toBe(true);
      expect(Number.isNaN(parseNumericValue("価格未定"))).toBe(true);
      expect(Number.isNaN(parseNumericValue("N/A"))).toBe(true);
    });
  });
});
