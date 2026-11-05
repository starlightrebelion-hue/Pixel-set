import type { Furn, Lighting, Location, Weather } from "@/game/scenery";
import type { SetSnapshot } from "@/game/set-director";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function drawFurn(ctx: CanvasRenderingContext2D, fu: Furn, ox: number, oy: number, dw: number, dh: number, loc: Location, lamps: number, t: number, sky: [string, string]) {
  const u = dh * fu.s;
  const x = ox + fu.x * dw, y = oy + fu.y * dh; // y = base del objeto
  const R = (rx: number, ry: number, rw: number, rh: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x + rx * u, y + ry * u, rw * u, rh * u); };
  const acc = loc.palette.accent;
  switch (fu.k) {
    case "window": {
      const g = ctx.createLinearGradient(0, y - u, 0, y + u * 0.2); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
      ctx.fillStyle = "#2a2018"; ctx.fillRect(x - u * 0.62, y - u * 1.02, u * 1.24, u * 1.24);
      ctx.fillStyle = g; ctx.fillRect(x - u * 0.54, y - u * 0.94, u * 1.08, u * 1.08);
      R(-0.03, -0.94, 0.06, 1.08, "#2a2018"); R(-0.54, -0.42, 1.08, 0.05, "#2a2018"); break;
    }
    case "door": R(-0.4, -1.6, 0.8, 1.6, "#3a2c22"); R(-0.34, -1.54, 0.68, 1.48, shade(loc.palette.wall2, 10)); R(0.2, -0.8, 0.06, 0.1, acc); break;
    case "shelf": R(-0.5, -1.6, 1, 1.6, "#4a3424"); for (let i = 0; i < 4; i++) { R(-0.46, -1.52 + i * 0.4, 0.92, 0.06, "#6a4c34"); for (let j = 0; j < 4; j++) R(-0.42 + j * 0.22, -1.4 + i * 0.4, 0.14, 0.28, j % 2 ? acc : shade(loc.palette.accent, -60)); } break;
    case "desk": R(-0.7, -0.5, 1.4, 0.1, "#8a6a48"); R(-0.64, -0.4, 0.1, 0.4, "#5a4430"); R(0.54, -0.4, 0.1, 0.4, "#5a4430"); R(-0.2, -0.95, 0.4, 0.4, "#151a1e"); R(-0.17, -0.92, 0.34, 0.3, "#6ab0c0"); break;
    case "sofa": R(-0.9, -0.8, 1.8, 0.5, shade(acc, -90)); R(-0.9, -0.4, 1.8, 0.4, shade(acc, -60)); R(-0.9, -0.5, 0.2, 0.5, shade(acc, -110)); R(0.7, -0.5, 0.2, 0.5, shade(acc, -110)); break;
    case "bed": R(-0.9, -0.8, 0.2, 0.8, "#4a3424"); R(-0.7, -0.5, 1.6, 0.5, "#e8e0d0"); R(-0.7, -0.62, 0.4, 0.14, "#fff"); R(-0.3, -0.5, 1.2, 0.3, shade(acc, -40)); break;
    case "table": R(-0.5, -0.6, 1, 0.1, "#9a7a54"); R(-0.1, -0.5, 0.2, 0.5, "#6a5038"); R(-0.35, -0.04, 0.7, 0.05, "#6a5038"); break;
    case "counter": R(-0.9, -0.8, 1.8, 0.8, "#6a4c34"); R(-0.94, -0.88, 1.88, 0.1, "#b08a5c"); R(-0.4, -1.1, 0.3, 0.22, "#d8d0c0"); break;
    case "fridge": R(-0.4, -1.5, 0.8, 1.5, "#d8dce0"); R(-0.4, -0.95, 0.8, 0.04, "#8a9098"); R(0.24, -1.3, 0.05, 0.3, "#8a9098"); break;
    case "painting": R(-0.5, -0.9, 1, 0.8, "#3a2a1c"); R(-0.44, -0.84, 0.88, 0.68, shade(acc, -80)); R(-0.3, -0.6, 0.3, 0.3, acc); break;
    case "tv": R(-0.55, -0.9, 1.1, 0.7, "#101418"); R(-0.5, -0.85, 1, 0.6, `rgba(106,176,224,${0.5 + Math.sin(t * 2) * 0.1})`); break;
    case "crate": R(-0.5, -0.8, 1, 0.8, "#8a6a40"); R(-0.5, -0.8, 1, 0.1, "#6a4c2c"); R(-0.5, -0.4, 1, 0.06, "#6a4c2c"); break;
    case "plant": R(-0.2, -0.5, 0.4, 0.5, "#7a4c34"); ctx.fillStyle = "#3e8a4c"; ctx.beginPath(); ctx.ellipse(x, y - u * 0.9, u * 0.5, u * 0.55, 0, 0, 7); ctx.fill(); break;
    case "tree": R(-0.1, -1, 0.2, 1, "#5a3e28"); ctx.fillStyle = shade(loc.palette.floor, -40); ctx.beginPath(); ctx.ellipse(x, y - u * 1.3, u * 0.7, u * 0.7, 0, 0, 7); ctx.fill(); ctx.fillStyle = shade(loc.palette.floor, -10); ctx.beginPath(); ctx.ellipse(x - u * 0.2, y - u * 1.45, u * 0.35, u * 0.35, 0, 0, 7); ctx.fill(); break;
    case "bench": R(-0.8, -0.5, 1.6, 0.1, "#9a7448"); R(-0.8, -0.9, 1.6, 0.1, "#8a6840"); R(-0.7, -0.4, 0.08, 0.4, "#3a2c20"); R(0.62, -0.4, 0.08, 0.4, "#3a2c20"); break;
    case "car": R(-1, -0.55, 2, 0.5, shade(acc, -30)); R(-0.55, -0.95, 1.1, 0.42, shade(acc, -10)); R(-0.5, -0.9, 1, 0.32, "#a8c8d8"); ctx.fillStyle = "#14161a"; ctx.beginPath(); ctx.arc(x - u * 0.6, y - u * 0.05, u * 0.2, 0, 7); ctx.arc(x + u * 0.6, y - u * 0.05, u * 0.2, 0, 7); ctx.fill(); if (lamps > 0.3) R(0.95, -0.4, 0.1, 0.12, "#fff0a0"); break;
    case "lamppost": R(-0.04, -1.6, 0.08, 1.6, "#2a2c30"); R(-0.2, -1.7, 0.4, 0.14, "#2a2c30"); break;
    case "tomb": R(-0.35, -0.9, 0.7, 0.9, "#8a8e98"); R(-0.3, -0.95, 0.6, 0.1, "#a0a4ae"); R(-0.05, -0.75, 0.1, 0.4, "#5a5e68"); break;
    case "fence": for (let i = -4; i <= 4; i++) R(i * 0.22, -0.8, 0.07, 0.8, "#2c2e34"); R(-1, -0.6, 2, 0.06, "#2c2e34"); break;
    case "console": R(-0.6, -0.6, 1.2, 0.6, "#2a3448"); R(-0.55, -0.9, 1.1, 0.35, "#10161e"); for (let i = 0; i < 5; i++) R(-0.45 + i * 0.2, -0.82, 0.12, 0.2, i % 2 ? acc : "#e2b340"); break;
    case "capsule": R(-0.4, -1.5, 0.8, 1.5, `${acc}55`); R(-0.4, -1.5, 0.8, 0.1, "#2a3448"); R(-0.4, -0.1, 0.8, 0.1, "#2a3448"); R(-0.3, -1.2, 0.6, 1, `${acc}33`); break;
    case "neon": { const a = 0.6 + Math.sin(t * 3 + fu.x * 9) * 0.3; ctx.fillStyle = acc; ctx.globalAlpha = a; ctx.fillRect(x - u * 1.2, y - u * 0.5, u * 2.4, u * 0.3); ctx.globalAlpha = 1; break; }
    case "curtain": R(-0.4, -1.1, 0.8, 1.3, shade(acc, -100)); R(-0.04, -1.1, 0.08, 1.3, shade(acc, -130)); break;
    case "rug": ctx.fillStyle = shade(acc, -90); ctx.beginPath(); ctx.ellipse(x, y, u * 1.1, u * 0.28, 0, 0, 7); ctx.fill(); break;
    case "fireplace": R(-0.8, -1.3, 1.6, 1.3, "#4a4046"); R(-0.5, -0.8, 1, 0.8, "#101014"); if (lamps > 0) { ctx.fillStyle = `rgba(255,150,50,${0.5 + Math.sin(t * 9) * 0.2})`; ctx.fillRect(x - u * 0.3, y - u * 0.4, u * 0.6, u * 0.4); } break;
    case "building": R(-0.9, -2.4, 1.8, 2.4, shade(loc.palette.wall, -20)); for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { const on = (r * 3 + c * 5 + Math.floor(fu.x * 10)) % 3 !== 0; ctx.fillStyle = on && lamps > 0.3 ? "#ffe08a" : shade(loc.palette.wall2, 20); ctx.fillRect(x - u * 0.75 + c * u * 0.4, y - u * 2.2 + r * u * 0.34, u * 0.22, u * 0.2); } break;
    case "wave": ctx.fillStyle = shade(loc.palette.wall2, 0); ctx.fillRect(ox, y - u * 0.4, dw, u * 0.4); ctx.strokeStyle = "rgba(255,255,255,0.6)"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(ox + ((i * 0.2 + t * 0.04) % 1) * dw, y - u * 0.2, u * 0.12, Math.PI, 0); ctx.stroke(); } break;
    case "star": ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.5 + Math.sin(t * 2 + fu.x * 20) * 0.4; ctx.fillRect(x, y, Math.max(2, u * 0.4), Math.max(2, u * 0.4)); ctx.globalAlpha = 1; break;
    case "cobweb": ctx.strokeStyle = "rgba(220,220,230,0.5)"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + u * 2, y + u * 2); ctx.moveTo(x, y); ctx.lineTo(x + u * 2.4, y + u * 0.6); ctx.moveTo(x, y); ctx.lineTo(x + u * 0.6, y + u * 2.4); ctx.stroke(); break;
    case "balloon": ctx.fillStyle = acc; ctx.beginPath(); ctx.ellipse(x, y - u * 0.6 + Math.sin(t + fu.x * 8) * 3, u * 0.35, u * 0.45, 0, 0, 7); ctx.fill(); R(-0.01, -0.15, 0.02, 0.7, "#ddd"); break;
    case "lamp": R(-0.04, -1, 0.08, 1, "#3a3028"); R(-0.25, -1.2, 0.5, 0.3, "#f0d890"); if (lamps > 0) { const g = ctx.createRadialGradient(x, y - u, 2, x, y - u, u * 2.2); g.addColorStop(0, `rgba(255,220,140,${0.5 * lamps})`); g.addColorStop(1, "rgba(255,220,140,0)"); ctx.fillStyle = g; ctx.fillRect(x - u * 2.2, y - u * 3.2, u * 4.4, u * 4.4); } break;
  }
}

