import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ChromeStub = {
  runtime: {
    lastError: { message: string } | null;
    sendMessage: ReturnType<typeof vi.fn>;
  };
  storage: {
    sync: {
      get: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
    };
    local: {
      get: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
  };
  tabs: {
    query: ReturnType<typeof vi.fn>;
  };
};

function createPopupDom(): JSDOM {
  const html = `<!doctype html>
  <html lang="ja">
    <body class="no-js">
      <main class="content">
        <header class="content-header">
          <span id="hero-chip">-</span>
          <button id="cta-pill" type="button"></button>
        </header>
        <div class="content-body">
          <section class="pane active" id="pane-actions" role="tabpanel">
            <span id="action-source-chip">-</span>
            <div id="action-buttons"></div>
            <h3 id="action-output-title">結果</h3>
            <textarea id="action-output"></textarea>
            <button id="copy-action-output" disabled>コピー</button>
            <button id="open-calendar" hidden>Googleカレンダー</button>
            <button id="download-ics" hidden>.ics</button>
          </section>
          <section class="pane" id="pane-table" role="tabpanel"></section>
          <section class="pane" id="pane-settings" role="tabpanel">
            <input type="password" id="openai-token" />
          </section>
        </div>
      </main>
      <div id="menu-scrim"></div>
      <aside id="menu-drawer">
        <button id="menu-close" type="button">close</button>
        <a class="menu-item" data-target="pane-actions" href="#pane-actions"></a>
        <a class="menu-item" data-target="pane-table" href="#pane-table"></a>
        <a class="menu-item" data-target="pane-settings" href="#pane-settings"></a>
      </aside>
      <aside class="sidebar">
        <button id="sidebar-toggle" type="button" aria-label="メニューを切り替え" aria-pressed="false">toggle</button>
        <a class="nav-item active" data-target="pane-actions" href="#pane-actions" role="tab"></a>
        <a class="nav-item" data-target="pane-table" href="#pane-table" role="tab"></a>
        <a class="nav-item" data-target="pane-settings" href="#pane-settings" role="tab"></a>
      </aside>
    </body>
  </html>`;

  return new JSDOM(html, { url: 'chrome-extension://test/popup.html#pane-actions' });
}

function createChromeStub(overrides?: Partial<ChromeStub>): ChromeStub {
  const runtime = {
    lastError: null as { message: string } | null,
    sendMessage: vi.fn(),
  };

  const chromeStub: ChromeStub = {
    runtime,
    storage: {
      sync: {
        get: vi.fn(),
        set: vi.fn((_items: unknown, callback: () => void) => {
          runtime.lastError = null;
          callback();
        }),
      },
      local: {
        get: vi.fn(),
        set: vi.fn((_items: unknown, callback: () => void) => {
          runtime.lastError = null;
          callback();
        }),
        remove: vi.fn((_keys: unknown, callback: () => void) => {
          runtime.lastError = null;
          callback();
        }),
      },
    },
    tabs: {
      query: vi.fn(),
    },
  };

  return { ...chromeStub, ...overrides };
}

async function flush(window: Window, times = 5): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await new Promise<void>(resolve => window.setTimeout(resolve, 0));
  }
}

describe('popup context actions (src/popup.ts)', () => {
  let dom: JSDOM;
  let chromeStub: ChromeStub;

  beforeEach(async () => {
    vi.resetModules();

    dom = createPopupDom();
    chromeStub = createChromeStub();

    chromeStub.storage.sync.get.mockImplementation((keys: string[], callback: (items: unknown) => void) => {
      chromeStub.runtime.lastError = null;
      const keyList = Array.isArray(keys) ? keys : [String(keys)];
      if (keyList.includes('contextActions')) {
        callback({
          contextActions: [
            { id: 'builtin:summarize', title: '要約', kind: 'text', prompt: '{{text}}' },
            { id: 'builtin:calendar', title: 'カレンダー登録する', kind: 'event', prompt: '' },
          ],
        });
        return;
      }
      if (keyList.includes('autoEnableSort')) {
        callback({ autoEnableSort: false });
        return;
      }
      if (keyList.includes('domainPatterns')) {
        callback({ domainPatterns: [] });
        return;
      }
      callback({});
    });

    chromeStub.storage.local.get.mockImplementation((keys: string[], callback: (items: unknown) => void) => {
      chromeStub.runtime.lastError = null;
      const keyList = Array.isArray(keys) ? keys : [String(keys)];
      if (keyList.includes('openaiApiToken')) {
        callback({ openaiApiToken: 'sk-test' });
        return;
      }
      if (keyList.includes('openaiCustomPrompt')) {
        callback({ openaiCustomPrompt: '' });
        return;
      }
      callback({});
    });

    chromeStub.tabs.query.mockImplementation((queryInfo: unknown, callback: (tabs: unknown[]) => void) => {
      chromeStub.runtime.lastError = null;
      callback([{ id: 1, queryInfo }]);
    });

    chromeStub.runtime.sendMessage.mockImplementation((message: unknown, callback: (resp: unknown) => void) => {
      chromeStub.runtime.lastError = null;
      const action = (message as { action?: unknown }).action;
      if (action === 'runContextAction') {
        callback({ ok: true, resultType: 'text', text: 'summary', source: 'selection' });
        return;
      }
      callback({ ok: true });
    });

    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('navigator', dom.window.navigator);
    vi.stubGlobal('chrome', chromeStub);

    await import('../src/popup.ts');
    await flush(dom.window);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('runs builtin:summarize and renders the result', async () => {
    const button = dom.window.document.querySelector<HTMLButtonElement>('button[data-action-id="builtin:summarize"]');
    expect(button?.textContent).toBe('要約');

    button?.click();
    await flush(dom.window);

    expect(dom.window.document.getElementById('action-output-title')?.textContent).toBe('要約');
    expect((dom.window.document.getElementById('action-output') as HTMLTextAreaElement | null)?.value).toBe('summary');
    expect((dom.window.document.getElementById('copy-action-output') as HTMLButtonElement | null)?.disabled).toBe(
      false,
    );
    expect(dom.window.document.getElementById('action-source-chip')?.textContent).toBe('選択範囲');

    expect(chromeStub.runtime.sendMessage).toHaveBeenCalled();
  });

  it('does not crash when background returns an invalid response', async () => {
    chromeStub.runtime.sendMessage.mockImplementationOnce((_message: unknown, callback: (resp: unknown) => void) => {
      chromeStub.runtime.lastError = null;
      callback(undefined);
    });

    const button = dom.window.document.querySelector<HTMLButtonElement>('button[data-action-id="builtin:summarize"]');
    button?.click();
    await flush(dom.window);

    expect((dom.window.document.getElementById('action-output') as HTMLTextAreaElement | null)?.value).toBe('');
  });
});
