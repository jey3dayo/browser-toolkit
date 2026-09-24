// QRコードオーバーレイ（Shadow DOM + DOM API、Reactなし）
import QRCode from "qrcode";
import { ensureShadowMount } from "@/content/shadow_mount";
import { t } from "@/i18n";
import { activateModal, type DeactivateModal } from "@/ui/modal-controller";
import type { Theme } from "@/ui/theme";

const QR_HOST_ID = "browser-toolkit-qrcode";
const QR_ROOT_ID = "mtk-qrcode-root";

let currentQrHost: HTMLDivElement | null = null;
let currentDeactivateModal: DeactivateModal | null = null;

function removeCurrentOverlay(): void {
  if (currentQrHost) {
    currentQrHost.remove();
    currentQrHost = null;
  }
  const existing = document.getElementById(QR_HOST_ID);
  if (existing instanceof window.HTMLDivElement) {
    existing.remove();
  }
  if (currentDeactivateModal) {
    currentDeactivateModal();
    currentDeactivateModal = null;
  }
}

function createCloseButton(onClose: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = t("qrCodeOverlay.close");
  btn.className = "btn btn-primary";
  btn.style.cssText = [
    "margin-top: var(--spacing-sm)",
    "font-size: var(--font-size-md)",
  ].join(";");
  btn.addEventListener("click", onClose);
  return btn;
}

type Dialog = {
  backdrop: HTMLDivElement;
  closeButton: HTMLButtonElement;
};

function createDialog(url: string, onClose: () => void): Dialog {
  const titleId = "mtk-qrcode-title";
  const backdrop = document.createElement("div");
  backdrop.style.cssText = [
    "position: fixed",
    "inset: 0",
    "background: var(--color-scrim)",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "z-index: 2147483647",
  ].join(";");
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      onClose();
    }
  });

  const card = document.createElement("div");
  card.setAttribute("aria-labelledby", titleId);
  card.setAttribute("aria-modal", "true");
  card.setAttribute("role", "dialog");
  card.style.cssText = [
    "background: var(--mbu-surface)",
    "color: var(--mbu-text)",
    "border: 1px solid var(--mbu-border)",
    "border-radius: var(--radius-md)",
    "padding: var(--spacing-lg)",
    "display: flex",
    "flex-direction: column",
    "align-items: center",
    "gap: var(--spacing-sm)",
    "box-shadow: var(--mbu-shadow)",
    "max-width: 320px",
    "width: 100%",
  ].join(";");

  const title = document.createElement("p");
  title.id = titleId;
  title.textContent = t("qrCodeOverlay.title");
  title.style.cssText =
    "margin: 0; font-size: var(--font-size-lg); font-weight: bold;";

  const canvas = document.createElement("canvas");

  const urlText = document.createElement("p");
  urlText.textContent = url;
  urlText.style.cssText = [
    "margin: 0",
    "font-size: var(--font-size-xs)",
    "color: var(--mbu-text-muted)",
    "word-break: break-all",
    "max-width: 240px",
    "text-align: center",
  ].join(";");

  const closeButton = createCloseButton(onClose);

  card.appendChild(title);
  card.appendChild(canvas);
  card.appendChild(urlText);
  card.appendChild(closeButton);
  backdrop.appendChild(card);

  QRCode.toCanvas(canvas, url, { margin: 2, width: 200 }).catch(() => {
    const errorMsg = document.createElement("p");
    errorMsg.textContent = t("qrCodeOverlay.errors.generation");
    errorMsg.style.cssText = "margin: 0; color: var(--mbu-danger);";
    canvas.replaceWith(errorMsg);
  });

  return { backdrop, closeButton };
}

export function showQrCodeOverlay(url: string, theme: Theme): void {
  removeCurrentOverlay();

  const onClose = (): void => {
    removeCurrentOverlay();
  };

  const mount = ensureShadowMount({
    hostId: QR_HOST_ID,
    rootId: QR_ROOT_ID,
    theme,
  });
  currentQrHost = mount.host;

  const { backdrop, closeButton } = createDialog(url, onClose);
  mount.shadow.appendChild(backdrop);

  currentDeactivateModal = activateModal({
    getActiveElement: () => mount.shadow.activeElement,
    getFocusables: () => [closeButton],
    onClose,
  });

  closeButton.focus();
}
