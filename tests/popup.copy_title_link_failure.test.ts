import { Result } from "@praha/byethrow";
import { describe, expect, it, vi } from "vitest";
import {
  coerceCopyTitleLinkFailure,
  loadCopyTitleLinkFailure,
} from "@/popup/copy-title-link-failure";
import type { CopyTitleLinkFailure } from "@/storage/types";

describe("coerceCopyTitleLinkFailure", () => {
  it("parses valid CopyTitleLinkFailure data", () => {
    const validData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: "Test Page",
      pageUrl: "https://example.com",
      text: "Test Page\nhttps://example.com",
      error: "Clipboard write failed",
      format: "text",
    };

    const result = coerceCopyTitleLinkFailure(validData);
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({
        occurredAt: validData.occurredAt,
        tabId: validData.tabId,
        pageTitle: validData.pageTitle,
        pageUrl: validData.pageUrl,
        text: validData.text,
        error: validData.error,
        format: "text",
      });
    }
  });

  it("parses valid data without format field", () => {
    const validData = {
      occurredAt: Date.now(),
      tabId: 456,
      pageTitle: "Another Page",
      pageUrl: "https://example.org",
      text: "[Another Page](https://example.org)",
      error: "Permission denied",
    };

    const result = coerceCopyTitleLinkFailure(validData);
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({
        occurredAt: validData.occurredAt,
        tabId: validData.tabId,
        pageTitle: validData.pageTitle,
        pageUrl: validData.pageUrl,
        text: validData.text,
        error: validData.error,
      });
      expect(result.value.format).toBeUndefined();
    }
  });

  it("parses valid data with invalid format (coerced to null, omitted)", () => {
    const validData = {
      occurredAt: Date.now(),
      tabId: 789,
      pageTitle: "Test",
      pageUrl: "https://test.com",
      text: "Test\nhttps://test.com",
      error: "Error",
      format: "invalid-format",
    };

    const result = coerceCopyTitleLinkFailure(validData);
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.format).toBeUndefined();
    }
  });

  it("fails when value is not an object", () => {
    const result = coerceCopyTitleLinkFailure("not an object");
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when value is null", () => {
    const result = coerceCopyTitleLinkFailure(null);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when occurredAt is missing", () => {
    const invalidData = {
      tabId: 123,
      pageTitle: "Test",
      pageUrl: "https://example.com",
      text: "Test",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when occurredAt is not a number", () => {
    const invalidData = {
      occurredAt: "not-a-number",
      tabId: 123,
      pageTitle: "Test",
      pageUrl: "https://example.com",
      text: "Test",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when tabId is missing", () => {
    const invalidData = {
      occurredAt: Date.now(),
      pageTitle: "Test",
      pageUrl: "https://example.com",
      text: "Test",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when tabId is not a number", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: "not-a-number",
      pageTitle: "Test",
      pageUrl: "https://example.com",
      text: "Test",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when pageTitle is missing", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageUrl: "https://example.com",
      text: "Test",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when pageTitle is not a string", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: 123,
      pageUrl: "https://example.com",
      text: "Test",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when pageUrl is missing", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: "Test",
      text: "Test",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when pageUrl is not a string", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: "Test",
      pageUrl: 123,
      text: "Test",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when text is missing", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: "Test",
      pageUrl: "https://example.com",
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when text is not a string", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: "Test",
      pageUrl: "https://example.com",
      text: 123,
      error: "Error",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when error is missing", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: "Test",
      pageUrl: "https://example.com",
      text: "Test",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when error is not a string", () => {
    const invalidData = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: "Test",
      pageUrl: "https://example.com",
      text: "Test",
      error: 123,
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });
});

describe("loadCopyTitleLinkFailure", () => {
  it("returns 'none' when data does not exist in storage", async () => {
    const storageLocalGet = vi.fn(async () => Result.succeed({}));

    const result = await loadCopyTitleLinkFailure({ storageLocalGet });
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("none");
    }

    expect(storageLocalGet).toHaveBeenCalledWith(["lastCopyTitleLinkFailure"]);
  });

  it("returns 'storage-error' when storage access fails", async () => {
    const storageLocalGet = vi.fn(async () =>
      Result.fail("storage operation failed")
    );

    const result = await loadCopyTitleLinkFailure({ storageLocalGet });
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("storage-error");
    }

    expect(storageLocalGet).toHaveBeenCalledWith(["lastCopyTitleLinkFailure"]);
  });

  it("returns 'invalid' when stored data format is invalid", async () => {
    const invalidData = {
      lastCopyTitleLinkFailure: {
        occurredAt: "not-a-number",
        tabId: 123,
        pageTitle: "Test",
        pageUrl: "https://example.com",
        text: "Test",
        error: "Error",
      },
    };
    const storageLocalGet = vi.fn(async () => Result.succeed(invalidData));

    const result = await loadCopyTitleLinkFailure({ storageLocalGet });
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }

    expect(storageLocalGet).toHaveBeenCalledWith(["lastCopyTitleLinkFailure"]);
  });

  it("returns valid CopyTitleLinkFailure when data is correct", async () => {
    const validData: CopyTitleLinkFailure = {
      occurredAt: Date.now(),
      tabId: 123,
      pageTitle: "Test Page",
      pageUrl: "https://example.com",
      text: "Test Page\nhttps://example.com",
      error: "Clipboard write failed",
      format: "text",
    };
    const storageLocalGet = vi.fn(async () =>
      Result.succeed({ lastCopyTitleLinkFailure: validData })
    );

    const result = await loadCopyTitleLinkFailure({ storageLocalGet });
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual(validData);
    }

    expect(storageLocalGet).toHaveBeenCalledWith(["lastCopyTitleLinkFailure"]);
  });

  it("returns valid CopyTitleLinkFailure without format field", async () => {
    const validData = {
      occurredAt: Date.now(),
      tabId: 456,
      pageTitle: "Another Page",
      pageUrl: "https://example.org",
      text: "[Another Page](https://example.org)",
      error: "Permission denied",
    };
    const storageLocalGet = vi.fn(async () =>
      Result.succeed({ lastCopyTitleLinkFailure: validData })
    );

    const result = await loadCopyTitleLinkFailure({ storageLocalGet });
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual(validData);
      expect(result.value.format).toBeUndefined();
    }

    expect(storageLocalGet).toHaveBeenCalledWith(["lastCopyTitleLinkFailure"]);
  });
});
