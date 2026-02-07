import { JSDOM } from "jsdom";

// Base UI の ToastProvider などがモジュールロード時に window を参照するため、
// beforeEach より前にグローバル環境を初期化する必要がある
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});

// @ts-expect-error - グローバルに window/document を追加
globalThis.window = dom.window;
// @ts-expect-error - グローバルに window/document を追加
globalThis.document = dom.window.document;

// navigator は read-only なので defineProperty を使用
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  writable: true,
  configurable: true,
});

// テスト環境フラグを設定（デバッグログ抑制用）
// @ts-expect-error - グローバルにテスト実行フラグを追加
globalThis.__MBU_IS_VITEST__ = true;
