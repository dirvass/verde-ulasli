/* =========================================================
   LIGHTBOX GESTURES
   Pure geometry for the gallery viewer's touch handling.
   Kept free of DOM/React so the awkward cases (pinch anchoring,
   pan limits, swipe-vs-pinch) are unit-testable.
   =======================================================*/

export type Point = { x: number; y: number };
export type Box = { width: number; height: number };
/** translate(x, y) then scale(s), about the element's centre. */
export type Transform = { scale: number; x: number; y: number };

export const IDENTITY_TRANSFORM: Transform = { scale: 1, x: 0, y: 0 };
export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
/** Where a double-tap lands. */
export const DOUBLE_TAP_SCALE = 2.5;

/** A drag must clear this before it counts as a swipe. */
const SWIPE_DISTANCE = 55;
/** …and must beat the other axis by this factor, so diagonals do nothing. */
const SWIPE_RATIO = 1.3;
/** Drag-down-to-dismiss is deliberately longer than a sideways swipe. */
const CLOSE_DISTANCE = 110;
/** Below this the image is "not zoomed" — float noise shouldn't lock swiping. */
const ZOOM_EPSILON = 0.02;

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function clampScale(s: number): number {
  if (!Number.isFinite(s)) return MIN_SCALE;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

export function isZoomed(t: Transform): boolean {
  return t.scale > MIN_SCALE + ZOOM_EPSILON;
}

/**
 * Keep the scaled media inside the stage. An axis with no overflow is
 * re-centred, so the image can never be dragged off into empty space.
 */
export function clampPan(t: Transform, media: Box, stage: Box): Transform {
  const slackX = Math.max(0, (media.width * t.scale - stage.width) / 2);
  const slackY = Math.max(0, (media.height * t.scale - stage.height) / 2);
  if (slackX === 0 && slackY === 0 && !isZoomed(t)) return IDENTITY_TRANSFORM;
  return {
    scale: t.scale,
    x: Math.min(slackX, Math.max(-slackX, t.x)),
    y: Math.min(slackY, Math.max(-slackY, t.y)),
  };
}

export type SwipeAction = "next" | "prev" | "close" | null;

/**
 * A one-finger drag on an unzoomed image navigates or dismisses.
 * While zoomed the same drag is a pan, so this returns null — that is what
 * stops a pinch from being misread as "next picture".
 */
export function classifySwipe(dx: number, dy: number, t: Transform): SwipeAction {
  if (isZoomed(t)) return null;
  if (Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
    return dx < 0 ? "next" : "prev";
  }
  if (dy >= CLOSE_DISTANCE && dy > Math.abs(dx) * SWIPE_RATIO) return "close";
  return null;
}

/** Content-space offset of a stage point, given the transform in force. */
function toContent(stagePoint: Point, t: Transform, stage: Box): Point {
  const dx = stagePoint.x - stage.width / 2 - t.x;
  const dy = stagePoint.y - stage.height / 2 - t.y;
  return { x: dx / t.scale, y: dy / t.scale };
}

/** Transform that puts `content` back under `stagePoint` at `scale`. */
function anchor(content: Point, stagePoint: Point, scale: number, stage: Box): Transform {
  return {
    scale,
    x: stagePoint.x - stage.width / 2 - scale * content.x,
    y: stagePoint.y - stage.height / 2 - scale * content.y,
  };
}

export type PinchStart = { a: Point; b: Point; transform: Transform };

/**
 * Two-finger pinch. Scales by how far the fingers spread and translates so the
 * pixel between them stays under them, including when the whole pinch is
 * dragged across the screen.
 */
export function pinchTransform(start: PinchStart, current: { a: Point; b: Point }, stage: Box): Transform {
  const startDist = distance(start.a, start.b);
  const curDist = distance(current.a, current.b);
  const ratio = startDist > 0 ? curDist / startDist : 1;
  const scale = clampScale(start.transform.scale * ratio);
  const content = toContent(midpoint(start.a, start.b), start.transform, stage);
  return anchor(content, midpoint(current.a, current.b), scale, stage);
}

/** Double-tap zoom, anchored on the tapped point. */
export function zoomAbout(t: Transform, focal: Point, stage: Box, nextScale: number): Transform {
  const scale = clampScale(nextScale);
  if (!isZoomed({ ...t, scale })) return IDENTITY_TRANSFORM;
  return anchor(toContent(focal, t, stage), focal, scale, stage);
}

/** One-finger pan of an already-zoomed image. */
export function panTransform(start: Transform, from: Point, to: Point): Transform {
  return { scale: start.scale, x: start.x + (to.x - from.x), y: start.y + (to.y - from.y) };
}
