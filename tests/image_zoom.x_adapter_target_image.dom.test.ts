import { describe, expect, it } from "vitest";
import { isTargetImage } from "@/image-zoom/x-adapter";

describe("image-zoom x-adapter: isTargetImage", () => {
  it("rejects non-image values", () => {
    expect(isTargetImage(document.createElement("div"))).toBe(false);
    expect(isTargetImage(null)).toBe(false);
  });

  it("accepts an <img> whose src is a media URL", () => {
    const img = document.createElement("img");
    img.src = "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=large";
    expect(isTargetImage(img)).toBe(true);
  });

  it("rejects an <img> whose src is an emoji sprite from another host", () => {
    const img = document.createElement("img");
    img.src = "https://abs-0.twimg.com/emoji/v2/svg/1f600.svg";
    expect(isTargetImage(img)).toBe(false);
  });

  it("rejects an <img> whose src is a profile image", () => {
    const img = document.createElement("img");
    img.src = "https://pbs.twimg.com/profile_images/123/avatar.jpg";
    expect(isTargetImage(img)).toBe(false);
  });
});
