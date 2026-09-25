import { describe, expect, it } from "vitest";
import {
  EXTRACTED_EVENT_JSON_SCHEMA,
  ExtractedEventSchema,
} from "@/schemas/extracted_event";

// Anthropic へ送る JSON Schema は手書きなので、valibot 側とずれると
// モデルが返した値をローカル検証が弾いてイベント抽出が壊れる。同値性を固定する。
describe("EXTRACTED_EVENT_JSON_SCHEMA", () => {
  it("covers exactly the fields the valibot schema declares", () => {
    expect(Object.keys(EXTRACTED_EVENT_JSON_SCHEMA.properties).sort()).toEqual(
      Object.keys(ExtractedEventSchema.entries).sort()
    );
  });

  it("marks exactly the non-optional valibot entries as required", () => {
    const requiredByValibot = Object.entries(ExtractedEventSchema.entries)
      .filter(([, entry]) => entry.type !== "optional")
      .map(([key]) => key)
      .sort();

    expect([...EXTRACTED_EVENT_JSON_SCHEMA.required].sort()).toEqual(
      requiredByValibot
    );
  });

  it("forbids extra properties so the model cannot invent fields", () => {
    expect(EXTRACTED_EVENT_JSON_SCHEMA.additionalProperties).toBe(false);
  });
});
