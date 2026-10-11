import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const fixturePath = "tests/fixtures/agent-skills";
const packageName = "@browser-toolkit/agent-skills-poc";
const source = path.join(root, fixturePath);
const skillName = "pnpm-@browser-toolkit+agent-skills-poc-pnpm-smoke";
const dirs = [".agents/skills", ".claude/skills"];
const pin = JSON.parse(
  readFileSync(path.join(root, "package.json"), "utf8")
).packageManager;
const executable = process.env.npm_execpath;
assert.ok(executable, "Run with pnpm run test:agent-skills");
const command =
  executable.endsWith(".cjs") || executable.endsWith(".js")
    ? [process.execPath, executable]
    : [executable];

function invoke(cwd, args, env = process.env) {
  const result = spawnSync(command[0], [...command.slice(1), ...args], {
    cwd,
    encoding: "utf8",
    env,
    timeout: 60_000,
  });
  assert.ifError(result.error);
  return { output: result.stdout + result.stderr, status: result.status };
}

function succeed(cwd, args, env) {
  const result = invoke(cwd, args, env);
  assert.equal(result.status, 0, result.output);
  return result.output;
}

function verifyLinks(cwd) {
  for (const dir of dirs) {
    const link = path.join(cwd, dir, skillName);
    assert.ok(lstatSync(link).isSymbolicLink(), `Missing symlink: ${link}`);
    const installed = realpathSync(link);
    assert.ok(
      installed.startsWith(`${path.join(cwd, "node_modules")}${path.sep}`)
    );
    for (const file of ["SKILL.md", "reference.md"]) {
      assert.equal(
        readFileSync(path.join(link, file), "utf8"),
        readFileSync(path.join(source, "skills/pnpm-smoke", file), "utf8")
      );
    }
    assert.equal(
      readFileSync(path.join(cwd, dir, ".gitignore"), "utf8"),
      "pnpm-*\n"
    );
  }
}

function verifyAbsent(cwd) {
  for (const dir of dirs) {
    assert.equal(
      lstatSync(path.join(cwd, dir, skillName), { throwIfNoEntry: false }),
      undefined
    );
  }
}

// Checks the actual repository install, not just a synthetic manifest.
test("the pinned pnpm links only the inert local fixture into both agents", () => {
  assert.equal(succeed(root, ["--version"]).trim(), pin.slice("pnpm@".length));
  const manifest = JSON.parse(
    readFileSync(path.join(source, "package.json"), "utf8")
  );
  assert.equal(manifest.private, true);
  for (const field of [
    "scripts",
    "bin",
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    assert.equal(manifest[field], undefined, `Fixture must not have ${field}`);
  }
  assert.deepEqual(readdirSync(path.join(source, "skills")), ["pnpm-smoke"]);
  assert.deepEqual(readdirSync(path.join(source, "skills/pnpm-smoke")).sort(), [
    "SKILL.md",
    "reference.md",
  ]);
  verifyLinks(root);
});

test("approval, frozen replay, revocation, removal and collision use a disposable project", () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "browser-toolkit-skills-"));
  try {
    const project = path.join(scratch, "project");
    mkdirSync(project);
    cpSync(source, path.join(project, fixturePath), { recursive: true });
    // No inherited credentials, global config or agent detection is needed.
    const env = Object.fromEntries(
      ["PATH", "SystemRoot", "SYSTEMROOT", "COMSPEC", "PATHEXT"].flatMap(
        (key) => (process.env[key] ? [[key, process.env[key]]] : [])
      )
    );
    for (const key of [
      "HOME",
      "USERPROFILE",
      "XDG_CONFIG_HOME",
      "XDG_DATA_HOME",
      "XDG_CACHE_HOME",
    ]) {
      env[key] = path.join(scratch, key.toLowerCase());
      mkdirSync(env[key]);
    }
    env.CI = "true";
    const manifestPath = path.join(project, "package.json");
    const manifest = {
      devDependencies: { [packageName]: `file:${fixturePath}` },
      name: "agent-skills-delivery-test",
      private: true,
    };
    const workspacePath = path.join(project, "pnpm-workspace.yaml");
    const base =
      "minimumReleaseAge: 10080\npmOnFail: ignore\nskills:\n  dirs: [.agents/skills, .claude/skills]\n";
    const permission = `permissions:\n  "${packageName}@file:${fixturePath}":\n    skills: true\n`;
    const install = [
      "install",
      "--offline",
      "--ignore-scripts",
      "--store-dir",
      path.join(scratch, "store"),
    ];
    writeFileSync(manifestPath, JSON.stringify(manifest));
    writeFileSync(workspacePath, base);
    const pending = succeed(project, [...install, "--no-frozen-lockfile"], env);
    assert.ok(pending.includes("Agent skills awaiting approval"));
    verifyAbsent(project);

    writeFileSync(workspacePath, base + permission);
    succeed(project, [...install, "--frozen-lockfile"], env);
    verifyLinks(project);
    const lockPath = path.join(project, "pnpm-lock.yaml");
    const lock = readFileSync(lockPath, "utf8");
    rmSync(path.join(project, "node_modules"), { recursive: true });
    succeed(project, [...install, "--frozen-lockfile"], env);
    verifyLinks(project);
    assert.equal(readFileSync(lockPath, "utf8"), lock);

    writeFileSync(
      workspacePath,
      base + permission.replace("skills: true", "skills: false")
    );
    succeed(project, [...install, "--frozen-lockfile"], env);
    verifyAbsent(project);
    writeFileSync(workspacePath, base + permission);
    succeed(project, [...install, "--frozen-lockfile"], env);
    delete manifest.devDependencies;
    writeFileSync(manifestPath, JSON.stringify(manifest));
    succeed(project, [...install, "--no-frozen-lockfile"], env);
    verifyAbsent(project);

    manifest.devDependencies = { [packageName]: `file:${fixturePath}` };
    writeFileSync(manifestPath, JSON.stringify(manifest));
    const occupied = path.join(project, dirs[0], skillName);
    mkdirSync(occupied);
    writeFileSync(path.join(occupied, "owned.txt"), "keep me");
    const collision = invoke(
      project,
      [...install, "--no-frozen-lockfile"],
      env
    );
    assert.notEqual(collision.status, 0);
    assert.ok(collision.output.includes("ERR_PNPM_AGENT_SKILL_PATH_OCCUPIED"));
    assert.equal(
      readFileSync(path.join(occupied, "owned.txt"), "utf8"),
      "keep me"
    );
  } finally {
    rmSync(scratch, { force: true, recursive: true });
  }
});
