(function () {
  function showError(message) {
    var existing = document.getElementById('mbu-build-error');
    if (existing) return;

    var banner = document.createElement('div');
    banner.id = 'mbu-build-error';
    banner.textContent = message;
    banner.style.cssText =
      'position: fixed;' +
      'left: 12px;' +
      'right: 12px;' +
      'bottom: 12px;' +
      'z-index: 2147483647;' +
      'padding: 10px 12px;' +
      'border-radius: 12px;' +
      'background: rgba(229,57,53,0.92);' +
      'color: #fff;' +
      'font-size: 12px;' +
      'font-weight: 700;' +
      'box-shadow: 0 10px 24px rgba(0,0,0,0.3);';

    (document.body || document.documentElement).appendChild(banner);
  }

  // `dist/popup.js` が読み込めていない/実行できていない場合にだけ案内を出す
  // （Safari/Firefoxや、CSP等で動的スクリプト注入が制限される環境でも確実に表示できるようにする）
  var loaded = !!(globalThis && globalThis.__MBU_POPUP_LOADED__);
  if (loaded) return;

  // 拡張機能ページ外（ファイルとして開いた等）でのプレビュー時の分かりやすい案内
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    showError('このページはChrome拡張機能として読み込んでください（chrome://extensions から拡張機能を読み込みます）。');
    return;
  }

  showError(
    '拡張機能のスクリプトを読み込めませんでした。`pnpm install && pnpm run build` を実行してから、chrome://extensions でこの拡張機能を再読み込みしてください。',
  );
})();
