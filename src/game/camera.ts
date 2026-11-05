/** Cámara de mapa: zoom, pan y proyección tipo isométrica suave. */

export type Camera = {
  panX: number;
  panY: number;
  zoom: number;
};

export const CAMERA_DEFAULT: Camera = { panX: 0, panY: 0, zoom: 1 };

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

export function zoomAt(cam: Camera, factor: number, sx: number, sy: number, viewW: number, viewH: number): Camera {
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

export function resetCamera(): Camera {
  return { ...CAMERA_DEFAULT };
}
