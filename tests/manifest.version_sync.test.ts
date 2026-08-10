import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { object, safeParse, string } from "valibot";
import { describe, expect, it } from "vitest";

const dirname =
  typeof import.meta.dirname === "undefined"
    ? path.dirname(fileURLToPath(import.meta.url))
    : import.meta.dirname;
const projectRoot = path.join(dirname, "..");

// 型アサーションを使わずに version を取り出す（CLAUDE.md の禁止事項）。
const VersionedJsonSchema = object({ version: string() });

function readJsonVersion(relativePath: string): string {
  const raw = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  const parsed = safeParse(VersionedJsonSchema, JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`${relativePath} has no string "version" field`);
  }
  return parsed.output.version;
}

describe("extension version", () => {
  // manifest.json が出荷バージョンの正本。package.json の version は
  // どのビルド経路にも読まれないため、放置すると静かに食い違う。
  it("keeps package.json in sync with the shipped manifest version", () => {
    expect(readJsonVersion("package.json")).toBe(
      readJsonVersion("manifest.json")
    );
  });
});
