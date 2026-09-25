import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dirname =
  typeof import.meta.dirname === "undefined"
    ? path.dirname(fileURLToPath(import.meta.url))
    : import.meta.dirname;
const stylesRoot = path.join(dirname, "..", "..", "src", "styles");

// The shadow host is featureless: `:host:not([x])` never matches, only `:host(:not([x]))` does.
const COMPOUND_HOST_SELECTOR = /:host(?=[.#[]|:(?!:))/;

function listCssFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listCssFiles(full);
    }
    return entry.name.endsWith(".css") ? [full] : [];
  });
}

describe("shadow host selectors", () => {
  it("qualify :host through its functional form so auto theme tokens reach overlays", () => {
    const offenders = listCssFiles(stylesRoot).flatMap((file) =>
      fs
        .readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, index) =>
          COMPOUND_HOST_SELECTOR.test(line)
            ? [
                `${path.relative(stylesRoot, file)}:${index + 1}: ${line.trim()}`,
              ]
            : []
        )
    );
    expect(offenders).toEqual([]);
  });
});