/** Dibuja el escenario completo: fondo, muebles, utilería, luz y clima. */
export function drawScenery(ctx: CanvasRenderingContext2D, ox: number, oy: number, dw: number, dh: number, s: SetSnapshot, t: number, studio?: HTMLImageElement | null) {
  const loc = s.location, pal = loc.palette, L = s.lighting;
  const horizon = dh * 0.42;
  if (loc.id === "estudio" && studio?.naturalWidth) {
    ctx.drawImage(studio, ox, oy, dw, dh);
  } else {
    if (loc.interior) {
      const g = ctx.createLinearGradient(0, oy, 0, oy + horizon); g.addColorStop(0, pal.wall); g.addColorStop(1, pal.wall2);
      ctx.fillStyle = g; ctx.fillRect(ox, oy, dw, horizon);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(ox, oy + horizon - 4, dw, 4);
    } else {
      const g = ctx.createLinearGradient(0, oy, 0, oy + horizon); g.addColorStop(0, L.sky[0]); g.addColorStop(1, L.sky[1]);
      ctx.fillStyle = g; ctx.fillRect(ox, oy, dw, horizon);
      ctx.fillStyle = pal.wall2; ctx.globalAlpha = 0.45; ctx.fillRect(ox, oy + horizon * 0.82, dw, horizon * 0.18); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = pal.floor; ctx.fillRect(ox, oy + horizon, dw, dh - horizon);
    ctx.strokeStyle = pal.floor2; ctx.lineWidth = 1;
    for (let y = oy + horizon + dh * 0.04; y < oy + dh; y += dh * 0.06) { ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + dw, y); ctx.stroke(); }
  }
  const sorted = [...s.dressing.items].sort((a, b) => (a.k === "rug" ? -1 : b.k === "rug" ? 1 : a.y - b.y));
  for (const it of sorted) drawFurn(ctx, it, ox, oy, dw, dh, loc, L.lamps, t, L.sky);
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.font = `${Math.round(dh * 0.05)}px sans-serif`;
  for (const p of s.dressing.props) ctx.fillText(p.icon, ox + p.x * dw, oy + p.y * dh);
  // iluminación
  if (L.alpha > 0) { ctx.globalAlpha = L.alpha; ctx.fillStyle = L.tint; ctx.fillRect(ox, oy, dw, dh); ctx.globalAlpha = 1; }
  if (L.alpha > 0.3) {
    const g = ctx.createRadialGradient(ox + dw / 2, oy + dh / 2, dh * 0.3, ox + dw / 2, oy + dh / 2, dw * 0.65);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)"); ctx.fillStyle = g; ctx.fillRect(ox, oy, dw, dh);
  }
  drawWeather(ctx, ox, oy, dw, dh, s.weather, t);
}

