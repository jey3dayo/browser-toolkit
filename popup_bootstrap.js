(() => {
  const SCRIPT_SRC = 'dist/popup.js';

  function showBuildError() {
    const existing = document.getElementById('mbu-build-error');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'mbu-build-error';
    banner.className = 'mbu-build-error';
    banner.textContent =
      '拡張機能のスクリプトを読み込めませんでした。`pnpm install && pnpm run build` を実行してから、chrome://extensions でこの拡張機能を再読み込みしてください。';

    document.body.appendChild(banner);
  }

  const script = document.createElement('script');
  script.async = false;
  script.src = SCRIPT_SRC;
  script.addEventListener('error', showBuildError);
  document.body.appendChild(script);
})();
