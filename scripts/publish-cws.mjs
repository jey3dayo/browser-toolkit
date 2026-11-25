import { createSign } from "node:crypto";
import fsp from "node:fs/promises";

// Chrome Web Store API v2 で zip をアップロードし、審査提出（publish）する。
// 認証はサービスアカウント（JSON キー）。開発者コンソールの
// 「サービスアカウント」に SA のメールを登録しておく必要がある。
//
// 必要な環境変数:
//   CWS_PUBLISHER_ID  パブリッシャー ID
//   CWS_ITEM_ID       アイテム ID
//   CWS_SA_KEY        サービスアカウント JSON キーの中身（文字列）
//                     または CWS_SA_KEY_FILE にキーファイルのパス
// 任意の引数:
//   --dry-run         アイテム状態の取得だけを行い、疎通確認で止める
//   --skip-publish    アップロードまでで止める（審査提出しない）
// zip のパスは package-cws.mjs の出力（tmp/browser-toolkit-<version>.zip）を
// 既定とし、位置引数で上書きできる。

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipPublish = args.includes("--skip-publish");
const zipArg = args.find((arg) => !arg.startsWith("--"));

const publisherId = process.env.CWS_PUBLISHER_ID;
const itemId = process.env.CWS_ITEM_ID;
if (!(publisherId && itemId)) {
  console.error("CWS_PUBLISHER_ID と CWS_ITEM_ID が必要です");
  process.exit(1);
}

const keyJson =
  process.env.CWS_SA_KEY ??
  (process.env.CWS_SA_KEY_FILE
    ? await fsp.readFile(process.env.CWS_SA_KEY_FILE, "utf8")
    : null);
if (!keyJson) {
  console.error("CWS_SA_KEY（または CWS_SA_KEY_FILE）が必要です");
  process.exit(1);
}
const saKey = JSON.parse(keyJson);

function base64url(data) {
  return Buffer.from(data).toString("base64url");
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
      iss: saKey.client_email,
      scope: "https://www.googleapis.com/auth/chromewebstore",
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(saKey.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      assertion: `${header}.${claim}.${signature}`,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`トークン取得に失敗: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).access_token;
}

const token = await accessToken();
const itemName = `publishers/${publisherId}/items/${itemId}`;
const headers = { Authorization: `Bearer ${token}` };

async function fetchStatus() {
  const res = await fetch(
    `https://chromewebstore.googleapis.com/v2/${itemName}:fetchStatus`,
    { headers }
  );
  if (!res.ok) {
    throw new Error(`状態取得に失敗: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

if (dryRun) {
  const status = await fetchStatus();
  console.log(`疎通 OK: ${JSON.stringify(status)}`);
  process.exit(0);
}

const manifest = JSON.parse(await fsp.readFile("manifest.json", "utf8"));
const zipPath = zipArg ?? `tmp/browser-toolkit-${manifest.version}.zip`;
const zipBody = await fsp.readFile(zipPath);

const uploadRes = await fetch(
  `https://chromewebstore.googleapis.com/upload/v2/${itemName}:upload`,
  {
    body: zipBody,
    headers: { ...headers, "Content-Type": "application/octet-stream" },
    method: "POST",
  }
);
if (!uploadRes.ok) {
  throw new Error(
    `アップロードに失敗: ${uploadRes.status} ${await uploadRes.text()}`
  );
}
const upload = await uploadRes.json();
console.log(
  `アップロード応答: state=${upload.uploadState} crxVersion=${upload.crxVersion ?? manifest.version}`
);

// アップロードは非同期処理になることがあるため、IN_PROGRESS の間は
// fetchStatus の lastAsyncUploadState を上限付きでポーリングする
async function waitForUpload(state, attemptsLeft = 60) {
  if (state !== "IN_PROGRESS" || attemptsLeft <= 0) {
    return state;
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const status = await fetchStatus();
  const nextState = status.lastAsyncUploadState ?? state;
  console.log(`アップロード処理待ち: state=${nextState}`);
  return waitForUpload(nextState, attemptsLeft - 1);
}

const finalUploadState = await waitForUpload(upload.uploadState);
if (finalUploadState !== "SUCCEEDED") {
  console.error(
    `アップロードが SUCCEEDED にならなかったため、審査提出を中止します: state=${finalUploadState}`
  );
  process.exit(1);
}
console.log("アップロード完了");

if (skipPublish) {
  console.log("--skip-publish のため審査提出はしません");
  process.exit(0);
}

const publishRes = await fetch(
  `https://chromewebstore.googleapis.com/v2/${itemName}:publish`,
  {
    body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
    headers: { ...headers, "Content-Type": "application/json" },
    method: "POST",
  }
);
if (!publishRes.ok) {
  throw new Error(
    `審査提出に失敗: ${publishRes.status} ${await publishRes.text()}`
  );
}
const published = await publishRes.json();
console.log(`審査提出完了: state=${published.state ?? "不明"}`);