function drawWeather(ctx: CanvasRenderingContext2D, ox: number, oy: number, dw: number, dh: number, w: Weather, t: number) {
  if (w === "lluvia") {
    ctx.strokeStyle = "rgba(190,210,240,0.55)"; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < 90; i++) { const x = ox + ((i * 97.3) % dw), y = oy + (((i * 53.7) + t * 520) % dh); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12); }
    ctx.stroke();
  } else if (w === "nieve") {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 70; i++) { const x = ox + ((i * 83.1 + Math.sin(t + i) * 14) % dw), y = oy + (((i * 41.9) + t * 50) % dh); ctx.fillRect(x, y, 3, 3); }
  } else if (w === "niebla") {
    const g = ctx.createLinearGradient(0, oy, 0, oy + dh); g.addColorStop(0, "rgba(220,226,232,0.2)"); g.addColorStop(0.6, `rgba(220,226,232,${0.35 + Math.sin(t * 0.6) * 0.06})`); g.addColorStop(1, "rgba(220,226,232,0.2)");
    ctx.fillStyle = g; ctx.fillRect(ox, oy, dw, dh);
  }
}

/** Transición entre sets: fundido, cortinilla o iris + claqueta con título. */
export function drawTransition(ctx: CanvasRenderingContext2D, cw: number, ch: number, tr: { active: boolean; t: number; kind: string; title: string }) {
  if (!tr.active) return;
  const cover = 1 - Math.abs(tr.t - 0.5) * 2; // 0 → 1 → 0
  ctx.save();
  if (tr.kind === "cortinilla") {
    const w = cw * Math.min(1, cover * 1.1);
    ctx.fillStyle = "#0c0a08"; ctx.fillRect(tr.t < 0.5 ? 0 : cw - w, 0, w, ch);
  } else if (tr.kind === "iris") {
    ctx.fillStyle = "#0c0a08"; ctx.beginPath(); ctx.rect(0, 0, cw, ch);
    ctx.arc(cw / 2, ch / 2, Math.max(0, (1 - cover) * Math.hypot(cw, ch) / 2), 0, Math.PI * 2, true); ctx.fill("evenodd");
  } else { ctx.globalAlpha = Math.min(1, cover * 1.25); ctx.fillStyle = "#0c0a08"; ctx.fillRect(0, 0, cw, ch); }
  ctx.globalAlpha = Math.max(0, (cover - 0.5) * 2);
  ctx.fillStyle = "#f4ecdf"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "700 22px 'Source Sans 3', sans-serif"; ctx.fillText("🎬 " + tr.title, cw / 2, ch / 2);
  ctx.restore();
}
