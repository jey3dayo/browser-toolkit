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
        const message = err.message ?? "Failed to create context menu item";
        if (isDuplicateIdError(message) && options.id !== undefined) {
          updateMenuItem(options.id, options).then(resolve, reject);
          return;
        }
        reject(new Error(message));
        return;
      }
      resolve();
    });
  });
}

function isDuplicateIdError(message: string): boolean {
  return message.includes("Cannot create item with duplicate id");
}

function updateMenuItem(
  id: string | number,
  options: chrome.contextMenus.CreateProperties
): Promise<void> {
  const { id: _id, ...updateProperties } = options;
  return new Promise<void>((resolve, reject) => {
    chrome.contextMenus.update(id, updateProperties, () => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? "Failed to update context menu item"));
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
