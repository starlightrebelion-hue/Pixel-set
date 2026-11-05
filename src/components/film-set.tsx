import { useEffect, useRef, useState } from "react";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { CREW, STATIONS, type CrewId, type MapId } from "@/game/crew";
import { tintNoraFromGuion } from "@/game/nora-tint";
import { createSim, type Hud, type LogLine, type Person, type Sim } from "@/game/sim";
import { enhanceSim } from "@/game/enhance-sim";
import { drawGuionRoom, drawMontajeRoom } from "@/game/map-draw";
import { AdvisorPanel } from "@/components/advisor-panel";
import { SetDirectorPanel } from "@/components/set-director-panel";
import { createSetDirector, type SetDirector, type SetSnapshot } from "@/game/set-director";
import { drawScenery, drawTransition } from "@/game/scenery-draw";
import { StoryDirector } from "@/components/story-director";
import { CommandBar } from "@/components/command-bar";
import {
  CAMERA_DEFAULT,
  drawIsoGrid,
  resetCamera,
  worldToScreen,
  zoomAt,
  type Camera,
} from "@/game/camera";
import { attachMinimapJump, attachTouchCamera, pickCrewAt, screenToWorld } from "@/game/map-view";

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
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  const directorRef = useRef<SetDirector | null>(null);
  const camRef = useRef<Camera>({ ...CAMERA_DEFAULT });
  const [snap, setSnap] = useState<SetSnapshot | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [ready, setReady] = useState(false);
  const [activeWindow, setActiveWindow] = useState<"director" | "story" | "advisors" | null>(null);
  const [selectedId, setSelectedId] = useState<CrewId | null>(null);
  const selectedRef = useRef<CrewId | null>(null);
  const [camTick, setCamTick] = useState(0);
  selectedRef.current = selectedId;

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
    const mark = () => { loaded += 1; if (loaded >= needed) setReady(true); };

    (Object.keys(MAP_FILES) as MapId[]).forEach((id) => {
      const img = new Image();
      img.onload = () => mark(); img.onerror = () => mark();
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
        } else img.src = spriteSrc;
      }
    }

    let raf = 0, last = performance.now(), anim = 0;
    const bumpCam = () => setCamTick((n) => n + 1);

    const drawMinimap = () => {
      const mm = minimapRef.current;
      if (!mm) return;
      const g = mm.getContext("2d");
      if (!g) return;
      const w = mm.width, h = mm.height;
      const mapId = sim.map as MapId;
      g.clearRect(0, 0, w, h);
      g.fillStyle = mapId === "guion" ? "#5b4530" : mapId === "montaje" ? "#293b4b" : "#263126";
      g.fillRect(0, 0, w, h);
      g.save(); g.globalAlpha = 0.26; g.strokeStyle = "#b9c8a0"; g.lineWidth = .7;
      for (let x=10;x<w;x+=12) { g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke(); }
      for (let y=8;y<h;y+=12) { g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); }
      g.restore();
      const block = (x:number,y:number,bw:number,bh:number,color:string) => {
        g.fillStyle=color; g.fillRect(x*w,y*h,bw*w,bh*h);
        g.strokeStyle="rgba(235,225,190,.42)"; g.lineWidth=1;
        g.strokeRect(x*w+.5,y*h+.5,bw*w-1,bh*h-1);
      };
      if (mapId === "guion") {
        block(.04,.08,.18,.18,"#725034"); block(.28,.1,.17,.2,"#765536");
        block(.56,.08,.16,.17,"#5d442f"); block(.78,.1,.16,.2,"#6c5136");
        block(.22,.48,.18,.13,"#a07a4c"); block(.45,.54,.18,.13,"#a07a4c"); block(.67,.46,.13,.14,"#a07a4c");
      } else if (mapId === "montaje") {
        for (let i=0;i<4;i++) block(.06+i*.22,.1,.16,.2,i%2?"#315d70":"#284b60");
        block(.08,.48,.2,.22,"#55546b"); block(.36,.48,.2,.22,"#4b5b6b"); block(.64,.48,.2,.22,"#55546b");
      } else {
        block(.08,.08,.2,.16,"#47503b"); block(.36,.08,.26,.17,"#3b4936"); block(.72,.08,.19,.17,"#47503b");
        block(.12,.55,.16,.16,"#5a4933"); block(.72,.52,.17,.2,"#514936"); block(.42,.35,.17,.2,"#8b6740");
      }
      for (const station of Object.values(STATIONS[mapId])) {
        if (!station) continue;
        g.fillStyle="rgba(226,179,64,.36)"; g.beginPath(); g.arc(station.x*w,station.y*h,3.2,0,Math.PI*2); g.fill();
      }
      for (const p of sim.people.filter((x) => x.visible !== false)) {
        const selected=selectedRef.current===p.id;
        g.fillStyle=selected?"#fff0a0":p.state==="angry"?"#e45c48":p.state==="coffee"?"#6dc6d2":p.id==="director"?"#e2b340":p.id==="marketing"?"#6cc8bf":"#b4d77a";
        g.beginPath(); g.arc(p.x*w,p.y*h,selected?4.2:2.8,0,Math.PI*2); g.fill();
        if(selected){g.strokeStyle="#fff0a0";g.lineWidth=1;g.beginPath();g.arc(p.x*w,p.y*h,6.2,0,Math.PI*2);g.stroke();}
      }
      const r=canvas.getBoundingClientRect();
      const corners=[
        screenToWorld(0,0,camRef.current,r.width,r.height),
        screenToWorld(r.width,0,camRef.current,r.width,r.height),
        screenToWorld(r.width,r.height,camRef.current,r.width,r.height),
        screenToWorld(0,r.height,camRef.current,r.width,r.height),
      ];
      g.beginPath();
      corners.forEach((p,i)=>{const x=Math.max(0,Math.min(w,p.nx*w)),y=Math.max(0,Math.min(h,p.ny*h));if(i===0)g.moveTo(x,y);else g.lineTo(x,y);});
      g.closePath();g.fillStyle="rgba(226,179,64,.10)";g.fill();g.strokeStyle="#ffe08a";g.lineWidth=1.7;g.stroke();
      g.strokeStyle="rgba(255,240,180,.55)";g.lineWidth=1;g.strokeRect(.5,.5,w-1,h-1);
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const cw = rect.width, ch = rect.height;
      const cam = camRef.current;

      ctx.fillStyle = "#070906";
      ctx.fillRect(0, 0, cw, ch);
      drawIsoGrid(ctx, cam, cw, ch, 12);

      const mapId = (sim.map as MapId) || "set";
      const stage = maps.get(mapId);

      if (mapId === "set" && stage) {
        const tl = worldToScreen(0, 0.35, cam, cw, ch);
        const br = worldToScreen(1, 1, cam, cw, ch);
        drawScenery(ctx, tl.x, tl.y, Math.max(40, br.x - tl.x), Math.max(40, br.y - tl.y), director.snapshot(), anim, stage);
      } else if (mapId === "guion") {
        const tl = worldToScreen(0.05, 0.35, cam, cw, ch);
        const br = worldToScreen(0.95, 0.95, cam, cw, ch);
        drawGuionRoom(ctx, tl.x, tl.y, Math.max(40, br.x - tl.x), Math.max(40, br.y - tl.y));
      } else if (mapId === "montaje") {
        const tl = worldToScreen(0.05, 0.35, cam, cw, ch);
        const br = worldToScreen(0.95, 0.95, cam, cw, ch);
        drawMontajeRoom(ctx, tl.x, tl.y, Math.max(40, br.x - tl.x), Math.max(40, br.y - tl.y));
      }

      const ordered = [...sim.people.filter((p) => p.visible !== false)].sort((a, b) => a.y - b.y);
      for (const p of ordered) {
        const scr = worldToScreen(p.x, p.y, cam, cw, ch);
        const size = (ch * 0.2) * cam.zoom * 0.95;
        const moving =
          (p.state === "work" || p.state === "coffee" || p.carrying) &&
          Math.hypot(p.tx - p.x, p.ty - p.y) > 0.015;
        const frame = sprites.get(`${p.id}:${poseFor(p, moving, anim)}`);
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath();
        ctx.ellipse(scr.x, scr.y, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        if (selectedRef.current === p.id || p.ring > 0) {
          ctx.strokeStyle = "#e2b340";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(scr.x, scr.y, size * 0.28, size * 0.1, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (frame) {
          ctx.save();
          ctx.translate(scr.x, scr.y);
          ctx.scale(p.facing, 1);
          ctx.drawImage(frame, -size / 2, -size, size, size);
          ctx.restore();
        }
        ctx.font = "600 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        const lw = ctx.measureText(p.name).width + 8;
        ctx.fillRect(scr.x - lw / 2, scr.y + 4, lw, 14);
        ctx.fillStyle = p.id === selectedRef.current ? "#e2b340" : "#f4ecdf";
        ctx.fillText(p.name, scr.x, scr.y + 14);
      }
      drawTransition(ctx, cw, ch, director.transition());
      drawMinimap();
    };

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now; anim += dt;
      director.step(dt);
      sim.step(dt);
      draw();
      setHud(sim.hud());
      setSnap(director.snapshot());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const detachTouch = attachTouchCamera({
      canvas,
      camRef,
      onCamChange: bumpCam,
      onTap: (sx, sy, r) => {
        const world = screenToWorld(sx, sy, camRef.current, r.width, r.height);
        const best = pickCrewAt(sim.people, world.nx, world.ny, 0.08);
        if (best) {
          setSelectedId(best);
          sim.grab(world.nx, world.ny);
        } else {
          setSelectedId(null);
          sim.click(world.nx, world.ny);
        }
        const sel = selectedRef.current;
        if (sel) sim.drop(sel, world.nx, world.ny);
      },
    });

    let mmCleanup: (() => void) | null = null;
    const attachMm = () => {
      const mm = minimapRef.current;
      if (!mm || mmCleanup) return;
      mmCleanup = attachMinimapJump(mm, canvas, camRef, bumpCam);
    };
    attachMm();
    const mmTimer = window.setTimeout(attachMm, 250);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(mmTimer);
      detachTouch();
      mmCleanup?.();
      simRef.current = null; directorRef.current = null;
    };
  }, []);

  const run = (fn: (sim: Sim) => void) => {
    const sim = simRef.current;
    if (!sim) return;
    fn(sim);
    setHud(sim.hud());
  };

  const onAction = (action: "pause" | "coffee" | "resetCam" | "zoomIn" | "zoomOut") => {
    if (action === "resetCam") {
      camRef.current = resetCamera();
      setCamTick((n) => n + 1);
      return;
    }
    if (action === "zoomIn" || action === "zoomOut") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const r = canvas.getBoundingClientRect();
      camRef.current = zoomAt(
        camRef.current,
        action === "zoomIn" ? 1.15 : 0.87,
        r.width / 2, r.height / 2, r.width, r.height,
      );
      setCamTick((n) => n + 1);
      return;
    }
    run((sim) => {
      if (action === "pause") {
        if (sim.hud().paused) sim.accion();
        else sim.corten();
      }
      if (action === "coffee") sim.coordinate();
    });
  };

  void camTick;

  return (
    <main className="studio-game relative h-[100dvh] min-h-[480px] w-full overflow-hidden bg-[#070906] text-fg">
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair"
          style={{ touchAction: "none" }}
          aria-label="Mapa del set"
        />
        {!ready && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40 text-sm text-muted">
            Preparando el set…
          </div>
        )}
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/30 to-transparent px-3 pb-8 pt-3 sm:px-5">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-[#9fbf5a]">PIXEL SET · COMMAND CENTER</p>
          <h1 className="font-display text-xl text-white drop-shadow sm:text-3xl">Estudio en vivo</h1>
          <p className="text-xs text-white/70">{hud.mood}</p>
        </div>
        <div className="rounded border border-[#4a6b28] bg-[#0a0e06]/90 px-2 py-1 text-[10px] text-[#9fbf5a]">
          ZOOM {(camRef.current.zoom * 100) | 0}%
        </div>
      </header>

      <CommandBar
        hud={hud}
        log={log}
        selectedId={selectedId}
        activePanel={activeWindow}
        onSelectPanel={setActiveWindow}
        onAction={onAction}
        minimapRef={minimapRef}
        onSelectMap={(map) => {
          run((sim) => sim.goMap(map));
          camRef.current = resetCamera();
          setCamTick((n) => n + 1);
        }}
      />

      {activeWindow && (
        <div
          className="absolute inset-0 z-30 flex items-end justify-center bg-black/55 p-3 pb-[120px] sm:items-center sm:pb-3"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveWindow(null); }}
        >
          <section className="flex max-h-[calc(100dvh-140px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#4a6b28] bg-[#12180c]/98 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3d5a1e] px-4 py-3">
              <h2 className="font-display text-lg text-white">
                {activeWindow === "director" ? "Puesta en escena" : activeWindow === "story" ? "Director narrativo" : "Estudio y asesores"}
              </h2>
              <button type="button" onClick={() => setActiveWindow(null)} className="sc-btn px-3 py-1 text-sm">×</button>
            </div>
            <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
              {activeWindow === "director" && snap && directorRef.current && (
                <SetDirectorPanel snap={snap} director={directorRef.current} />
              )}
              {activeWindow === "story" && (
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
              )}
              {activeWindow === "advisors" && <AdvisorPanel />}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
