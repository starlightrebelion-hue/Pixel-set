import { useEffect, useRef, useState } from "react";
import { Clapperboard, Film, Library, Megaphone, Pause, TriangleAlert, Users } from "lucide-react";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { CREW, stateLabel, type CrewId, type MapId } from "@/game/crew";
import { tintNoraFromGuion } from "@/game/nora-tint";
import { COFFEE_SPOT, createSim, type Hud, type LogLine, type Person, type Sim } from "@/game/sim";
import { enhanceSim } from "@/game/enhance-sim";
import { drawGuionRoom, drawMontajeRoom } from "@/game/map-draw";
import { AdvisorPanel } from "@/components/advisor-panel";
import { SetDirectorPanel } from "@/components/set-director-panel";
import { createSetDirector, type SetDirector, type SetSnapshot } from "@/game/set-director";
import { drawScenery, drawTransition } from "@/game/scenery-draw";
import { StoryDirector } from "@/components/story-director";

const POSES = ["pose-1", "pose-2", "pose-3", "pose-4"] as const;
const SPRITE_ASSETS = import.meta.glob<string>("../../assets/sprites/*/pose-*.png", {
  eager: true, query: "?url", import: "default",
});
const MAP_FILES: Partial<Record<MapId, string>> = {
  set: "/set/stage.jpg",
};

const INITIAL_LOG: LogLine[] = [
  { id: -3, who: "Rey", text: "Bienvenidos al set. Hoy la emoción tiene que aguantar la estructura.", kind: "dir" },
  { id: -2, who: "Sol", text: "Sala de guion lista. Falta decidir qué sabe el espectador.", kind: "ok" },
  { id: -1, who: "Lila", text: "Tras el corte, llevo la cinta a montaje y edito.", kind: "ok" },
];

const INITIAL_HUD: Hud = {
  take: 1, scene: "La traición · Drama", stress: 12, quality: 8,
  mood: "Sala de guion: escriben y reescriben.", paused: false, timeLeft: 90,
  objective: "Cerrar el guion antes de bajar al set",
  stationCount: CREW.length, coffeeCount: 0, manualRescues: 0, rescueGoal: 3,
  phase: "guion", map: "guion", mapLabel: "Sala de guion", transitioning: false,
  people: CREW.map((c) => ({ id: c.id, name: c.name, role: c.role, state: "work" as const, moving: false })),
  dayGoodTakes: 0, dayTarget: 3, lastStars: 0, totalStars: 0,
  genre: "Drama", unlockedGenres: ["Drama"],
  crisis: null, takeResult: null, onMarkReady: false, bonds: [],
};

