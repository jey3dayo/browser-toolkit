import { describe, expect, it } from "vitest";
import { formatLink } from "@/utils/link_format";

describe("create link formatLink", () => {
  it("formats markdown links", () => {
    expect(
      formatLink({ title: "Example", url: " https://example.com " }, "markdown")
    ).toBe("[Example](<https://example.com>)");
  });

  it("formats markdown autolinks when title is empty", () => {
    expect(
      formatLink({ title: "", url: "https://example.com" }, "markdown")
    ).toBe("<https://example.com>");
  });

  it("escapes HTML output", () => {
    expect(
      formatLink(
        { title: 'A&B <Test> "quote"', url: 'https://example.com/?q="x"&y=1' },
        "html"
      )
    ).toBe(
      '<a href="https://example.com/?q=&quot;x&quot;&amp;y=1">A&amp;B &lt;Test&gt; "quote"</a>'
    );
  });

  it("formats org-mode links", () => {
    expect(
      formatLink({ title: "Example", url: "https://example.com" }, "org")
    ).toBe("[[https://example.com][Example]]");
    expect(formatLink({ title: "", url: "https://example.com" }, "org")).toBe(
      "[[https://example.com]]"
    );
  });
});

describe("create link formatLink github", () => {
  it("formats pull request links with the number and cleaned title", () => {
    expect(
      formatLink(
        {
          title:
            "feat: add github link format · Pull Request #261 · jey3dayo/browser-toolkit",
          url: "https://github.com/jey3dayo/browser-toolkit/pull/261",
        },
        "github"
      )
    ).toBe(
      "[#261 feat: add github link format](<https://github.com/jey3dayo/browser-toolkit/pull/261>)"
    );
  });

  it("formats issue links with the number and cleaned title", () => {
    expect(
      formatLink(
        {
          title:
            "Bug: copy fails on some pages · Issue #42 · jey3dayo/browser-toolkit",
          url: "https://github.com/jey3dayo/browser-toolkit/issues/42",
        },
        "github"
      )
    ).toBe(
      "[#42 Bug: copy fails on some pages](<https://github.com/jey3dayo/browser-toolkit/issues/42>)"
    );
  });

  it("cleans the real pull request tab title with author and GitHub suffix", () => {
    expect(
      formatLink(
        {
          title:
            "Apply `font-variation-settings` to the suggestion widget (fix #199954) by chengluyu · Pull Request #200000 · microsoft/vscode · GitHub",
          url: "https://github.com/microsoft/vscode/pull/200000",
        },
        "github"
      )
    ).toBe(
      "[#200000 Apply `font-variation-settings` to the suggestion widget (fix #199954)](<https://github.com/microsoft/vscode/pull/200000>)"
    );
  });

  it("cleans the real issue tab title with GitHub suffix", () => {
    expect(
      formatLink(
        {
          title:
            "feat: Save to Notion 風 Webクリップ機能 (MVP: Bookmark保存) · Issue #247 · jey3dayo/browser-toolkit · GitHub",
          url: "https://github.com/jey3dayo/browser-toolkit/issues/247",
        },
        "github"
      )
    ).toBe(
      "[#247 feat: Save to Notion 風 Webクリップ機能 (MVP: Bookmark保存)](<https://github.com/jey3dayo/browser-toolkit/issues/247>)"
    );
  });

  it("drops a trailing number that matches the URL number", () => {
    expect(
      formatLink(
        {
          title: "Fix the crash #261",
          url: "https://github.com/jey3dayo/browser-toolkit/pull/261",
        },
        "github"
      )
    ).toBe(
      "[#261 Fix the crash](<https://github.com/jey3dayo/browser-toolkit/pull/261>)"
    );
  });

  it("keeps a trailing number that differs from the URL number", () => {
    expect(
      formatLink(
        {
          title: "Depends on #99",
          url: "https://github.com/jey3dayo/browser-toolkit/pull/261",
        },
        "github"
      )
    ).toBe(
      "[#261 Depends on #99](<https://github.com/jey3dayo/browser-toolkit/pull/261>)"
    );
  });

  it("formats with only the number when the title is empty", () => {
    expect(
      formatLink(
        {
          title: "",
          url: "https://github.com/jey3dayo/browser-toolkit/pull/261",
        },
        "github"
      )
    ).toBe("[#261](<https://github.com/jey3dayo/browser-toolkit/pull/261>)");
  });

  it("falls back to markdown for non pull/issue URLs", () => {
    expect(
      formatLink({ title: "Example", url: "https://example.com" }, "github")
    ).toBe("[Example](<https://example.com>)");
    expect(
      formatLink(
        {
          title: "jey3dayo/browser-toolkit",
          url: "https://github.com/jey3dayo/browser-toolkit",
        },
        "github"
      )
    ).toBe(
      "[jey3dayo/browser-toolkit](<https://github.com/jey3dayo/browser-toolkit>)"
    );
  });
});

describe("formatLink with out-of-union format values", () => {
  const source = { title: "Example", url: "https://example.com" };
  const bbcode = formatLink(source, "bbcode");

  it.each([
    "__proto__",
    "toString",
    "constructor",
    "hasOwnProperty",
    "unknown",
  ])("falls back to bbcode for %s", (value) => {
    expect(formatLink(source, value as never)).toBe(bbcode);
  });
});
