import { afterEach, describe, expect, it } from "vitest";
import { pickTargetImage } from "@/image-zoom/x-adapter";

const MEDIA_URL = "https://pbs.twimg.com/media/AbCdEfGh?format=webp&name=large";

function buildMediaImg(): HTMLImageElement {
  const img = document.createElement("img");
  img.src = MEDIA_URL;
  return img;
}

function buildModal(): HTMLDivElement {
  const modal = document.createElement("div");
  modal.setAttribute("aria-modal", "true");
  document.body.appendChild(modal);
  return modal;
}

describe("image-zoom x-adapter: pickTargetImage", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns null when a button is reached before the media img", () => {
    const modal = buildModal();
    const button = document.createElement("button");
    const img = buildMediaImg();
    modal.appendChild(button);
    modal.appendChild(img);

    expect(pickTargetImage([button, img])).toBeNull();
  });

  it("returns null when an <a> is reached before the media img", () => {
    const modal = buildModal();
    const anchor = document.createElement("a");
    const img = buildMediaImg();
    modal.appendChild(anchor);
    modal.appendChild(img);

    expect(pickTargetImage([anchor, img])).toBeNull();
  });

  it("returns null when the media img has no aria-modal ancestor", () => {
    const img = buildMediaImg();
    document.body.appendChild(img);

    expect(pickTargetImage([img])).toBeNull();
  });

  it("returns null when the media img is inside an <a> ancestor", () => {
    const modal = buildModal();
    const anchor = document.createElement("a");
    const img = buildMediaImg();
    anchor.appendChild(img);
    modal.appendChild(anchor);

    expect(pickTargetImage([img])).toBeNull();
  });

  it("returns the img when a non-interactive overlay div sits on top inside the modal", () => {
    const modal = buildModal();
    const overlayDiv = document.createElement("div");
    const img = buildMediaImg();
    modal.appendChild(overlayDiv);
    modal.appendChild(img);

    expect(pickTargetImage([overlayDiv, img])).toBe(img);
  });
});
