import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_ENGINE_GROUPS,
  SEARCH_ENGINE_GROUP_IDS,
} from "@/search_engine_groups";
import {
  BUILTIN_SEARCH_ENGINE_IDS,
  buildSearchUrl,
  DEFAULT_SEARCH_ENGINES,
} from "@/search_engines";

describe("search engines", () => {
  it("includes SoundHouse in default search engines", () => {
    expect(DEFAULT_SEARCH_ENGINES).toContainEqual({
      enabled: true,
      id: BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE,
      name: "サウンドハウス",
      urlTemplate:
        "https://www.soundhouse.co.jp/search/index/?i_type=a&search_all={query}",
    });
  });

  it("includes Yandex in default search engines", () => {
    expect(DEFAULT_SEARCH_ENGINES).toContainEqual({
      enabled: true,
      id: BUILTIN_SEARCH_ENGINE_IDS.YANDEX,
      name: "Yandex",
      urlTemplate: "https://yandex.com/search/?text={query}",
    });
  });

  it("builds the SoundHouse search URL with the encoded query", () => {
    const soundhouse = DEFAULT_SEARCH_ENGINES.find(
      (engine) => engine.id === BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE
    );

    expect(soundhouse).toBeDefined();
    if (!soundhouse) {
      return;
    }

    expect(
      buildSearchUrl(
        soundhouse.urlTemplate,
        "YAMAHA MPC3 マウスピースクリーナー",
        soundhouse.encoding
      )
    ).toBe(
      "https://www.soundhouse.co.jp/search/index/?i_type=a&search_all=YAMAHA%20MPC3%20%E3%83%9E%E3%82%A6%E3%82%B9%E3%83%94%E3%83%BC%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%8A%E3%83%BC"
    );
  });

  it("builds the Yandex search URL with the encoded query", () => {
    const yandex = DEFAULT_SEARCH_ENGINES.find(
      (engine) => engine.id === BUILTIN_SEARCH_ENGINE_IDS.YANDEX
    );

    expect(yandex).toBeDefined();
    if (!yandex) {
      return;
    }

    expect(
      buildSearchUrl(yandex.urlTemplate, "東京 weather", yandex.encoding)
    ).toBe("https://yandex.com/search/?text=%E6%9D%B1%E4%BA%AC%20weather");
  });

  it("builds a search URL with page metadata placeholders", () => {
    expect(
      buildSearchUrl(
        "https://example.com/research?q={query}&url={url}&title={title}",
        {
          query: "Gemini Web 調査",
          title: "Browser Toolkit",
          url: "https://example.com/page?a=1",
        }
      )
    ).toBe(
      "https://example.com/research?q=Gemini%20Web%20%E8%AA%BF%E6%9F%BB&url=https%3A%2F%2Fexample.com%2Fpage%3Fa%3D1&title=Browser%20Toolkit"
    );
  });

  it("includes GitHub and Google Maps in default search engines", () => {
    expect(DEFAULT_SEARCH_ENGINES).toContainEqual({
      enabled: true,
      id: BUILTIN_SEARCH_ENGINE_IDS.GITHUB,
      name: "GitHub",
      urlTemplate: "https://github.com/search?q={query}&type=repositories",
    });
    expect(DEFAULT_SEARCH_ENGINES).toContainEqual({
      enabled: true,
      id: BUILTIN_SEARCH_ENGINE_IDS.GOOGLE_MAPS,
      name: "Google マップ",
      urlTemplate: "https://www.google.com/maps/search/{query}",
    });
  });

  it("builds the Kakaku search URL with the Shift_JIS encoded query", () => {
    const kakaku = DEFAULT_SEARCH_ENGINES.find(
      (engine) => engine.id === BUILTIN_SEARCH_ENGINE_IDS.KAKAKU
    );

    expect(kakaku).toBeDefined();
    if (!kakaku) {
      return;
    }

    expect(buildSearchUrl(kakaku.urlTemplate, "掃除機", kakaku.encoding)).toBe(
      "https://kakaku.com/search_results/%91%7C%8F%9C%8B%40/"
    );
  });

  it("includes flea-market services in default search engines", () => {
    expect(DEFAULT_SEARCH_ENGINES).toContainEqual({
      enabled: true,
      id: BUILTIN_SEARCH_ENGINE_IDS.YAHOO_AUCTIONS,
      name: "ヤフオク",
      urlTemplate: "https://auctions.yahoo.co.jp/search/search/{query}",
    });
    expect(DEFAULT_SEARCH_ENGINES).toContainEqual({
      enabled: true,
      id: BUILTIN_SEARCH_ENGINE_IDS.RAKUMA,
      name: "ラクマ",
      urlTemplate: "https://fril.jp/s/?query={query}",
    });
    expect(DEFAULT_SEARCH_ENGINES).toContainEqual({
      enabled: true,
      id: BUILTIN_SEARCH_ENGINE_IDS.PAYPAY_FLEAMARKET,
      name: "PayPayフリマ",
      urlTemplate: "https://paypayfleamarket.yahoo.co.jp/search/{query}",
    });
  });

  it("builds the Yahoo Auctions search URL with the encoded query", () => {
    const yahooAuctions = DEFAULT_SEARCH_ENGINES.find(
      (engine) => engine.id === BUILTIN_SEARCH_ENGINE_IDS.YAHOO_AUCTIONS
    );

    expect(yahooAuctions).toBeDefined();
    if (!yahooAuctions) {
      return;
    }

    expect(
      buildSearchUrl(
        yahooAuctions.urlTemplate,
        "掃除機",
        yahooAuctions.encoding
      )
    ).toBe(
      "https://auctions.yahoo.co.jp/search/search/%E6%8E%83%E9%99%A4%E6%A9%9F"
    );
  });

  it("keeps flea-market services out of the daily-needs group", () => {
    const dailyGroup = DEFAULT_SEARCH_ENGINE_GROUPS.find(
      (group) => group.id === SEARCH_ENGINE_GROUP_IDS.DAILY_NEEDS
    );

    expect(dailyGroup?.engineIds).toContain(BUILTIN_SEARCH_ENGINE_IDS.KAKAKU);
    expect(dailyGroup?.engineIds).not.toContain(
      BUILTIN_SEARCH_ENGINE_IDS.MERCARI
    );
    expect(dailyGroup?.engineIds).not.toContain(
      BUILTIN_SEARCH_ENGINE_IDS.YAHOO_AUCTIONS
    );
  });

  it("includes flea-market services in the deep-comparison group", () => {
    const deepGroup = DEFAULT_SEARCH_ENGINE_GROUPS.find(
      (group) => group.id === SEARCH_ENGINE_GROUP_IDS.DEEP_COMPARISON
    );

    expect(deepGroup?.engineIds).toContain(BUILTIN_SEARCH_ENGINE_IDS.MERCARI);
    expect(deepGroup?.engineIds).toContain(
      BUILTIN_SEARCH_ENGINE_IDS.YAHOO_AUCTIONS
    );
    expect(deepGroup?.engineIds).toContain(BUILTIN_SEARCH_ENGINE_IDS.RAKUMA);
    expect(deepGroup?.engineIds).toContain(
      BUILTIN_SEARCH_ENGINE_IDS.PAYPAY_FLEAMARKET
    );
    expect(deepGroup?.engineIds).toContain(
      BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE
    );
  });
});