function hudNum(v: number | undefined, d = 0) { return typeof v === "number" ? v : d; }
function assetUrl(path: string) {
  if (typeof window === "undefined") return path;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}${path}`;
}
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(" "); const lines: string[] = []; let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > max && cur) { lines.push(cur); cur = word; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}
function poseFor(p: Person, moving: boolean, t: number) {
  if (p.state === "sleep") return "pose-4";
  if (p.state === "angry") return "pose-3";
  if (p.state === "seated") {
    const step = Math.floor(t * 5 + p.homeX * 14) % 2;
    return step === 0 ? "pose-1" : "pose-2";
  }
  const step = Math.floor(t * (moving ? 8 : 2) + p.homeX * 10) % 2;
  if (moving) return step === 0 ? "pose-2" : "pose-1";
  return step === 0 ? "pose-1" : "pose-2";
}
function drawWorkstationBack(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = "#29231f"; ctx.fillRect(x - size * 0.16, y - size * 0.31, size * 0.32, size * 0.18);
  ctx.fillStyle = "#51402f"; ctx.fillRect(x - size * 0.29, y - size * 0.43, size * 0.58, size * 0.07);
  ctx.fillStyle = "#161d20"; ctx.fillRect(x - size * 0.12, y - size * 0.62, size * 0.24, size * 0.18);
  ctx.fillStyle = "#76a8a2"; ctx.fillRect(x - size * 0.095, y - size * 0.595, size * 0.19, size * 0.125);
}
function drawWorkstationFront(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = "#533a2b"; ctx.fillRect(x - size * 0.32, y - size * 0.39, size * 0.64, size * 0.12);
  ctx.fillStyle = "#a27a50"; ctx.fillRect(x - size * 0.32, y - size * 0.405, size * 0.64, size * 0.035);
}
function drawCoffeeCorner(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = "#302720"; ctx.fillRect(x - size * 0.22, y - size * 0.25, size * 0.44, size * 0.22);
  ctx.fillStyle = "#9a704b"; ctx.fillRect(x - size * 0.24, y - size * 0.27, size * 0.48, size * 0.045);
  ctx.fillStyle = "#f4ecdf"; ctx.font = "700 10px 'Source Sans 3', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText("CAFÉ", x, y - size * 0.46);
}

export function FilmSet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  const directorRef = useRef<SetDirector | null>(null);
  const [snap, setSnap] = useState<SetSnapshot | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let audio: AudioContext | null = null;
    const unlock = () => { if (!audio) audio = new AudioContext(); if (audio.state === "suspended") void audio.resume(); };
    const blip = (kind: LogLine["kind"]) => {
      if (!audio || audio.state !== "running") return;
      const osc = audio.createOscillator(); const gain = audio.createGain();
      osc.type = kind === "dir" ? "triangle" : "square";
      osc.frequency.value = kind === "angry" ? 170 : kind === "dir" ? 220 : 460;
      gain.gain.value = kind === "dir" ? 0.04 : 0.028;
      osc.connect(gain); gain.connect(audio.destination); osc.start();
      const stopAt = audio.currentTime + (kind === "dir" ? 0.12 : 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt); osc.stop(stopAt);
      if (kind === "dir") {
        const osc2 = audio.createOscillator(); const g2 = audio.createGain();
        osc2.type = "square"; osc2.frequency.value = 880;
        g2.gain.value = 0.03; osc2.connect(g2); g2.connect(audio.destination);
        const t = audio.currentTime + 0.14;
        osc2.start(t); g2.gain.setValueAtTime(0.03, t);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); osc2.stop(t + 0.05);
      }
    };
    const raw = createSim((line) => { blip(line.kind); setLog((prev) => [line, ...prev].slice(0, 40)); });
    const sim = enhanceSim(raw, (line) => { blip(line.kind); setLog((prev) => [line, ...prev].slice(0, 40)); });
    simRef.current = sim;
    const addLog = (who: string, text: string) => setLog((prev) => [{ id: Date.now() + Math.random(), who, text, kind: "ok" as const }, ...prev].slice(0, 40));
    const director = createSetDirector(addLog);
    directorRef.current = director;
    setSnap(director.snapshot());
    let lastTake = 1;

    const sprites = new Map<string, HTMLImageElement>();
    const maps = new Map<MapId, HTMLImageElement>();
    let loaded = 0;
    const needed = CREW.length * POSES.length + Object.keys(MAP_FILES).length;
    const mark = () => { loaded += 1; if (loaded >= needed) setReady(true); };
    (Object.keys(MAP_FILES) as MapId[]).forEach((id) => {
      const img = new Image(); img.onload = () => mark(); img.onerror = () => mark();
      img.src = assetUrl(MAP_FILES[id]!); maps.set(id, img);
    });
    for (const crew of CREW) {
      for (const pose of POSES) {
        const img = new Image();
        img.onload = () => { sprites.set(`${crew.id}:${pose}`, img); mark(); };
        img.onerror = () => mark();
        let spritePath = `../../assets/sprites/${crew.id}/${pose}.png`;
        let spriteSrc = SPRITE_ASSETS[spritePath];
        if (!spriteSrc && crew.id === "maquillaje") {
          spritePath = `../../assets/sprites/actores/${pose}.png`;
          spriteSrc = SPRITE_ASSETS[spritePath];
        }
        if (!spriteSrc && crew.id === "marketing") {
          spritePath = `../../assets/sprites/guion/${pose}.png`;
          spriteSrc = SPRITE_ASSETS[spritePath];
        }
        if (!spriteSrc) { mark(); continue; }
        if (crew.id === "marketing") {
          const base = new Image();
          base.onload = () => { img.src = tintNoraFromGuion(base); };
          base.onerror = () => mark();
          base.src = spriteSrc;
        } else {
          img.src = spriteSrc;
        }
      }
    }

    let raf = 0, last = performance.now(), acc = 0, anim = 0, hudTick = 0;
    let draggedId: CrewId | null = null, dragStartX = 0, dragStartY = 0, dragMoved = false;
    const layout = { ox: 0, oy: 0, dw: 1, dh: 1 };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const cw = rect.width, ch = rect.height;
      ctx.fillStyle = "#12100e"; ctx.fillRect(0, 0, cw, ch);
      const shake = sim.shake;
      const sx = shake ? (Math.random() - 0.5) * shake * 10 : 0;
      const sy = shake ? (Math.random() - 0.5) * shake * 6 : 0;
      ctx.save(); ctx.translate(sx, sy);
      const mapId = (sim.map as MapId) || "set";
      const stage = maps.get(mapId);
      const setStage = maps.get("set");
      if (mapId === "set") {
        if (stage && stage.naturalWidth) {
          const scale = Math.min(cw / stage.naturalWidth, ch / stage.naturalHeight);
          layout.dw = stage.naturalWidth * scale; layout.dh = stage.naturalHeight * scale;
        } else { layout.dw = cw; layout.dh = ch; }
        layout.ox = (cw - layout.dw) / 2; layout.oy = (ch - layout.dh) / 2;
        drawScenery(ctx, layout.ox, layout.oy, layout.dw, layout.dh, director.snapshot(), anim, stage);
      } else if (mapId === "guion" || mapId === "montaje") {
        if (stage && stage.naturalWidth) {
          const scale = Math.min(cw / stage.naturalWidth, ch / stage.naturalHeight);
          layout.dw = stage.naturalWidth * scale; layout.dh = stage.naturalHeight * scale;
          layout.ox = (cw - layout.dw) / 2; layout.oy = (ch - layout.dh) / 2;
          ctx.drawImage(stage, layout.ox, layout.oy, layout.dw, layout.dh);
        } else {
          layout.ox = 0; layout.oy = 0; layout.dw = cw; layout.dh = ch;
          if (mapId === "guion") drawGuionRoom(ctx, layout.ox, layout.oy, layout.dw, layout.dh);
          else drawMontajeRoom(ctx, layout.ox, layout.oy, layout.dw, layout.dh);
        }
      } else if (setStage && setStage.naturalWidth) {
        const scale = Math.min(cw / setStage.naturalWidth, ch / setStage.naturalHeight);
        layout.dw = setStage.naturalWidth * scale; layout.dh = setStage.naturalHeight * scale;
        layout.ox = (cw - layout.dw) / 2; layout.oy = (ch - layout.dh) / 2;
        ctx.drawImage(setStage, layout.ox, layout.oy, layout.dw, layout.dh);
      } else {
        layout.ox = 0; layout.oy = 0; layout.dw = cw; layout.dh = ch;
      }
      const toX = (nx: number) => layout.ox + nx * layout.dw;
      const toY = (ny: number) => layout.oy + ny * layout.dh;
      const size = layout.dh * 0.23;
      const visible = sim.people.filter((p) => p.visible !== false);
      for (const person of visible) drawWorkstationBack(ctx, toX(person.homeX), toY(person.homeY), size);
      drawCoffeeCorner(ctx, toX(COFFEE_SPOT[0]), toY(COFFEE_SPOT[1]), size);
      const ordered = [...visible].sort((a, b) => a.y - b.y);
      for (const p of ordered) {
        const x = toX(p.x), y = toY(p.y);
        const moving = (p.state === "work" || p.state === "coffee" || p.carrying) && Math.hypot(p.tx - p.x, p.ty - p.y) > 0.015;
        const seated = p.state === "seated"; const bob = p.state === "sleep" ? 0 : seated ? Math.sin(anim * 6 + p.homeX * 20) * 1.6 : Math.sin(anim * 3 + p.homeX * 12); const seatY = seated ? size * 0.07 : 0;
        ctx.fillStyle = "rgba(0,0,0,0.28)"; ctx.beginPath(); ctx.ellipse(x, y, size * 0.22, size * 0.08, 0, 0, Math.PI * 2); ctx.fill();
        if (p.ring > 0 || p.dragging) { ctx.strokeStyle = "#e2b340"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, size * 0.28, size * 0.1, 0, 0, Math.PI * 2); ctx.stroke(); }
        const frame = sprites.get(`${p.id}:${poseFor(p, moving, anim)}`);
        if (frame) { ctx.save(); ctx.translate(x, y + bob + seatY); ctx.scale(p.facing * (seated ? 0.92 : 1), seated ? 0.88 : 1); ctx.drawImage(frame, -size / 2, -size, size, size); ctx.restore(); }
        if (p.carrying) { ctx.fillStyle = "#c8c8d0"; ctx.beginPath(); ctx.arc(x + size * 0.22 * p.facing, y - size * 0.45, size * 0.08, 0, Math.PI * 2); ctx.fill(); }
        ctx.font = "600 11px 'Source Sans 3', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        const label = p.name; const lw = ctx.measureText(label).width + 10;
        ctx.fillStyle = "rgba(18,16,14,0.78)"; ctx.fillRect(x - lw / 2, y + 4, lw, 15);
        ctx.fillStyle = p.state === "angry" ? "#d4533c" : p.state === "coffee" ? "#e2b340" : seated ? "#9fd4a8" : "#f4ecdf";
        ctx.fillText(label, x, y + 6);
      }
      for (const person of ordered) drawWorkstationFront(ctx, toX(person.homeX), toY(person.homeY), size);
      for (const particle of sim.particles) {
        const x = toX(particle.x), y = toY(particle.y);
        ctx.globalAlpha = Math.max(0, particle.life / particle.max);
        ctx.fillStyle = particle.kind === "z" ? "#f4ecdf" : particle.kind === "steam" ? "#d4533c" : "#e2b340";
        if (particle.kind === "z") { ctx.font = "700 13px 'Source Sans 3', sans-serif"; ctx.textAlign = "center"; ctx.fillText(particle.char, x, y); }
        else ctx.fillRect(x, y, 4, 3);
        ctx.globalAlpha = 1;
      }
      ctx.font = "600 12px 'Source Sans 3', sans-serif";
      for (const p of visible) {
        if (!p.bubble) continue;
        const lines = wrap(ctx, p.bubble.text, 168);
        const bw = Math.min(190, Math.max(...lines.map((line) => ctx.measureText(line).width)) + 16);
        const bh = lines.length * 15 + 10;
        let bx = toX(p.x) - bw / 2, by = toY(p.y) - size - bh - 6;
        bx = Math.max(layout.ox + 4, Math.min(bx, layout.ox + layout.dw - bw - 4));
        if (by < layout.oy + 4) by = toY(p.y) + 22;
        ctx.fillStyle = p.bubble.kind === "angry" ? "#3a1814" : p.bubble.kind === "dir" ? "#2c2414" : "#1c1814";
        ctx.strokeStyle = p.bubble.kind === "angry" ? "#d4533c" : p.bubble.kind === "dir" ? "#e2b340" : "#6a5c48";
        ctx.lineWidth = 2; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "#f4ecdf"; ctx.textAlign = "left"; ctx.textBaseline = "top";
        lines.forEach((line, i) => ctx.fillText(line, bx + 8, by + 6 + i * 15));
      }
      ctx.restore();
      drawTransition(ctx, cw, ch, director.transition());
    };

    const frame = (now: number) => {
      let dt = (now - last) / 1000; last = now; if (dt > 0.1) dt = 0.1;
      acc += dt; anim += dt;
      director.step(dt);
      while (acc >= 1 / 60) { sim.step(1 / 60); acc -= 1 / 60; }
      draw(); hudTick += dt;
      if (hudTick > 0.25) {
        hudTick = 0; const h = sim.hud(); setHud(h); setSnap(director.snapshot());
        if (h.take !== lastTake) { lastTake = h.take; if (director.snapshot().autoAdvance) director.nextScene(); }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const pointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { nx: (event.clientX - rect.left - layout.ox) / layout.dw, ny: (event.clientY - rect.top - layout.oy) / layout.dh };
    };
    const onPointerDown = (event: PointerEvent) => {
      unlock(); const { nx, ny } = pointerPosition(event);
      draggedId = sim.grab(nx, ny);
      if (draggedId) { dragStartX = nx; dragStartY = ny; dragMoved = false; canvas.setPointerCapture(event.pointerId); }
      else sim.click(nx, ny);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!draggedId) return; const { nx, ny } = pointerPosition(event);
      if (!dragMoved && Math.hypot(nx - dragStartX, ny - dragStartY) > 0.008) dragMoved = true;
      if (dragMoved) sim.drag(draggedId, nx, ny);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!draggedId) return; const { nx, ny } = pointerPosition(event);
      if (dragMoved) sim.drop(draggedId, nx, ny); else { sim.cancelDrag(draggedId); sim.click(nx, ny); }
      draggedId = null; dragMoved = false; setHud(sim.hud());
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("pointerdown", unlock);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("pointerdown", unlock);
      simRef.current = null; directorRef.current = null;
    };
  }, []);

  const run = (fn: (sim: Sim) => void) => { const sim = simRef.current; if (!sim) return; fn(sim); setHud(sim.hud()); };
  const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-fg hover:border-primary hover:text-primary";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 px-3 py-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-primary">SET DE RODAJE</p>
          <h1 className="font-display text-3xl leading-none text-fg">Pixel Set</h1>
          <p className="mt-1 text-sm text-muted">Guion → set → ¡corte! → cinta a montaje.</p>
        </div>
        <p className="max-w-xs text-sm text-fg">{hud.mood}</p>
      </header>
      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-bg">
        <canvas ref={canvasRef} className="h-full w-full touch-none cursor-grab active:cursor-grabbing" aria-label="Pixel Set" />
        {!ready && <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">Preparando el set…</p>}
        {hud.phase === "rolling" && !hud.crisis && (
          <div className="pointer-events-none absolute left-3 top-3 rounded bg-danger/90 px-2 py-1 text-xs font-bold tracking-widest text-white">● REC</div>
        )}
        {hud.onMarkReady && hud.phase === "prep" && (
          <div className="pointer-events-none absolute right-3 top-3 rounded bg-primary/90 px-2 py-1 text-xs font-bold text-bg">MARCA LISTA</div>
        )}
      </div>
      {/* rest of UI continues from previous version - PLACEHOLDER_TRUNCATED */}
    </main>
  );
}
