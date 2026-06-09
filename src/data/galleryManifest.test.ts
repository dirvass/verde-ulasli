import { describe, it, expect } from "vitest";
import { DEFAULT_MANIFEST } from "./galleryManifest";
import { validateManifest } from "./galleryTypes";

describe("DEFAULT_MANIFEST", () => {
  it("is a valid manifest with every MEDIA item mapped", () => {
    expect(DEFAULT_MANIFEST.items.length).toBeGreaterThan(50);
    expect(validateManifest(DEFAULT_MANIFEST)).not.toBeNull();
    for (const it of DEFAULT_MANIFEST.items) {
      expect(["interior", "exterior", "construction"]).toContain(it.category);
      expect(["off", "big", "small"]).toContain(it.front);
      expect(it.caption.length).toBeGreaterThan(0);
    }
  });

  it("puts the infinity pool first with front=big", () => {
    expect(DEFAULT_MANIFEST.items[0].id).toBe("ext-havuz-deniz");
    expect(DEFAULT_MANIFEST.items[0].front).toBe("big");
  });

  it("marks the garden aerial as a big front item", () => {
    const aerial = DEFAULT_MANIFEST.items.find((i) => i.id === "ext2-bahce-patika");
    expect(aerial?.front).toBe("big");
  });

  it("has no duplicate ids", () => {
    const ids = DEFAULT_MANIFEST.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
