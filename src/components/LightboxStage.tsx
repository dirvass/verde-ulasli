import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  DOUBLE_TAP_SCALE,
  IDENTITY_TRANSFORM,
  classifySwipe,
  clampPan,
  isZoomed,
  panTransform,
  pinchTransform,
  zoomAbout,
  type Box,
  type Point,
  type Transform,
} from "../lib/lightboxGestures";
import type { GalleryItem } from "../data/galleryTypes";

/** How much of the finger's travel an unzoomed image follows, as feedback. */
const DRAG_FOLLOW = 0.55;
/** Upward drags do nothing, so they resist harder. */
const DRAG_FOLLOW_UP = 0.2;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SLOP = 30;
/** Travel below this is a tap, not a drag. */
const TAP_SLOP = 6;

type Gesture =
  | { mode: "pan"; from: Point; transform: Transform }
  | { mode: "pinch"; a: Point; b: Point; transform: Transform };

type Props = {
  item: GalleryItem;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onError: () => void;
};

/**
 * The image surface of the lightbox: pinch to zoom, drag to pan, swipe to
 * browse, drag down to dismiss, double-tap to toggle zoom.
 *
 * Videos are rendered without a gesture layer so their native controls keep
 * working. All the geometry lives in ../lib/lightboxGestures.
 */
export default function LightboxStage({ item, onNext, onPrev, onClose, onError }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<HTMLImageElement | null>(null);

  const [transform, setTransformState] = useState<Transform>(IDENTITY_TRANSFORM);
  const transformRef = useRef<Transform>(IDENTITY_TRANSFORM);
  const [gesturing, setGesturing] = useState(false);

  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  /** Set as soon as a second finger lands; blocks swipe until every finger lifts. */
  const multiTouch = useRef(false);
  const moved = useRef(false);
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);

  const apply = useCallback((t: Transform) => {
    transformRef.current = t;
    setTransformState(t);
  }, []);

  const stageBox = useCallback((): Box => {
    const r = stageRef.current?.getBoundingClientRect();
    return { width: r?.width ?? 0, height: r?.height ?? 0 };
  }, []);

  /** Layout size of the media, i.e. before our own transform is applied. */
  const mediaBox = useCallback((): Box => {
    const el = mediaRef.current;
    return { width: el?.offsetWidth ?? 0, height: el?.offsetHeight ?? 0 };
  }, []);

  const settle = useCallback(
    (t: Transform) => clampPan(t, mediaBox(), stageBox()),
    [mediaBox, stageBox],
  );

  const reset = useCallback(() => apply(IDENTITY_TRANSFORM), [apply]);

  // A new picture always starts unzoomed and centred.
  useEffect(() => { reset(); }, [item.id, reset]);

  // Rotating the phone changes the fit completely — start clean. A plain
  // resize (mobile URL bar, desktop window) only needs the pan re-clamped.
  useEffect(() => {
    const onOrientation = () => reset();
    const onResize = () => apply(settle(transformRef.current));
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("resize", onResize);
    };
  }, [apply, reset, settle]);

  const toStage = (e: React.PointerEvent): Point => {
    const r = stageRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const handleTap = (p: Point) => {
    const at = performance.now();
    const prev = lastTap.current;
    if (prev && at - prev.at < DOUBLE_TAP_MS && Math.hypot(p.x - prev.x, p.y - prev.y) < DOUBLE_TAP_SLOP) {
      lastTap.current = null;
      const next = isZoomed(transformRef.current) ? 1 : DOUBLE_TAP_SCALE;
      apply(settle(zoomAbout(transformRef.current, p, stageBox(), next)));
      return;
    }
    lastTap.current = { at, x: p.x, y: p.y };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stageRef.current?.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, toStage(e));
    moved.current = false;
    setGesturing(true);

    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      multiTouch.current = true;
      gesture.current = { mode: "pinch", a: pts[0], b: pts[1], transform: transformRef.current };
    } else {
      gesture.current = { mode: "pan", from: pts[0], transform: transformRef.current };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, toStage(e));
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];

    if (g.mode === "pinch" && pts.length >= 2) {
      moved.current = true;
      apply(pinchTransform({ a: g.a, b: g.b, transform: g.transform }, { a: pts[0], b: pts[1] }, stageBox()));
      return;
    }
    if (g.mode !== "pan" || pts.length !== 1) return;

    const to = pts[0];
    const dx = to.x - g.from.x;
    const dy = to.y - g.from.y;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) moved.current = true;

    if (isZoomed(g.transform)) {
      apply(settle(panTransform(g.transform, g.from, to)));
    } else if (moved.current) {
      // Unzoomed: let the picture trail the finger so the swipe feels answered.
      apply({ scale: 1, x: dx * DRAG_FOLLOW, y: (dy > 0 ? DRAG_FOLLOW : DRAG_FOLLOW_UP) * dy });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const released = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    stageRef.current?.releasePointerCapture?.(e.pointerId);
    const g = gesture.current;
    const wasMulti = multiTouch.current;

    if (pointers.current.size === 0) {
      multiTouch.current = false;
      setGesturing(false);
      gesture.current = null;
    } else if (pointers.current.size === 1) {
      // Second finger lifted mid-pinch: continue as a pan from where we are.
      gesture.current = { mode: "pan", from: [...pointers.current.values()][0], transform: transformRef.current };
    }

    if (!g || !released) return;

    if (g.mode === "pinch" || wasMulti) {
      // A pinch never navigates, however far the fingers travelled sideways.
      apply(settle(transformRef.current));
      return;
    }

    const dx = released.x - g.from.x;
    const dy = released.y - g.from.y;

    if (isZoomed(g.transform)) {
      apply(settle(transformRef.current));
      if (!moved.current) handleTap(released);
      return;
    }

    apply(IDENTITY_TRANSFORM);
    const action = classifySwipe(dx, dy, IDENTITY_TRANSFORM);
    if (action === "next") onNext();
    else if (action === "prev") onPrev();
    else if (action === "close") onClose();
    else if (!moved.current) handleTap(released);
  };

  const zoomed = isZoomed(transform);

  if (item.type === "video") {
    return (
      <div className="gal-lightbox__stage gal-lightbox__stage--video" ref={stageRef}>
        <video
          key={item.id}
          className="gal-lightbox__media"
          src={item.src}
          controls
          autoPlay
          muted
          playsInline
          preload="metadata"
          onError={onError}
        />
      </div>
    );
  }

  return (
    <div
      className={`gal-lightbox__stage ${zoomed ? "gal-lightbox__stage--zoomed" : ""}`}
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <img
        key={item.id}
        ref={mediaRef}
        className={`gal-lightbox__media ${gesturing ? "" : "gal-lightbox__media--settling"}`}
        src={item.src}
        alt={item.caption}
        draggable={false}
        onLoad={reset}
        onError={onError}
        style={{ transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})` }}
      />
    </div>
  );
}
