import { describe, it, expect } from "vitest";
import {
  IDENTITY_TRANSFORM,
  MAX_SCALE,
  classifySwipe,
  clampPan,
  clampScale,
  distance,
  isZoomed,
  midpoint,
  panTransform,
  pinchTransform,
  zoomAbout,
  type Transform,
} from "./lightboxGestures";

const stage = { width: 400, height: 800 };

describe("geometry helpers", () => {
  it("measures distance and midpoint between two touch points", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });

  it("clamps scale into the allowed range", () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(2)).toBe(2);
    expect(clampScale(99)).toBe(MAX_SCALE);
  });

  it("treats only a meaningful scale as zoomed", () => {
    expect(isZoomed(IDENTITY_TRANSFORM)).toBe(false);
    expect(isZoomed({ scale: 1.005, x: 0, y: 0 })).toBe(false);
    expect(isZoomed({ scale: 1.5, x: 0, y: 0 })).toBe(true);
  });
});

describe("classifySwipe", () => {
  it("navigates on a decisive horizontal swipe", () => {
    expect(classifySwipe(-120, 10, IDENTITY_TRANSFORM)).toBe("next");
    expect(classifySwipe(120, 10, IDENTITY_TRANSFORM)).toBe("prev");
  });

  it("closes on a decisive downward swipe", () => {
    expect(classifySwipe(5, 140, IDENTITY_TRANSFORM)).toBe("close");
  });

  it("ignores an upward swipe", () => {
    expect(classifySwipe(5, -140, IDENTITY_TRANSFORM)).toBeNull();
  });

  it("ignores short or diagonal drags", () => {
    expect(classifySwipe(20, 4, IDENTITY_TRANSFORM)).toBeNull();
    expect(classifySwipe(70, 70, IDENTITY_TRANSFORM)).toBeNull();
  });

  // The bug Ahmed hit: a pinch drags one finger a long way sideways, which the
  // old handler read as a swipe and silently changed the picture mid-zoom.
  it("never navigates while the image is zoomed", () => {
    const zoomed: Transform = { scale: 2.4, x: 0, y: 0 };
    expect(classifySwipe(-300, 0, zoomed)).toBeNull();
    expect(classifySwipe(300, 0, zoomed)).toBeNull();
    expect(classifySwipe(0, 300, zoomed)).toBeNull();
  });
});

describe("clampPan", () => {
  const media = { width: 400, height: 300 };

  it("re-centres an axis that fully fits the stage", () => {
    const out = clampPan({ scale: 1, x: 80, y: 50 }, media, stage);
    expect(out).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it("allows panning only as far as the overflowing edge", () => {
    // 2x → 800x600 media inside a 400x800 stage: 200px slack on x, none on y.
    const out = clampPan({ scale: 2, x: 500, y: 500 }, media, stage);
    expect(out.x).toBe(200);
    expect(out.y).toBe(0);
    expect(clampPan({ scale: 2, x: -500, y: 0 }, media, stage).x).toBe(-200);
  });

  it("leaves an in-bounds offset untouched", () => {
    expect(clampPan({ scale: 2, x: 40, y: 0 }, media, stage)).toEqual({ scale: 2, x: 40, y: 0 });
  });

  // An unmeasured image shouldn't clobber a live pinch — centre it, keep the scale.
  it("survives a zero-sized media box", () => {
    expect(clampPan({ scale: 2, x: 10, y: 10 }, { width: 0, height: 0 }, stage)).toEqual({ scale: 2, x: 0, y: 0 });
  });
});

describe("pinchTransform", () => {
  it("scales by the ratio the fingers spread", () => {
    const out = pinchTransform(
      { a: { x: 150, y: 400 }, b: { x: 250, y: 400 }, transform: IDENTITY_TRANSFORM },
      { a: { x: 100, y: 400 }, b: { x: 300, y: 400 } },
      stage,
    );
    expect(out.scale).toBeCloseTo(2, 5);
  });

  it("keeps the pinched point anchored under the fingers", () => {
    // Fingers centred on a point 100px left of the stage centre, then spread 2x
    // without moving that midpoint: the same pixel must stay put.
    const start = { a: { x: 50, y: 400 }, b: { x: 150, y: 400 }, transform: IDENTITY_TRANSFORM };
    const out = pinchTransform(start, { a: { x: 0, y: 400 }, b: { x: 200, y: 400 } }, stage);
    // Midpoint is at x=100, i.e. -100 from the stage centre. Doubling about it
    // means the content must shift right by 100.
    expect(out.scale).toBeCloseTo(2, 5);
    expect(out.x).toBeCloseTo(100, 5);
    expect(out.y).toBeCloseTo(0, 5);
  });

  it("follows the fingers when the whole pinch is dragged", () => {
    const start = { a: { x: 190, y: 400 }, b: { x: 210, y: 400 }, transform: IDENTITY_TRANSFORM };
    const out = pinchTransform(start, { a: { x: 240, y: 430 }, b: { x: 260, y: 430 } }, stage);
    expect(out.scale).toBeCloseTo(1, 5);
    expect(out.x).toBeCloseTo(50, 5);
    expect(out.y).toBeCloseTo(30, 5);
  });

  it("does not drift once the scale hits its ceiling", () => {
    const start = { a: { x: 199, y: 400 }, b: { x: 201, y: 400 }, transform: IDENTITY_TRANSFORM };
    const out = pinchTransform(start, { a: { x: 0, y: 400 }, b: { x: 400, y: 400 } }, stage);
    expect(out.scale).toBe(MAX_SCALE);
  });

  it("ignores a degenerate zero-distance start", () => {
    const start = { a: { x: 200, y: 400 }, b: { x: 200, y: 400 }, transform: IDENTITY_TRANSFORM };
    const out = pinchTransform(start, { a: { x: 100, y: 400 }, b: { x: 300, y: 400 } }, stage);
    expect(Number.isFinite(out.scale)).toBe(true);
    expect(out.scale).toBe(1);
  });
});

describe("zoomAbout", () => {
  it("zooms into the tapped point", () => {
    const out = zoomAbout(IDENTITY_TRANSFORM, { x: 100, y: 400 }, stage, 2);
    expect(out.scale).toBe(2);
    expect(out.x).toBeCloseTo(100, 5);
  });

  it("snaps back to a centred, unzoomed image", () => {
    expect(zoomAbout({ scale: 3, x: 120, y: -40 }, { x: 10, y: 10 }, stage, 1)).toEqual(IDENTITY_TRANSFORM);
  });
});

describe("panTransform", () => {
  it("offsets from where the drag began", () => {
    const out = panTransform({ scale: 2, x: 10, y: 10 }, { x: 100, y: 100 }, { x: 130, y: 60 });
    expect(out).toEqual({ scale: 2, x: 40, y: -30 });
  });
});
