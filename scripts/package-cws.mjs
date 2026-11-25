import { execFileSync } from "node:child_process";
import fsp from "node:fs/promises";
import path from "node:path";

// Chrome Web Store 提出用 zip を作る。
// 固定の同梱リストに対して、manifest.json が参照するファイルが
// すべて存在し、かつ同梱対象に含まれていることを検証してから zip 化する。
// （参照ファイルの欠落はストアの自動インストールテストで落ちる）

const rootFiles = [
  "manifest.json",
  "popup.html",
  "options.html",
  "popup_bootstrap.js",
  "options_bootstrap.js",
  "content.css",
];
const iconFiles = [
  "images/icon16.png",
  "images/icon48.png",
  "images/icon128.png",
];

async function listFiles(dir) {
  const entries = await fsp.readdir(dir, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path.relative(dir, path.join(entry.parentPath, entry.name))
    );
}

function manifestReferences(manifestJson) {
  const refs = new Set();
  const add = (value) => {
    if (typeof value === "string") {
      refs.add(value);
    }
  };
  add(manifestJson.background?.service_worker);
  add(manifestJson.action?.default_popup);
  for (const icon of Object.values(manifestJson.action?.default_icon ?? {})) {
    add(icon);
  }
  for (const icon of Object.values(manifestJson.icons ?? {})) {
    add(icon);
  }
  add(manifestJson.options_ui?.page);
  add(manifestJson.devtools_page);
  for (const cs of manifestJson.content_scripts ?? []) {
    for (const file of [...(cs.js ?? []), ...(cs.css ?? [])]) {
      add(file);
    }
  }
  for (const war of manifest.web_accessible_resources ?? []) {
    for (const file of war.resources ?? []) {
      add(file);
    }
  }
  return refs;
}

const manifest = JSON.parse(await fsp.readFile("manifest.json", "utf8"));
const distFiles = (await listFiles("dist")).map((file) =>
  path.join("dist", file)
);
const packageFiles = [...rootFiles, ...iconFiles, ...distFiles];
const packageSet = new Set(packageFiles);

const problems = [];
await Promise.all(
  packageFiles.map(async (file) => {
    try {
      await fsp.access(file);
    } catch {
      problems.push(`同梱対象が存在しない: ${file}`);
    }
  })
);
for (const ref of manifestReferences(manifest)) {
  if (!packageSet.has(ref)) {
    problems.push(`manifest が参照しているが同梱対象に無い: ${ref}`);
  }
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

await fsp.mkdir("tmp", { recursive: true });
const outFile = path.join("tmp", `browser-toolkit-${manifest.version}.zip`);
await fsp.rm(outFile, { force: true });
execFileSync("zip", ["-r", "-q", outFile, ...packageFiles], {
  stdio: "inherit",
});
console.log(
  `created ${outFile} (${packageFiles.length} files, version ${manifest.version})`
);
