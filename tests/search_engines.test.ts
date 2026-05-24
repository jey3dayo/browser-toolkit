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
      id: BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE,
      name: "サウンドハウス",
      urlTemplate:
        "https://www.soundhouse.co.jp/search/index/?i_type=a&search_all={query}",
      enabled: true,
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

  it("includes SoundHouse in the default shopping search group", () => {
    const shoppingGroup = DEFAULT_SEARCH_ENGINE_GROUPS.find(
      (group) => group.id === SEARCH_ENGINE_GROUP_IDS.SHOPPING
    );

    expect(shoppingGroup?.engineIds).toContain(
      BUILTIN_SEARCH_ENGINE_IDS.SOUNDHOUSE
    );
  });
});
