import { useEffect, useRef, useState } from "react";
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
const MAP_FILES: Partial<Record<MapId, string>> = { set: "/set/stage.jpg" };

const INITIAL_LOG: LogLine[] = [
  { id: -3, who: "Rey", text: "Bienvenidos al set.", kind: "dir" },
  { id: -2, who: "Sol", text: "Sala de guion lista.", kind: "ok" },
  { id: -1, who: "Nora", text: "Marketing ya tiene la línea del estudio.", kind: "ok" },
];

const INITIAL_HUD: Hud = {
  take: 1, scene: "La traición · Drama", stress: 12, quality: 8,
  mood: "Sala de guion.", paused: false, timeLeft: 90,
  objective: "Cerrar el guion", stationCount: CREW.length, coffeeCount: 0, manualRescues: 0, rescueGoal: 3,
  phase: "guion", map: "guion", mapLabel: "Sala de guion", transitioning: false,
  people: CREW.map((c) => ({ id: c.id, name: c.name, role: c.role, state: "work" as const, moving: false })),
  dayGoodTakes: 0, dayTarget: 3, lastStars: 0, totalStars: 0,
  genre: "Drama", unlockedGenres: ["Drama"],
  crisis: null, takeResult: null, onMarkReady: false, bonds: [],
};

function assetUrl(path: string) {
  if (typeof window === "undefined") return path;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}${path}`;
}

function poseFor(p: Person, moving: boolean, t: number) {
  if (p.state === "sleep") return "pose-4";
  if (p.state === "angry") return "pose-3";
  const step = Math.floor(t * (moving ? 8 : 2) + p.homeX * 10) % 2;
  return step === 0 ? "pose-1" : "pose-2";
}

export function FilmSet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  const directorRef = useRef<SetDirector | null>(null);
  const [snap, setSnap] = useState<SetSnapshot | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [ready, setReady] = useState(false);
  const [activeWindow, setActiveWindow] = useState<"director" | "story" | "advisors" | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const raw = createSim((line) => setLog((prev) => [line, ...prev].slice(0, 40)));
    const sim = enhanceSim(raw, (line) => setLog((prev) => [line, ...prev].slice(0, 40)));
    simRef.current = sim;
    const director = createSetDirector((who, text) =>
      setLog((prev) => [{ id: Date.now(), who, text, kind: "ok" as const }, ...prev].slice(0, 40)),
    );
    directorRef.current = director;
    setSnap(director.snapshot());

    const sprites = new Map<string, HTMLImageElement>();
    const maps = new Map<MapId, HTMLImageElement>();
    let loaded = 0;
    const needed = CREW.length * POSES.length + Object.keys(MAP_FILES).length;
    const mark = () => {
      loaded += 1;
      if (loaded >= needed) setReady(true);
    };

    (Object.keys(MAP_FILES) as MapId[]).forEach((id) => {
      const img = new Image();
      img.onload = () => mark();
      img.onerror = () => mark();
      img.src = assetUrl(MAP_FILES[id]!);
      maps.set(id, img);
    });

    for (const crew of CREW) {
      for (const pose of POSES) {
        const img = new Image();
        img.onload = () => {
          sprites.set(`${crew.id}:${pose}`, img);
          mark();
        };
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
        if (!spriteSrc) {
          mark();
          continue;
        }
        if (crew.id === "marketing") {
          const base = new Image();
          base.onload = () => {
            img.src = tintNoraFromGuion(base);
          };
          base.onerror = () => mark();
          base.src = spriteSrc;
        } else {
          img.src = spriteSrc;
        }
      }
    }

    let raf = 0;
    let last = performance.now();
    let anim = 0;
    const layout = { ox: 0, oy: 0, dw: 1, dh: 1 };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const cw = rect.width;
      const ch = rect.height;
      ctx.fillStyle = "#12100e";
      ctx.fillRect(0, 0, cw, ch);
      const mapId = (sim.map as MapId) || "set";
      const stage = maps.get(mapId);
      if (mapId === "set" && stage) {
        const scale = Math.min(cw / (stage.naturalWidth || cw), ch / (stage.naturalHeight || ch));
        layout.dw = (stage.naturalWidth || cw) * scale;
        layout.dh = (stage.naturalHeight || ch) * scale;
        layout.ox = (cw - layout.dw) / 2;
        layout.oy = (ch - layout.dh) / 2;
        drawScenery(ctx, layout.ox, layout.oy, layout.dw, layout.dh, director.snapshot(), anim, stage);
      } else {
        layout.ox = 0;
        layout.oy = 0;
        layout.dw = cw;
        layout.dh = ch;
        if (mapId === "guion") drawGuionRoom(ctx, 0, 0, cw, ch);
        else if (mapId === "montaje") drawMontajeRoom(ctx, 0, 0, cw, ch);
      }
      const toX = (nx: number) => layout.ox + nx * layout.dw;
      const toY = (ny: number) => layout.oy + ny * layout.dh;
      const size = layout.dh * 0.23;
      const visible = sim.people.filter((p) => p.visible !== false);
      const ordered = [...visible].sort((a, b) => a.y - b.y);
      for (const p of ordered) {
        const x = toX(p.x);
        const y = toY(p.y);
        const moving =
          (p.state === "work" || p.state === "coffee" || p.carrying) &&
          Math.hypot(p.tx - p.x, p.ty - p.y) > 0.015;
        const frame = sprites.get(`${p.id}:${poseFor(p, moving, anim)}`);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        if (frame) {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(p.facing, 1);
          ctx.drawImage(frame, -size / 2, -size, size, size);
          ctx.restore();
        }
        ctx.font = "600 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#f4ecdf";
        ctx.fillText(p.name, x, y + 8);
      }
      drawTransition(ctx, cw, ch, director.transition());
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      anim += dt;
      director.step(dt);
      sim.step(dt);
      draw();
      setHud(sim.hud());
      setSnap(director.snapshot());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      simRef.current = null;
      directorRef.current = null;
    };
  }, []);

  const run = (fn: (sim: Sim) => void) => {
    const sim = simRef.current;
    if (!sim) return;
    fn(sim);
    setHud(sim.hud());
  };

  return (
    <main className="studio-game relative h-[100dvh] min-h-[480px] w-full overflow-hidden bg-[#100e0c] text-fg">
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Pixel Set — escenario de rodaje" />
        {!ready && <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 text-sm text-muted">Preparando el set…</div>}
      </div>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-3 pb-7 pt-3 sm:px-6 sm:pt-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary sm:text-xs">SET DE RODAJE</p>
          <h1 className="font-display text-xl text-white drop-shadow sm:text-3xl">Pixel Set</h1>
          <p className="max-w-[52vw] truncate text-xs text-white/75 sm:text-sm">{hud.mood}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5 text-[10px] sm:gap-2 sm:text-xs">
          <div className="rounded-md border border-white/15 bg-black/55 px-2 py-1.5 backdrop-blur"><span className="text-white/55">TOMA </span><strong className="text-white">{hud.take}</strong></div>
          <div className="rounded-md border border-white/15 bg-black/55 px-2 py-1.5 backdrop-blur"><span className="text-white/55">ESTRELLAS </span><strong className="text-primary">{hud.totalStars ?? 0}</strong></div>
          <div className="rounded-md border border-white/15 bg-black/55 px-2 py-1.5 backdrop-blur"><span className="text-white/55">EQUIPO </span><strong className="text-white">{hud.stationCount}</strong></div>
        </div>
      </header>
      <div className="pointer-events-none absolute bottom-[76px] left-3 z-10 max-w-[min(72vw,340px)] rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs text-white/85 shadow-lg backdrop-blur sm:bottom-24 sm:left-6">
        <p className="text-[9px] font-bold tracking-[0.18em] text-primary">OBJETIVO ACTUAL</p>
        <p className="mt-0.5 truncate font-semibold">{hud.objective}</p>
        <p className="mt-0.5 text-[10px] text-white/55">{hud.mapLabel} · {hud.timeLeft}s</p>
      </div>
      <nav aria-label="Menú del estudio" className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-1 rounded-xl border border-white/15 bg-[#17130f]/95 p-1.5 shadow-2xl shadow-black/50 backdrop-blur-xl sm:bottom-5 sm:gap-2 sm:p-2">
        <button type="button" onClick={() => setActiveWindow(activeWindow === "director" ? null : "director")} aria-expanded={activeWindow === "director"} className={`flex min-w-[62px] flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors sm:min-w-[78px] sm:px-3 ${activeWindow === "director" ? "bg-primary/20 text-primary" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><span className="text-lg leading-none">🎬</span><span>Escena</span></button>
        <button type="button" onClick={() => setActiveWindow(activeWindow === "story" ? null : "story")} aria-expanded={activeWindow === "story"} className={`flex min-w-[62px] flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors sm:min-w-[78px] sm:px-3 ${activeWindow === "story" ? "bg-primary/20 text-primary" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><span className="text-lg leading-none">📖</span><span>Historias</span></button>
        <button type="button" onClick={() => setActiveWindow(activeWindow === "advisors" ? null : "advisors")} aria-expanded={activeWindow === "advisors"} className={`flex min-w-[62px] flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-semibold transition-colors sm:min-w-[78px] sm:px-3 ${activeWindow === "advisors" ? "bg-primary/20 text-primary" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><span className="text-lg leading-none">🧠</span><span>Estudio</span></button>
        <button type="button" onClick={() => run((sim) => hud.paused ? sim.accion() : sim.corten())} className="flex min-w-[62px] flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:min-w-[78px] sm:px-3"><span className="text-lg leading-none">{hud.paused ? "▶️" : "⏸️"}</span><span>{hud.paused ? "Seguir" : "Pausa"}</span></button>
        <button type="button" onClick={() => setActiveWindow(null)} aria-label="Cerrar ventanas" className="ml-0.5 flex size-10 items-center justify-center rounded-lg border border-white/10 text-lg text-white/65 transition-colors hover:bg-white/10 hover:text-white">×</button>
      </nav>
      {activeWindow && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45 p-2 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveWindow(null); }}>
          <section role="dialog" aria-modal="true" aria-label={activeWindow === "director" ? "Puesta en escena" : activeWindow === "story" ? "Director de historias" : "Asesores del estudio"} className="flex max-h-[calc(100dvh-104px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-primary/35 bg-[#17130f]/[.98] shadow-2xl shadow-black/60">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/25 px-4 py-3 sm:px-5">
              <div><p className="text-[9px] font-bold tracking-[0.2em] text-primary">PIXEL SET · PANEL DE CONTROL</p><h2 className="font-display text-lg text-white sm:text-xl">{activeWindow === "director" ? "Puesta en escena" : activeWindow === "story" ? "Director narrativo" : "Estudio y asesores"}</h2></div>
              <button type="button" onClick={() => setActiveWindow(null)} aria-label="Cerrar ventana" className="flex size-9 items-center justify-center rounded-md border border-white/10 text-xl text-white/70 hover:bg-white/10 hover:text-white">×</button>
            </div>
            <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
              {activeWindow === "director" && snap && directorRef.current && <SetDirectorPanel snap={snap} director={directorRef.current} />}
              {activeWindow === "story" && <StoryDirector onDecision={(choice) => run((sim) => sim.storyDecision(choice.consequence, choice.effects.quality ?? 0, choice.effects.tension ?? 0, choice.effects.morale ?? 0))} />}
              {activeWindow === "advisors" && <AdvisorPanel />}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}