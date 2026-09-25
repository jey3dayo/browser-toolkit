import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dirname =
  typeof import.meta.dirname === "undefined"
    ? path.dirname(fileURLToPath(import.meta.url))
    : import.meta.dirname;
const projectRoot = path.join(dirname, "..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function readPrimitiveHex(css: string, name: string): string {
  const match = css.match(
    new RegExp(`--primitive-color-neutral-${name}:\\s*(#[0-9a-f]{6})`, "i")
  );
  if (!match) {
    throw new Error(
      `primitives.css is missing --primitive-color-neutral-${name}`
    );
  }
  return match[1].toLowerCase();
}

function readFallbackHex(css: string, name: string): string {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
  if (!match) {
    throw new Error(`tokens.css @layer fallback is missing ${name}`);
  }
  return match[1].toLowerCase();
}

function readStylesTokensFallbackHex(source: string, name: string): string {
  const match = source.match(
    new RegExp(`"${name}":\\s*"var\\([^,]+,\\s*(#[0-9a-f]{6})\\)"`, "i")
  );
  if (!match) {
    throw new Error(`styles-tokens.ts is missing a hex fallback for ${name}`);
  }
  return match[1].toLowerCase();
}

function readDesignColorHex(source: string, name: string): string {
  const match = source.match(
    new RegExp(`^\\s+${name}:\\s*"(#[0-9a-f]{6})"`, "im")
  );
  if (!match) {
    throw new Error(`DESIGN.md is missing the ${name} color`);
  }
  return match[1].toLowerCase();
}

describe("dark theme fallback tokens stay in sync with primitives", () => {
  it("keeps tokens.css @layer fallback dark values equal to the dark neutral primitives", () => {
    const primitivesCss = readSource("src/styles/tokens/primitives.css");
    const tokensCss = readSource("src/styles/tokens/components/tokens.css");

    const neutral950 = readPrimitiveHex(primitivesCss, "950");
    const neutral900 = readPrimitiveHex(primitivesCss, "900");
    const neutral850 = readPrimitiveHex(primitivesCss, "850");

    const [, fallbackLayer = ""] = tokensCss.split("@layer fallback");
    const [darkFallback = ""] = fallbackLayer.split(
      ':where(:root[data-theme="light"])'
    );

    expect(readFallbackHex(darkFallback, "--bg")).toBe(neutral950);
    expect(readFallbackHex(darkFallback, "--panel")).toBe(neutral900);
    expect(readFallbackHex(darkFallback, "--panel-soft")).toBe(neutral850);
    expect(readFallbackHex(darkFallback, "--mbu-bg")).toBe(neutral950);
    expect(readFallbackHex(darkFallback, "--mbu-surface")).toBe(neutral900);
    expect(readFallbackHex(darkFallback, "--mbu-surface-2")).toBe(neutral850);
  });

  it("keeps styles-tokens.ts FALLBACK_MBU_TOKENS hex fallbacks equal to the dark neutral primitives", () => {
    const primitivesCss = readSource("src/styles/tokens/primitives.css");
    const stylesTokensSource = readSource("src/ui/styles-tokens.ts");

    const neutral950 = readPrimitiveHex(primitivesCss, "950");
    const neutral900 = readPrimitiveHex(primitivesCss, "900");
    const neutral850 = readPrimitiveHex(primitivesCss, "850");

    expect(readStylesTokensFallbackHex(stylesTokensSource, "--mbu-bg")).toBe(
      neutral950
    );
    expect(
      readStylesTokensFallbackHex(stylesTokensSource, "--mbu-surface")
    ).toBe(neutral900);
    expect(
      readStylesTokensFallbackHex(stylesTokensSource, "--mbu-surface-2")
    ).toBe(neutral850);
  });

  it("keeps the DESIGN.md dark palette equal to the dark neutral primitives", () => {
    const primitivesCss = readSource("src/styles/tokens/primitives.css");
    const designDoc = readSource("DESIGN.md");

    expect(readDesignColorHex(designDoc, "bgDark")).toBe(
      readPrimitiveHex(primitivesCss, "950")
    );
    expect(readDesignColorHex(designDoc, "surfaceDark")).toBe(
      readPrimitiveHex(primitivesCss, "900")
    );
    expect(readDesignColorHex(designDoc, "surfaceDarkRaised")).toBe(
      readPrimitiveHex(primitivesCss, "850")
    );
  });
});
