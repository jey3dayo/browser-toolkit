import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('popup_bootstrap.js', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    delete (globalThis as unknown as { __MBU_POPUP_LOADED__?: boolean }).__MBU_POPUP_LOADED__;
  });

  it('shows a banner when popup logic is not loaded', async () => {
    vi.stubGlobal('chrome', { runtime: {} });

    // @ts-expect-error - plain JS side-effect module
    await import('../popup_bootstrap.js');

    expect(document.getElementById('mbu-build-error')).not.toBeNull();
  });

  it('does nothing when popup logic is loaded', async () => {
    (globalThis as unknown as { __MBU_POPUP_LOADED__?: boolean }).__MBU_POPUP_LOADED__ = true;
    vi.stubGlobal('chrome', { runtime: {} });

    // @ts-expect-error - plain JS side-effect module
    await import('../popup_bootstrap.js');

    expect(document.getElementById('mbu-build-error')).toBeNull();
  });
});
