import { afterEach, describe, expect, it, vi } from "vitest";
import Encoding from "encoding-japanese";

import { encodeShiftJisQuery } from "@/utils/encoding";

const toUpperHex = (bytes: number[]): string =>
  bytes
    .map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`)
    .join("");

describe("utils/encoding", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("percent-encodes SJIS bytes", () => {
    vi.spyOn(Encoding, "convert").mockReturnValue([0x82, 0xa0]);

    expect(encodeShiftJisQuery("あ")).toBe(toUpperHex([0x82, 0xa0]));
  });

  it("falls back to encodeURIComponent when conversion fails", () => {
    vi.spyOn(Encoding, "convert").mockReturnValue(null as never);

    const query = "テスト";
    expect(encodeShiftJisQuery(query)).toBe(encodeURIComponent(query));
  });

  it("filters invalid bytes from conversion result", () => {
    vi.spyOn(Encoding, "convert").mockReturnValue([
      0x82,
      -1,
      256,
      "bad",
      0xa0,
    ] as never);

    expect(encodeShiftJisQuery("あ")).toBe(toUpperHex([0x82, 0xa0]));
  });
});
