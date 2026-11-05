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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 px-3 py-3">
      <header>
        <p className="text-xs font-semibold tracking-[0.22em] text-primary">SET DE RODAJE</p>
        <h1 className="font-display text-3xl text-fg">Pixel Set</h1>
        <p className="text-sm text-muted">{hud.mood}</p>
      </header>
      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-bg">
        <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Pixel Set" />
        {!ready && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
            Preparando el set…
          </p>
        )}
      </div>
      <p className="text-xs text-muted">
        Nora (marketing) usa sprites teal derivados de Sol. Estrellas: {hud.totalStars ?? 0}
      </p>
      {snap && directorRef.current && <SetDirectorPanel snap={snap} director={directorRef.current} />}
      <StoryDirector
        onDecision={(choice) =>
          run((sim) =>
            sim.storyDecision(
              choice.consequence,
              choice.effects.quality ?? 0,
              choice.effects.tension ?? 0,
              choice.effects.morale ?? 0,
            ),
          )
        }
      />
      <AdvisorPanel />
    </main>
  );
}
