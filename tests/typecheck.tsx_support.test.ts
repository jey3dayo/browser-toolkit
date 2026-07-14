import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const TYPESCRIPT_PROGRAM_TEST_TIMEOUT_MS = 30_000;

const dirname =
  typeof import.meta.dirname === "undefined"
    ? path.dirname(fileURLToPath(import.meta.url))
    : import.meta.dirname;
const projectRoot = path.join(dirname, "..");

type TscResult = {
  status: number | null;
  output: string;
};

/**
 * Typecheck a single fixture file with `tsc --noEmit`, reusing the project's
 * strict compiler options via a temporary config that `extends` tsconfig.json.
 *
 * We spawn the compiler as a subprocess instead of calling the `typescript`
 * programmatic API: TypeScript 7 (the native port) no longer exposes the
 * classic top-level API (createProgram/getPreEmitDiagnostics/sys/...) from the
 * package's main entry, so a version-agnostic CLI invocation is the durable way
 * to assert that TSX + React typecheck cleanly under strict settings.
 */
function typecheckFixture(fixturePath: string): TscResult {
  const tscBin = path.join(
    projectRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc"
  );
  // Write the temp config inside the project root so `extends` and `@types`
  // resolution (e.g. types: ["chrome"]) walk up into the project's node_modules.
  const configFile = path.join(
    projectRoot,
    `tsconfig.tsx-typecheck-${crypto.randomUUID()}.json`
  );
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      extends: "./tsconfig.json",
      compilerOptions: {
        noEmit: true,
        // The project config sets `rootDir: ./src`; widen it so the isolated
        // fixture path doesn't create unrelated diagnostics.
        rootDir: ".",
        outDir: null,
      },
      files: [fixturePath],
      include: [],
    })
  );

  try {
    const output = execFileSync(tscBin, ["--project", configFile], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, output };
  } catch (error) {
    const spawnError = error as {
      status?: number | null;
      stdout?: string;
      stderr?: string;
    };
    return {
      status: spawnError.status ?? null,
      output: `${spawnError.stdout ?? ""}${spawnError.stderr ?? ""}`,
    };
  } finally {
    fs.rmSync(configFile, { force: true });
  }
}

describe("TypeScript config", () => {
  it(
    "typechecks TSX + React with strict settings",
    () => {
      const fixturePath = path.join(
        projectRoot,
        "tests/fixtures/tsx/Smoke.tsx"
      );
      if (!fs.existsSync(fixturePath)) {
        throw new Error(`Missing fixture: ${fixturePath}`);
      }

      const { status, output } = typecheckFixture(fixturePath);
      if (status !== 0) {
        throw new Error(`tsc reported diagnostics:\n${output}`);
      }
      expect(status).toBe(0);
    },
    TYPESCRIPT_PROGRAM_TEST_TIMEOUT_MS
  );
});
