import type { Camera } from "@/game/camera";
import {
  focusWorld,
  panBy,
  screenToWorld,
  zoomAt,
} from "@/game/camera";
import type { CrewId } from "@/game/crew";

export function touchDist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

type TouchCamOpts = {
  canvas: HTMLCanvasElement;
  camRef: { current: Camera };
  onCamChange: () => void;
  onTap: (sx: number, sy: number, rect: DOMRect) => void;
  onCrewPointerDown?: (sx: number, sy: number, rect: DOMRect) => CrewId | null;
  onCrewDrag?: (id: CrewId, sx: number, sy: number, rect: DOMRect) => void;
  onCrewDrop?: (id: CrewId, sx: number, sy: number, rect: DOMRect, moved: boolean) => void;
  onCrewCancel?: (id: CrewId) => void;
};

/** Controles de cámara multi-touch / mouse: pan, pinch zoom, tap. */
export function attachTouchCamera({ canvas, camRef, onCamChange, onTap, onCrewPointerDown, onCrewDrag, onCrewDrop, onCrewCancel }: TouchCamOpts) {
  let mode: "none" | "pan" | "pinch" | "tap" | "crew" = "none";
  let draggingCrew: CrewId | null = null;
  let crewMoved = false;
  let panLastX = 0, panLastY = 0;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let tapStartX = 0, tapStartY = 0, tapMoved = false;
  const activePointers = new Map<number, { x: number; y: number }>();

  const onPointerDown = (e: PointerEvent) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (e.pointerType === "mouse" && (e.button === 1 || e.button === 2 || e.shiftKey)) {
      mode = "pan";
      panLastX = e.clientX;
      panLastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    if (activePointers.size === 2) {
      if (mode === "crew" && draggingCrew) { onCrewCancel?.(draggingCrew); draggingCrew = null; crewMoved = false; }
      const pts = [...activePointers.values()];
      pinchStartDist = touchDist(pts[0]!, pts[1]!);
      pinchStartZoom = camRef.current.zoom;
      mode = "pinch";
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const crewId = onCrewPointerDown?.(e.clientX - rect.left, e.clientY - rect.top, rect) ?? null;
    if (crewId) {
      draggingCrew = crewId;
      crewMoved = false;
      mode = "crew";
      tapStartX = e.clientX; tapStartY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    mode = "tap";
    tapStartX = e.clientX;
    tapStartY = e.clientY;
    tapMoved = false;
    panLastX = e.clientX;
    panLastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (mode === "crew" && draggingCrew) {
      const r = canvas.getBoundingClientRect();
      if (Math.hypot(e.clientX - tapStartX, e.clientY - tapStartY) > 5) crewMoved = true;
      if (crewMoved) onCrewDrag?.(draggingCrew, e.clientX - r.left, e.clientY - r.top, r);
      return;
    }
    if (mode === "pinch" && activePointers.size >= 2) {
      const pts = [...activePointers.values()];
      const d = touchDist(pts[0]!, pts[1]!);
      if (pinchStartDist > 8) {
        const factor = d / pinchStartDist;
        const r = canvas.getBoundingClientRect();
        const midX = (pts[0]!.x + pts[1]!.x) / 2 - r.left;
        const midY = (pts[0]!.y + pts[1]!.y) / 2 - r.top;
        const targetZoom = pinchStartZoom * factor;
        const cur = camRef.current.zoom;
        camRef.current = zoomAt(camRef.current, targetZoom / cur, midX, midY, r.width, r.height);
        onCamChange();
      }
      return;
    }

    const dx = e.clientX - panLastX;
    const dy = e.clientY - panLastY;
    const dist = Math.hypot(e.clientX - tapStartX, e.clientY - tapStartY);
    if (mode === "tap" && dist > 10) {
      mode = "pan";
      tapMoved = true;
    }
    if (mode === "pan") {
      panLastX = e.clientX;
      panLastY = e.clientY;
      camRef.current = panBy(camRef.current, dx, dy);
      onCamChange();
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    activePointers.delete(e.pointerId);
    if (mode === "pinch") {
      if (activePointers.size < 2) mode = "none";
      return;
    }
    const r = canvas.getBoundingClientRect();
    if (mode === "crew" && draggingCrew) {
      onCrewDrop?.(draggingCrew, e.clientX - r.left, e.clientY - r.top, r, crewMoved);
      draggingCrew = null;
      crewMoved = false;
    } else if (mode === "tap" && !tapMoved) {
      onTap(e.clientX - r.left, e.clientY - r.top, r);
    }
    if (activePointers.size === 0) mode = "none";
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const factor = e.deltaY > 0 ? 0.9 : 1.12;
    camRef.current = zoomAt(camRef.current, factor, e.clientX - r.left, e.clientY - r.top, r.width, r.height);
    onCamChange();
  };

  const onContext = (e: Event) => e.preventDefault();

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("contextmenu", onContext);

  return () => {
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("contextmenu", onContext);
  };
}

export function attachMinimapJump(
  minimap: HTMLCanvasElement,
  mainCanvas: HTMLCanvasElement,
  camRef: { current: Camera },
  onCamChange: () => void,
) {
  const onMinimapPointer = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = minimap.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const main = mainCanvas.getBoundingClientRect();
    camRef.current = focusWorld(camRef.current, nx, ny, main.width, main.height);
    onCamChange();
  };
  minimap.addEventListener("pointerdown", onMinimapPointer);
  minimap.style.touchAction = "none";
  return () => minimap.removeEventListener("pointerdown", onMinimapPointer);
}

export function pickCrewAt(
  people: { id: CrewId; x: number; y: number; visible?: boolean }[],
  nx: number,
  ny: number,
  radius = 0.08,
): CrewId | null {
  let best: CrewId | null = null;
  let bestD = radius;
  for (const p of people) {
    if (p.visible === false) continue;
    const d = Math.hypot(p.x - nx, p.y - ny);
    if (d < bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}

export { screenToWorld };
