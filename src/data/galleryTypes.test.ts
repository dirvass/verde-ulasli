import { describe, it, expect } from "vitest";
import { validateManifest, type GalleryManifest } from "./galleryTypes";

const good: GalleryManifest = {
  items: [
    { id: "a", type: "image", src: "/media/x.jpg", category: "interior", front: "big", caption: "Room" },
    { id: "b", type: "image", src: "/api/media/up/123.jpg", category: "exterior", front: "off", caption: "" },
  ],
};

describe("validateManifest", () => {
  it("accepts a well-formed manifest", () => {
    expect(validateManifest(good)).toEqual(good);
  });

  it("rejects external / unsafe src", () => {
    expect(validateManifest({ items: [{ ...good.items[0], src: "https://evil.com/x.jpg" }] })).toBeNull();
    expect(validateManifest({ items: [{ ...good.items[0], src: "javascript:alert(1)" }] })).toBeNull();
  });

  it("rejects bad enums", () => {
    expect(validateManifest({ items: [{ ...good.items[0], category: "garden" }] })).toBeNull();
    expect(validateManifest({ items: [{ ...good.items[0], front: "huge" }] })).toBeNull();
  });

  it("rejects non-array or oversized item lists", () => {
    expect(validateManifest({ items: "x" })).toBeNull();
    expect(validateManifest({ items: Array(601).fill(good.items[0]) })).toBeNull();
  });

  it("rejects duplicate ids", () => {
    expect(validateManifest({ items: [good.items[0], good.items[0]] })).toBeNull();
  });

  it("strips html and caps caption length", () => {
    const out = validateManifest({ items: [{ ...good.items[0], caption: "<b>hi</b>".padEnd(400, "x") }] });
    expect(out).not.toBeNull();
    expect(out!.items[0].caption.includes("<")).toBe(false);
    expect(out!.items[0].caption.length).toBeLessThanOrEqual(300);
  });
});
