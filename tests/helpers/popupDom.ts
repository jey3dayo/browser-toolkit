import { JSDOM } from "jsdom";

export function createPopupDom(
  url = "chrome-extension://test/popup.html#pane-actions"
): JSDOM {
  const html = `<!doctype html>
  <html lang="ja">
    <head></head>
    <body>
      <div id="root"></div>
    </body>
  </html>`;

  return new JSDOM(html, { url });
}
