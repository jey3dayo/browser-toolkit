import type { JSDOM } from 'jsdom';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from './helpers/async';
import { createPopupChromeStub, type PopupChromeStub } from './helpers/popupChromeStub';
import { createPopupDom } from './helpers/popupDom';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('popup Actions pane: event output actions', () => {
  let dom: JSDOM;
  let chromeStub: PopupChromeStub;

  beforeEach(async () => {
    vi.resetModules();

    dom = createPopupDom();
    chromeStub = createPopupChromeStub();

    chromeStub.storage.sync.get.mockImplementation((keys: string[], callback: (items: unknown) => void) => {
      chromeStub.runtime.lastError = null;
      const keyList = Array.isArray(keys) ? keys : [String(keys)];
      if (keyList.includes('contextActions')) {
        callback({
          contextActions: [{ id: 'builtin:calendar', title: 'カレンダー登録', kind: 'event', prompt: '' }],
        });
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
      callback({});
    });

    chromeStub.tabs.query.mockImplementation((_queryInfo: unknown, callback: (tabs: unknown[]) => void) => {
      chromeStub.runtime.lastError = null;
      callback([{ id: 1 }]);
    });

    chromeStub.runtime.sendMessage.mockImplementation((message: unknown, callback: (resp: unknown) => void) => {
      chromeStub.runtime.lastError = null;
      const action = (message as { action?: unknown }).action;
      if (action === 'runContextAction') {
        callback({
          ok: true,
          resultType: 'event',
          event: { title: 'ミーティング', start: '2025-01-01', allDay: true },
          eventText: '予定: ミーティング',
          calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
          source: 'selection',
        });
        return;
      }
      callback({ ok: true });
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

    Object.defineProperty(dom.window.URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:mbu-test'),
    });
    Object.defineProperty(dom.window.URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal('URL', dom.window.URL);

    await act(async () => {
      await import('@/popup.ts');
      await flush(dom.window);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the calendar URL via chrome.tabs.create', async () => {
    const runButton = dom.window.document.querySelector<HTMLButtonElement>('button[data-action-id="builtin:calendar"]');
    await act(async () => {
      runButton?.click();
      await flush(dom.window);
    });

    const openButton = dom.window.document.querySelector<HTMLButtonElement>('[data-testid="open-calendar"]');
    expect(openButton).not.toBeNull();

    await act(async () => {
      openButton?.click();
      await flush(dom.window);
    });

    expect(chromeStub.tabs.create).toHaveBeenCalledWith({
      url: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
    });
  });

  it('downloads an .ics file for event results', async () => {
    const runButton = dom.window.document.querySelector<HTMLButtonElement>('button[data-action-id="builtin:calendar"]');
    await act(async () => {
      runButton?.click();
      await flush(dom.window);
    });

    const clickSpy = vi.spyOn(dom.window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const downloadButton = dom.window.document.querySelector<HTMLButtonElement>('[data-testid="download-ics"]');
    expect(downloadButton).not.toBeNull();

    await act(async () => {
      downloadButton?.click();
      await flush(dom.window);
    });

    expect((URL as unknown as { createObjectURL: ReturnType<typeof vi.fn> }).createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
