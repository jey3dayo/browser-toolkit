import { describe, expect, it } from "vitest";
import { isLightboxRoute, toOriginalUrl } from "@/image-zoom/x-adapter";

describe("image-zoom x-adapter: isLightboxRoute", () => {
  it("accepts the X photo lightbox route", () => {
    expect(isLightboxRoute("/someuser/status/12345/photo/1")).toBe(true);
    expect(isLightboxRoute("/someuser/status/12345/photo/2/")).toBe(true);
  });

  it("rejects non-lightbox routes", () => {
    expect(isLightboxRoute("/someuser/status/12345")).toBe(false);
    expect(isLightboxRoute("/home")).toBe(false);
    expect(isLightboxRoute("/someuser/status/12345/photo/")).toBe(false);
  });
});

describe("image-zoom x-adapter: toOriginalUrl", () => {
  it("converts an observed media URL to name=orig, keeping format", () => {
    const input = "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=large";
    expect(toOriginalUrl(input)).toBe(
      "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=orig"
    );
  });

  it("returns null for a profile image URL", () => {
    expect(
      toOriginalUrl("https://pbs.twimg.com/profile_images/123/avatar.jpg")
    ).toBeNull();
  });

  it("returns null for a card image URL", () => {
    expect(
      toOriginalUrl("https://pbs.twimg.com/card_img/123/abc?format=jpg")
    ).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(toOriginalUrl("not a url")).toBeNull();
  });

  it("returns null for an emoji sprite from another host", () => {
    expect(
      toOriginalUrl("https://abs-0.twimg.com/emoji/v2/svg/1f600.svg")
    ).toBeNull();
  });
});
