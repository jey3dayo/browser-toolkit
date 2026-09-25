import { describe, expect, it } from "vitest";
import { buildGeminiResearchPrompt } from "@/background/context_menu_gemini";

describe("background: Gemini context menu", () => {
  it("builds a link summary prompt for a regular page without selection", () => {
    const prompt = buildGeminiResearchPrompt({
      title: "Example Article",
      url: "https://example.com/articles/1",
    });

    expect(prompt).toContain("このリンク先の内容を要約してください。");
    expect(prompt).toContain("URL: https://example.com/articles/1");
  });

  it("builds a link summary prompt for a YouTube page without selection", () => {
    const prompt = buildGeminiResearchPrompt({
      title: "Demo video - YouTube",
      url: "https://www.youtube.com/watch?v=abc123",
    });

    expect(prompt).toContain("このYouTube動画を要約してください。");
    expect(prompt).toContain("URL: https://www.youtube.com/watch?v=abc123");
  });

  it("prioritizes selected text over YouTube link summary", () => {
    const prompt = buildGeminiResearchPrompt({
      selectionText: "この発言の背景を調べたい",
      title: "Demo video - YouTube",
      url: "https://www.youtube.com/watch?v=abc123",
    });

    expect(prompt).toContain("多角的にWeb調査してください。");
    expect(prompt).toContain("調査対象:\nこの発言の背景を調べたい");
    expect(prompt).not.toContain("このYouTube動画を要約してください。");
  });
});
