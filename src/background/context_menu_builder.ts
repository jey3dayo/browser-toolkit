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

export function createSeparator(
  id: string,
  parentId: string,
  contexts: chrome.contextMenus.CreateProperties["contexts"]
): Promise<void> {
  return createMenuItem({
    contexts,
    id,
    parentId,
    type: "separator",
  });
}

export function removeAllMenus(): Promise<void> {
  return new Promise<void>((resolve) => {
    chrome.contextMenus.removeAll(() => resolve());
  });
}
