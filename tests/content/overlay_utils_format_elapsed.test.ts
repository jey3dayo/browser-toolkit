import { describe, expect, it } from "vitest";
import { formatElapsed } from "@/content/overlay/overlayUtils";

describe("formatElapsed", () => {
  it("formats zero as 0.0秒", () => {
    expect(formatElapsed(0)).toBe("0.0秒");
  });

  it("formats sub-minute durations as N.N秒", () => {
    expect(formatElapsed(59_900)).toBe("59.9秒");
  });

  it("switches to the minute format exactly at the 60 second boundary (spec)", () => {
    expect(formatElapsed(60_000)).toBe("1分0.0秒");
  });

  it("formats multi-minute durations as M分N.N秒", () => {
    expect(formatElapsed(125_400)).toBe("2分5.4秒");
  });

  it("floors to tenths so values just under a minute never round up to 60.0秒", () => {
    expect(formatElapsed(59_990)).toBe("59.9秒");
  });
});
