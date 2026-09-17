import { BLOCKLIST_BLOCKED_ATTR, BLOCKLIST_REVEALED_ATTR } from "./types";

export function insertEarlyBlocklistStyle(doc: Document): void {
  const style = doc.createElement("style");
  style.textContent = [
    `[${BLOCKLIST_BLOCKED_ATTR}="1"]{display:none!important;}`,
    `[${BLOCKLIST_BLOCKED_ATTR}="1"][${BLOCKLIST_REVEALED_ATTR}="1"]{display:revert!important;opacity:.5!important;}`,
  ].join("\n");
  doc.documentElement.appendChild(style);
}
