import { afterEach, describe, expect, it } from "vitest";
import { pickTargetImage } from "@/image-zoom/x-adapter";

const MEDIA_URL =
  "https://pbs.twimg.com/media/AbCdEfGh?format=jpg&name=4096x4096";
const NON_MEDIA_URL = "https://pbs.twimg.com/profile_images/123/avatar.jpg";
const IMG_RECT = { bottom: 400, left: 100, right: 500, top: 100 };
const POINT_INSIDE_RECT = { x: 300, y: 250 };
const POINT_OUTSIDE_RECT = { x: 10, y: 10 };

function stubRect(
  el: Element,
  rect: { top: number; left: number; right: number; bottom: number }
): void {
  el.getBoundingClientRect = () => ({
    bottom: rect.bottom,
    height: rect.bottom - rect.top,
    left: rect.left,
    right: rect.right,
    toJSON() {
      return this;
    },
    top: rect.top,
    width: rect.right - rect.left,
    x: rect.left,
    y: rect.top,
  });
}

function buildMediaImg(): HTMLImageElement {
  const img = document.createElement("img");
  img.src = MEDIA_URL;
  stubRect(img, IMG_RECT);
  return img;
}

function buildModal(): HTMLDivElement {
  const modal = document.createElement("div");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  document.body.appendChild(modal);
  return modal;
}

function buildSwipeStack(
  modal: HTMLDivElement,
  img: HTMLImageElement
): Element[] {
  const swipeDiv = document.createElement("div");
  swipeDiv.setAttribute("data-testid", "swipe-to-dismiss");
  const figureWrapper = document.createElement("div");
  figureWrapper.setAttribute("aria-label", "画像");
  const innerDiv = document.createElement("div");

  figureWrapper.appendChild(img);
  innerDiv.appendChild(figureWrapper);
  swipeDiv.appendChild(innerDiv);
  modal.appendChild(swipeDiv);

  const maskDiv = document.createElement("div");
  maskDiv.setAttribute("data-testid", "mask");
  document.body.appendChild(maskDiv);

  return [swipeDiv, innerDiv, figureWrapper, modal, maskDiv];
}

describe("image-zoom x-adapter: pickTargetImage", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns the img when the click point is inside its rect, even though the stack does not contain the img (X's real click-through behavior)", () => {
    const modal = buildModal();
    const img = buildMediaImg();
    const stack = buildSwipeStack(modal, img);

    expect(stack.includes(img)).toBe(false);
    expect(pickTargetImage(stack, POINT_INSIDE_RECT)).toBe(img);
  });

  it("returns null when the click point is outside the img rect", () => {
    const modal = buildModal();
    const img = buildMediaImg();
    const stack = buildSwipeStack(modal, img);

    expect(pickTargetImage(stack, POINT_OUTSIDE_RECT)).toBeNull();
  });

  it("returns null when the top of the stack is an interactive element inside the modal", () => {
    const modal = buildModal();
    const img = buildMediaImg();
    const stack = buildSwipeStack(modal, img);
    const button = document.createElement("button");
    modal.appendChild(button);

    expect(pickTargetImage([button, ...stack], POINT_INSIDE_RECT)).toBeNull();
  });

  it("returns null when the top of the stack has no aria-modal ancestor", () => {
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    expect(pickTargetImage([outside], POINT_INSIDE_RECT)).toBeNull();
  });

  it("returns null when the media img is inside an <a> ancestor", () => {
    const modal = buildModal();
    const img = buildMediaImg();
    const stack = buildSwipeStack(modal, img);
    const anchor = document.createElement("a");
    img.replaceWith(anchor);
    anchor.appendChild(img);

    expect(pickTargetImage(stack, POINT_INSIDE_RECT)).toBeNull();
  });

  it("returns null when the img at the point is not a target media image", () => {
    const modal = buildModal();
    const img = buildMediaImg();
    img.src = NON_MEDIA_URL;
    const stack = buildSwipeStack(modal, img);

    expect(pickTargetImage(stack, POINT_INSIDE_RECT)).toBeNull();
  });

  it("prefers the image under the topmost stack layer when two photos overlap (carousel)", () => {
    const modal = buildModal();

    const wrapperA = document.createElement("div");
    wrapperA.setAttribute("data-testid", "carousel-item-a");
    const photoA = buildMediaImg();
    wrapperA.appendChild(photoA);
    modal.appendChild(wrapperA);

    const wrapperB = document.createElement("div");
    wrapperB.setAttribute("data-testid", "carousel-item-b");
    const photoB = buildMediaImg();
    wrapperB.appendChild(photoB);
    modal.appendChild(wrapperB);

    expect(modal.querySelectorAll("img")[0]).toBe(photoA);

    const stack = [wrapperB, modal];

    expect(pickTargetImage(stack, POINT_INSIDE_RECT)).toBe(photoB);
  });
});
