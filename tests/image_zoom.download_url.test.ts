import { Result } from "@praha/byethrow";
import { describe, expect, it } from "vitest";
import {
  parseDownloadImageRequest,
  validateTwimgMediaUrl,
} from "@/image-zoom/download-url";

describe("image-zoom download-url: validateTwimgMediaUrl (accepted)", () => {
  it("accepts a media URL and forces name=orig, keeping filename from id + format", () => {
    const result = validateTwimgMediaUrl(
      "https://pbs.twimg.com/media/AbCdEfGh12_-3?format=webp&name=large"
    );
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.originalUrl).toBe(
        "https://pbs.twimg.com/media/AbCdEfGh12_-3?format=webp&name=orig"
      );
      expect(result.value.filename).toBe("AbCdEfGh12_-3.webp");
    }
  });

  it("falls back to jpg when neither format param nor path extension is present", () => {
    const result = validateTwimgMediaUrl(
      "https://pbs.twimg.com/media/AbCdEfGh"
    );
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.filename).toBe("AbCdEfGh.jpg");
    }
  });

  it("derives the extension from a path suffix when format is absent", () => {
    const result = validateTwimgMediaUrl(
      "https://pbs.twimg.com/media/AbCdEfGh.png"
    );
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.filename).toBe("AbCdEfGh.png");
    }
  });
});

describe("image-zoom download-url: validateTwimgMediaUrl (rejected)", () => {
  const expectRejected = (url: string): void => {
    const result = validateTwimgMediaUrl(url);
    expect(Result.isFailure(result)).toBe(true);
  };

  it("rejects a lookalike host", () => {
    expectRejected("https://pbs.twimg.com.evil.com/media/AbCdEfGh");
  });

  it("rejects a similarly named host", () => {
    expectRejected("https://abs.twimg.com/media/AbCdEfGh");
  });

  it("rejects http (non-https) protocol", () => {
    expectRejected("http://pbs.twimg.com/media/AbCdEfGh");
  });

  it("rejects a card_img path", () => {
    expectRejected("https://pbs.twimg.com/card_img/123/AbCdEfGh?format=jpg");
  });

  it("rejects an ext_tw_video_thumb path", () => {
    expectRejected(
      "https://pbs.twimg.com/ext_tw_video_thumb/123/AbCdEfGh?format=jpg"
    );
  });

  it("rejects an id containing a literal ..", () => {
    expectRejected("https://pbs.twimg.com/media/..%2Fetc%2Fpasswd");
  });

  it("rejects an id containing an encoded slash", () => {
    expectRejected("https://pbs.twimg.com/media/abc%2Fdef");
  });

  it("rejects a disallowed format", () => {
    expectRejected("https://pbs.twimg.com/media/AbCdEfGh?format=svg");
  });

  it("rejects a malformed URL", () => {
    expectRejected("not a url");
  });
});

describe("image-zoom download-url: parseDownloadImageRequest", () => {
  it("accepts a well-formed downloadImage payload", () => {
    const parsed = parseDownloadImageRequest({
      action: "downloadImage",
      url: "https://pbs.twimg.com/media/AbCdEfGh",
    });
    expect(parsed).toEqual({
      action: "downloadImage",
      url: "https://pbs.twimg.com/media/AbCdEfGh",
    });
  });

  it("rejects a payload with a missing url", () => {
    expect(parseDownloadImageRequest({ action: "downloadImage" })).toBeNull();
  });

  it("rejects a payload with the wrong action", () => {
    expect(
      parseDownloadImageRequest({ action: "somethingElse", url: "x" })
    ).toBeNull();
  });

  it("rejects a non-object payload", () => {
    expect(parseDownloadImageRequest("not an object")).toBeNull();
    expect(parseDownloadImageRequest(null)).toBeNull();
  });
});
