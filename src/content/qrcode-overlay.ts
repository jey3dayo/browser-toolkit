// QRコードオーバーレイ（Shadow DOM + DOM API、Reactなし）
import QRCode from "qrcode";
import { ensureShadowMount } from "@/content/shadow_mount";
import type { Theme } from "@/ui/theme";

const QR_HOST_ID = "browser-toolkit-qrcode";
const QR_ROOT_ID = "mtk-qrcode-root";

let currentQrHost: HTMLDivElement | null = null;

function removeCurrentOverlay(): void {
  if (currentQrHost) {
    currentQrHost.remove();
    currentQrHost = null;
  }
  const existing = document.getElementById(QR_HOST_ID) as HTMLDivElement | null;
  if (existing) {
    existing.remove();
  }
}

function createCloseButton(onClose: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = "閉じる";
  btn.style.cssText = [
    "margin-top: 12px",
    "padding: 6px 20px",
    "border: none",
    "border-radius: 6px",
    "background: var(--color-primary, #4285f4)",
    "color: #fff",
    "font-size: 14px",
    "cursor: pointer",
  ].join(";");
  btn.addEventListener("click", onClose);
  return btn;
}

function createDialog(url: string, onClose: () => void): HTMLDivElement {
  const backdrop = document.createElement("div");
  backdrop.style.cssText = [
    "position: fixed",
    "inset: 0",
    "background: rgba(0,0,0,0.5)",
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
  card.style.cssText = [
    "background: var(--color-bg-base, #fff)",
    "color: var(--color-text-primary, #333)",
    "border-radius: 12px",
    "padding: 24px",
    "display: flex",
    "flex-direction: column",
    "align-items: center",
    "gap: 12px",
    "box-shadow: 0 8px 32px rgba(0,0,0,0.24)",
    "max-width: 320px",
    "width: 100%",
  ].join(";");

  const title = document.createElement("p");
  title.textContent = "QRコード";
  title.style.cssText = "margin: 0; font-size: 16px; font-weight: bold;";

  const canvas = document.createElement("canvas");

  const urlText = document.createElement("p");
  urlText.textContent = url;
  urlText.style.cssText = [
    "margin: 0",
    "font-size: 11px",
    "word-break: break-all",
    "max-width: 240px",
    "text-align: center",
    "opacity: 0.7",
  ].join(";");

  const closeBtn = createCloseButton(onClose);

  card.appendChild(title);
  card.appendChild(canvas);
  card.appendChild(urlText);
  card.appendChild(closeBtn);
  backdrop.appendChild(card);

  QRCode.toCanvas(canvas, url, { width: 200, margin: 2 }).catch(() => {
    const errorMsg = document.createElement("p");
    errorMsg.textContent = "QRコードの生成に失敗しました";
    errorMsg.style.cssText = "margin: 0; color: var(--color-error, #e53935);";
    canvas.replaceWith(errorMsg);
  });

  return backdrop;
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

  const dialog = createDialog(url, onClose);
  mount.shadow.appendChild(dialog);

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", handleKeyDown);
      onClose();
    }
  };
  document.addEventListener("keydown", handleKeyDown);
}
