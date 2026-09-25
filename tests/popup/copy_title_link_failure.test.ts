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
      error: "Clipboard write failed",
      format: "text",
      occurredAt: Date.now(),
      pageTitle: "Test Page",
      pageUrl: "https://example.com",
      tabId: 123,
      text: "Test Page\nhttps://example.com",
    };

    const result = coerceCopyTitleLinkFailure(validData);
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({
        error: validData.error,
        format: "text",
        occurredAt: validData.occurredAt,
        pageTitle: validData.pageTitle,
        pageUrl: validData.pageUrl,
        tabId: validData.tabId,
        text: validData.text,
      });
    }
  });

  it("parses valid data without format field", () => {
    const validData = {
      error: "Permission denied",
      occurredAt: Date.now(),
      pageTitle: "Another Page",
      pageUrl: "https://example.org",
      tabId: 456,
      text: "[Another Page](https://example.org)",
    };

    const result = coerceCopyTitleLinkFailure(validData);
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({
        error: validData.error,
        occurredAt: validData.occurredAt,
        pageTitle: validData.pageTitle,
        pageUrl: validData.pageUrl,
        tabId: validData.tabId,
        text: validData.text,
      });
      expect(result.value.format).toBeUndefined();
    }
  });

  it("parses valid data with invalid format (coerced to null, omitted)", () => {
    const validData = {
      error: "Error",
      format: "invalid-format",
      occurredAt: Date.now(),
      pageTitle: "Test",
      pageUrl: "https://test.com",
      tabId: 789,
      text: "Test\nhttps://test.com",
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
      error: "Error",
      pageTitle: "Test",
      pageUrl: "https://example.com",
      tabId: 123,
      text: "Test",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when occurredAt is not a number", () => {
    const invalidData = {
      error: "Error",
      occurredAt: "not-a-number",
      pageTitle: "Test",
      pageUrl: "https://example.com",
      tabId: 123,
      text: "Test",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when tabId is missing", () => {
    const invalidData = {
      error: "Error",
      occurredAt: Date.now(),
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

  it("fails when tabId is not a number", () => {
    const invalidData = {
      error: "Error",
      occurredAt: Date.now(),
      pageTitle: "Test",
      pageUrl: "https://example.com",
      tabId: "not-a-number",
      text: "Test",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when pageTitle is missing", () => {
    const invalidData = {
      error: "Error",
      occurredAt: Date.now(),
      pageUrl: "https://example.com",
      tabId: 123,
      text: "Test",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when pageTitle is not a string", () => {
    const invalidData = {
      error: "Error",
      occurredAt: Date.now(),
      pageTitle: 123,
      pageUrl: "https://example.com",
      tabId: 123,
      text: "Test",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when pageUrl is missing", () => {
    const invalidData = {
      error: "Error",
      occurredAt: Date.now(),
      pageTitle: "Test",
      tabId: 123,
      text: "Test",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when pageUrl is not a string", () => {
    const invalidData = {
      error: "Error",
      occurredAt: Date.now(),
      pageTitle: "Test",
      pageUrl: 123,
      tabId: 123,
      text: "Test",
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when text is missing", () => {
    const invalidData = {
      error: "Error",
      occurredAt: Date.now(),
      pageTitle: "Test",
      pageUrl: "https://example.com",
      tabId: 123,
    };

    const result = coerceCopyTitleLinkFailure(invalidData);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.error).toBe("invalid");
    }
  });

  it("fails when text is not a string", () => {
    const invalidData = {
      error: "Error",
      occurredAt: Date.now(),
      pageTitle: "Test",
      pageUrl: "https://example.com",
      tabId: 123,
      text: 123,
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
      pageTitle: "Test",
      pageUrl: "https://example.com",
      tabId: 123,
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
      error: 123,
      occurredAt: Date.now(),
      pageTitle: "Test",
      pageUrl: "https://example.com",
      tabId: 123,
      text: "Test",
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
        error: "Error",
        occurredAt: "not-a-number",
        pageTitle: "Test",
        pageUrl: "https://example.com",
        tabId: 123,
        text: "Test",
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
      error: "Clipboard write failed",
      format: "text",
      occurredAt: Date.now(),
      pageTitle: "Test Page",
      pageUrl: "https://example.com",
      tabId: 123,
      text: "Test Page\nhttps://example.com",
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
      error: "Permission denied",
      occurredAt: Date.now(),
      pageTitle: "Another Page",
      pageUrl: "https://example.org",
      tabId: 456,
      text: "[Another Page](https://example.org)",
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
