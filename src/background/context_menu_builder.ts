/**
 * Context menu builder utilities.
 * Provides reusable helpers for creating context menu items.
 */

/**
 * Creates a context menu item with Promise-based error handling.
 *
 * @param options - Chrome context menu create options
 * @returns Promise that resolves when the menu item is created
 * @throws Error if chrome.runtime.lastError occurs
 */
export function createMenuItem(
  options: chrome.contextMenus.CreateProperties
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    chrome.contextMenus.create(options, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Creates a separator context menu item.
 *
 * @param id - Unique separator ID
 * @param parentId - Parent menu ID
 * @param contexts - Menu contexts where the separator appears
 * @returns Promise that resolves when the separator is created
 */
export function createSeparator(
  id: string,
  parentId: string,
  contexts: chrome.contextMenus.CreateProperties["contexts"]
): Promise<void> {
  return createMenuItem({
    id,
    parentId,
    type: "separator",
    contexts,
  });
}

/**
 * Removes all context menus.
 *
 * @returns Promise that resolves when all menus are removed
 */
export function removeAllMenus(): Promise<void> {
  return new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });
}
