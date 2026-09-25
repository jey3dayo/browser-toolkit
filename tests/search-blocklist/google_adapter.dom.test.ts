import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { googleAdapter } from "@/search-blocklist/engines/google";

const FIXTURES_DIR = path.join(
  process.cwd(),
  "tests/fixtures/search-blocklist"
);

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
}

function createLocation(url: string): Location {
  return new URL(url) as unknown as Location;
}

describe("googleAdapter.matches", () => {
  it("matches www.google.com search pages", () => {
    expect(
      googleAdapter.matches(
        createLocation("https://www.google.com/search?q=foo")
      )
    ).toBe(true);
  });

  it("matches www.google.co.jp search pages", () => {
    expect(
      googleAdapter.matches(
        createLocation("https://www.google.co.jp/search?q=foo")
      )
    ).toBe(true);
  });

  it("does not match non-search Google pages", () => {
    expect(
      googleAdapter.matches(createLocation("https://www.google.com/maps"))
    ).toBe(false);
  });

  it("does not match other engines", () => {
    expect(
      googleAdapter.matches(createLocation("https://www.bing.com/search?q=foo"))
    ).toBe(false);
  });
});

describe("googleAdapter.findResults", () => {
  it("extracts container, url, and title for each organic result", () => {
    document.body.innerHTML = loadFixture("google-results.html");

    const results = googleAdapter.findResults(document.body);

    expect(results).toHaveLength(2);
    expect(results[0]?.url).toBe("https://example.com/foo");
    expect(results[0]?.title).toBe("Example Foo Result");
    expect(results[1]?.url).toBe("https://sub.other-example.org/bar/baz?x=1");
    expect(results[1]?.title).toBe("Other Example Bar Baz");
  });

  it("does not treat internal google links as results", () => {
    document.body.innerHTML = loadFixture("google-results.html");

    const results = googleAdapter.findResults(document.body);
    const urls = results.map((entry) => entry.url);

    expect(urls).not.toContain(
      "https://www.google.com/aclk?sa=l&ai=abc123&adurl=https://ads.example.com"
    );
    expect(urls.some((url) => url.includes("google.com/search"))).toBe(false);
    expect(urls.some((url) => url.includes("google.co.jp/search"))).toBe(false);
  });

  it("returns an empty array for an unrecognized empty body", () => {
    document.body.innerHTML = loadFixture("google-empty.html");

    expect(googleAdapter.findResults(document.body)).toEqual([]);
  });
});
