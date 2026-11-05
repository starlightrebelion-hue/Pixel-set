/** Cámara de mapa: zoom, pan y proyección tipo isométrica suave. */

export type Camera = {
  panX: number;
  panY: number;
  zoom: number;
};

export const CAMERA_DEFAULT: Camera = { panX: 0, panY: 0, zoom: 1.12 };

export const CAMERA_LIMITS = {
  minZoom: 0.55,
  maxZoom: 2.4,
};

export function clampZoom(z: number) {
  return Math.max(CAMERA_LIMITS.minZoom, Math.min(CAMERA_LIMITS.maxZoom, z));
}

export function worldToScreen(
  nx: number,
  ny: number,
  cam: Camera,
  viewW: number,
  viewH: number,
): { x: number; y: number; scale: number } {
  const worldW = viewW * 1.15;
  const worldH = viewH * 1.15;
  const lx = (nx - 0.5) * worldW;
  const ly = (ny - 0.55) * worldH;
  const cos = 0.9;
  const sin = 0.35;
  const ix = lx * cos - ly * sin;
  const iy = lx * sin * 0.45 + ly * cos * 0.72;
  const scale = cam.zoom;
  return {
    x: viewW * 0.5 + cam.panX + ix * scale,
    y: viewH * 0.52 + cam.panY + iy * scale,
    scale,
  };
}

export function screenToWorld(
  sx: number,
  sy: number,
  cam: Camera,
  viewW: number,
  viewH: number,
): { nx: number; ny: number } {
  const cos = 0.9;
  const sin = 0.35;
  const dx = (sx - viewW * 0.5 - cam.panX) / cam.zoom;
  const dy = (sy - viewH * 0.52 - cam.panY) / cam.zoom;
  const det = cos * cos * 0.72 + sin * sin * 0.45;
  const lx = (dx * cos * 0.72 + dy * sin) / det;
  const ly = (dy * cos - dx * sin * 0.45) / det;
  const worldW = viewW * 1.15;
  const worldH = viewH * 1.15;
  return { nx: lx / worldW + 0.5, ny: ly / worldH + 0.55 };
}

export function zoomAt(
  cam: Camera,
  factor: number,
  sx: number,
  sy: number,
  viewW: number,
  viewH: number,
): Camera {
  const next = clampZoom(cam.zoom * factor);
  if (next === cam.zoom) return cam;
  const ratio = next / cam.zoom;
  const cx = viewW * 0.5;
  const cy = viewH * 0.52;
  const dx = sx - cx - cam.panX;
  const dy = sy - cy - cam.panY;
  return {
    zoom: next,
    panX: cam.panX - dx * (ratio - 1),
    panY: cam.panY - dy * (ratio - 1),
  };
}

export function panBy(cam: Camera, dx: number, dy: number): Camera {
  return { ...cam, panX: cam.panX + dx, panY: cam.panY + dy };
}

export function focusWorld(
  cam: Camera,
  nx: number,
  ny: number,
  viewW: number,
  viewH: number,
): Camera {
  const scr = worldToScreen(nx, ny, { ...cam, panX: 0, panY: 0 }, viewW, viewH);
  return {
    ...cam,
    panX: viewW * 0.5 - scr.x,
    panY: viewH * 0.52 - scr.y,
  };
}

export function resetCamera(): Camera {
  return { ...CAMERA_DEFAULT };
}

export function drawIsoGrid(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  viewW: number,
  viewH: number,
  steps = 12,
) {
  ctx.save();
  ctx.lineWidth = 1;

  const corners = [
    worldToScreen(0, 0, cam, viewW, viewH),
    worldToScreen(1, 0, cam, viewW, viewH),
    worldToScreen(1, 1, cam, viewW, viewH),
    worldToScreen(0, 1, cam, viewW, viewH),
  ];
  ctx.fillStyle = "rgba(18, 28, 10, 0.55)";
  ctx.beginPath();
  ctx.moveTo(corners[0]!.x, corners[0]!.y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i]!.x, corners[i]!.y);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = worldToScreen(t, 0, cam, viewW, viewH);
    const b = worldToScreen(t, 1, cam, viewW, viewH);
    const major = i % 3 === 0;
    ctx.strokeStyle = major ? "rgba(159, 191, 90, 0.35)" : "rgba(61, 90, 30, 0.28)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = worldToScreen(0, t, cam, viewW, viewH);
    const b = worldToScreen(1, t, cam, viewW, viewH);
    const major = i % 3 === 0;
    ctx.strokeStyle = major ? "rgba(159, 191, 90, 0.32)" : "rgba(61, 90, 30, 0.22)";
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(226, 179, 64, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(corners[0]!.x, corners[0]!.y);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i]!.x, corners[i]!.y);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
