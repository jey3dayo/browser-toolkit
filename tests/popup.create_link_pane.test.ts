import type { JSDOM } from 'jsdom';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from './helpers/async';
import { createPopupChromeStub, type PopupChromeStub } from './helpers/popupChromeStub';
import { createPopupDom } from './helpers/popupDom';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('popup create link pane', () => {
  let dom: JSDOM;
  let chromeStub: PopupChromeStub;

  beforeEach(async () => {
    vi.resetModules();

    dom = createPopupDom('chrome-extension://test/popup.html#pane-create-link');
    chromeStub = createPopupChromeStub();

    chromeStub.tabs.query
      .mockImplementationOnce((_queryInfo: unknown, callback: (tabs: unknown[]) => void) => {
        chromeStub.runtime.lastError = null;
        callback([{ id: 1, title: 'Example Title', url: 'https://example.com/path?q=1' }]);
      })
      .mockImplementationOnce((_queryInfo: unknown, callback: (tabs: unknown[]) => void) => {
        chromeStub.runtime.lastError = null;
        callback([{ id: 1, title: 'Next Title', url: 'https://example.com/next' }]);
      });

    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('document', dom.window.document);
    vi.stubGlobal('navigator', dom.window.navigator);
    vi.stubGlobal('chrome', chromeStub);

    Object.defineProperty(dom.window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    });

    await act(async () => {
      await import('@/popup.ts');
      await flush(dom.window);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads active tab title/url, formats markdown, and copies to clipboard', async () => {
    const titleInput = dom.window.document.querySelector<HTMLInputElement>('[data-testid="create-link-title"]');
    const urlInput = dom.window.document.querySelector<HTMLInputElement>('[data-testid="create-link-url"]');
    const output = dom.window.document.querySelector<HTMLTextAreaElement>('[data-testid="create-link-output"]');
    expect(titleInput?.value).toBe('Example Title');
    expect(urlInput?.value).toBe('https://example.com/path?q=1');
    expect(output?.value).toBe('[Example Title](<https://example.com/path?q=1>)');

    const copyButton = dom.window.document.querySelector<HTMLButtonElement>('[data-testid="create-link-copy"]');
    await act(async () => {
      copyButton?.click();
      await flush(dom.window);
    });

    const clipboard = dom.window.navigator.clipboard as unknown as { writeText: ReturnType<typeof vi.fn> };
    expect(clipboard.writeText).toHaveBeenCalledWith('[Example Title](<https://example.com/path?q=1>)');
    expect(dom.window.document.body.textContent).toContain('コピーしました');
  });

  it('refreshes from active tab', async () => {
    const refreshButton = dom.window.document.querySelector<HTMLButtonElement>('[data-testid="create-link-refresh"]');
    await act(async () => {
      refreshButton?.click();
      await flush(dom.window);
    });

    const titleInput = dom.window.document.querySelector<HTMLInputElement>('[data-testid="create-link-title"]');
    const urlInput = dom.window.document.querySelector<HTMLInputElement>('[data-testid="create-link-url"]');
    const output = dom.window.document.querySelector<HTMLTextAreaElement>('[data-testid="create-link-output"]');
    expect(titleInput?.value).toBe('Next Title');
    expect(urlInput?.value).toBe('https://example.com/next');
    expect(output?.value).toBe('[Next Title](<https://example.com/next>)');
    expect(dom.window.document.body.textContent).toContain('現在のタブから更新しました');
  });
});
