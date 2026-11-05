import { useEffect, useRef, useState } from "react";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { CREW, type CrewId, type MapId } from "@/game/crew";
import { tintNoraFromGuion } from "@/game/nora-tint";
import { createSim, type Hud, type LogLine, type Person, type Sim } from "@/game/sim";
import { GENRE_SLUGS } from "@/game/diorama-sets";
import { enhanceSim, type Enhanced } from "@/game/enhance-sim";
import { createCustomStory, isStoryDefinition, STORY_LIBRARY, type ChallengeStyle, type StoryDefinition, type StoryGenre } from "@/game/stories";
import { drawGuionRoom, drawMontajeRoom } from "@/game/map-draw";
import { AdvisorPanel } from "@/components/advisor-panel";
import { GameMenus } from "@/components/game-menus";
import { CrewRoster } from "@/components/crew-roster";
import { useRoute } from "@/game/use-route";
import { createSetDirector, type SetDirector, type SetSnapshot } from "@/game/set-director";
import { GENRE_ID, drawScenery, drawTransition } from "@/game/scenery-draw";
import { StoryDirector } from "@/components/story-director";
import { CommandBar, type CrewCommandId, type GeneralActionId } from "@/components/command-bar";
import {
  CAMERA_DEFAULT,
  drawIsoGrid,
  resetCamera,
  worldToScreen,
  zoomAt,
  type Camera,
  focusWorld,
} from "@/game/camera";
import { attachMinimapJump, attachTouchCamera, pickCrewAt, screenToWorld } from "@/game/map-view";

const POSES = ["pose-1", "pose-2", "pose-3", "pose-4"] as const;
const SPRITE_ASSETS = import.meta.glob<string>("../../assets/sprites/*/pose-*.png", {
  eager: true, query: "?url", import: "default",
});

/** Retratos de los iconos de equipo (pose 1 de cada rol; Nora usa un inicial). */
const PORTRAITS: Partial<Record<CrewId, string>> = Object.fromEntries(
  CREW.map((c) => [c.id, SPRITE_ASSETS[`../../assets/sprites/${c.id}/pose-1.png`] ?? (c.id === "maquillaje" ? SPRITE_ASSETS["../../assets/sprites/actores/pose-1.png"] : undefined)]).filter(([, v]) => !!v),
);
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

type Screen = "menu" | "stories" | "create" | "playing";
const CUSTOM_STORIES_KEY = "pixel-set-custom-stories-v1";

export function FilmSet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Enhanced | null>(null);
  const directorRef = useRef<SetDirector | null>(null);
  const camRef = useRef<Camera>({ ...CAMERA_DEFAULT });
  const [snap, setSnap] = useState<SetSnapshot | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [ready, setReady] = useState(false);
  const { route, push: routePush, back: routeBack, forward: routeForward } = useRoute(["menu"]);
  const playing = route[0] === "play";
  const gamePath = playing ? route.slice(1) : [];
  const screen: Screen = playing ? "playing" : ((route[1] as Screen | undefined) ?? "menu");
  const setScreen = (next: Screen) => {
    if (next === "playing") routePush(["play"]);
    else if (next === "menu") { if (route[0] === "menu" && route.length > 1) routeBack(); else routePush(["menu"]); }
    else routePush(["menu", next]);
  };
  const [selectedId, setSelectedId] = useState<CrewId | null>(null);
  const selectedRef = useRef<CrewId | null>(null);
  const [camTick, setCamTick] = useState(0);
  selectedRef.current = selectedId;
  const gameActiveRef = useRef(false);
  // El juego corre sólo en pantalla de juego y sin menús abiertos.
  gameActiveRef.current = playing && gamePath.length === 0;
  const [customStories, setCustomStories] = useState<StoryDefinition[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState(STORY_LIBRARY[0]!.id);
  const [customTitle, setCustomTitle] = useState("");
  const [customPremise, setCustomPremise] = useState("");
  const [customGenre, setCustomGenre] = useState<StoryGenre>("Drama");
  const [challengeStyle, setChallengeStyle] = useState<ChallengeStyle>("balanced");
  const [storyError, setStoryError] = useState("");
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CUSTOM_STORIES_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) setCustomStories(parsed.filter(isStoryDefinition).slice(0, 12));
    } catch {
      setCustomStories([]);
    }
  }, []);

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
    // Fondos ilustrados opcionales: public/set/locations/<id>.png (o .jpg). Si no existen, decorado de código.
    const locImgs = new Map<string, HTMLImageElement | null>();
    const getBackdrop = (id: string, genre: string) => {
      if (id === "estudio") return null;
      const key = `${id}|${genre}`;
      if (!locImgs.has(key)) {
        locImgs.set(key, null);
        // Primero la imagen del set; si no existe, la de género (public/set/diorama/genres/<slug>.png|jpg).
        const gid = GENRE_ID[genre];
        const slug = gid ? GENRE_SLUGS[gid] : null;
        const paths = [`/set/locations/${id}.png`, `/set/locations/${id}.jpg`, ...(slug ? [`/set/diorama/genres/${slug}.png`, `/set/diorama/genres/${slug}.jpg`] : [])];
        const tryLoad = (i: number) => {
          if (i >= paths.length) return;
          const img = new Image();
          img.onload = () => locImgs.set(key, img);
          img.onerror = () => tryLoad(i + 1);
          img.src = assetUrl(paths[i]!);
        };
        tryLoad(0);
      }
      return locImgs.get(key) ?? null;
    };
    let lastTake = 1;
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
      g.fillStyle = "#0a0e06"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#3d5a1e"; g.strokeRect(0.5, 0.5, w - 1, h - 1);
      g.strokeStyle = "#1e2e10";
      for (let i = 0; i <= 8; i++) {
        g.beginPath(); g.moveTo((i / 8) * w, 0); g.lineTo((i / 8) * w, h); g.stroke();
        g.beginPath(); g.moveTo(0, (i / 8) * h); g.lineTo(w, (i / 8) * h); g.stroke();
      }
      for (const p of sim.people.filter((x) => x.visible !== false)) {
        g.fillStyle = p.id === "director" ? "#e2b340" : p.id === "marketing" ? "#5ec8c0" : "#9fbf5a";
        g.fillRect(p.x * w - 2.5, p.y * h - 2.5, 5, 5);
      }
      const cam = camRef.current;
      const vw = Math.min(w, w / cam.zoom) * 0.55;
      const vh = Math.min(h, h / cam.zoom) * 0.55;
      const cx = w * 0.5 - cam.panX / (cam.zoom * 8);
      const cy = h * 0.52 - cam.panY / (cam.zoom * 8);
      g.strokeStyle = "#e2b340"; g.lineWidth = 1.5;
      g.strokeRect(cx - vw / 2, cy - vh / 2, vw, vh);
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
        drawScenery(ctx, tl.x, tl.y, Math.max(40, br.x - tl.x), Math.max(40, br.y - tl.y), director.snapshot(), anim, stage, getBackdrop(director.snapshot().location.id, director.snapshot().genre));
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
      if (gameActiveRef.current) sim.step(dt);
      draw();
      const h = sim.hud();
      setHud(h);
      if (h.take !== lastTake) { lastTake = h.take; if (director.snapshot().autoAdvance) director.nextScene(); }
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


  const availableStories = [...STORY_LIBRARY, ...customStories];
  const selectedStory = availableStories.find((story) => story.id === selectedStoryId) ?? STORY_LIBRARY[0]!;
  const startStory = (story: StoryDefinition = selectedStory) => {
    const sim = simRef.current;
    if (!sim) return;
    setLog([]);
    sim.startStory(story);
    setHud(sim.hud());
    setScreen("playing");
  };

  const saveCustomStory = () => {
    if (customTitle.trim().length < 3) {
      setStoryError("Poné un título de al menos tres caracteres.");
      return;
    }
    if (customPremise.trim().length < 12) {
      setStoryError("Contá un poco más de qué trata la historia.");
      return;
    }
    const story = createCustomStory(customTitle, customPremise, customGenre, challengeStyle);
    const next = [...customStories.filter((item) => item.id !== story.id), story].slice(-12);
    setCustomStories(next);
    setSelectedStoryId(story.id);
    setStoryError("");
    try {
      window.localStorage.setItem(CUSTOM_STORIES_KEY, JSON.stringify(next));
    } catch {
      setStoryError("La historia se creó, pero el navegador no permitió guardarla.");
    }
    setScreen("stories");
  };

  const openMenu = () => {
    routePush(["menu"]);
  };

  const run = (fn: (sim: Enhanced) => void) => {
    const sim = simRef.current;
    if (!sim) return;
    fn(sim);
    setHud(sim.hud());
  };

  const zoom = (dir: "in" | "out" | "reset") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (dir === "reset") { camRef.current = resetCamera(); setCamTick((n) => n + 1); return; }
    const r = canvas.getBoundingClientRect();
    camRef.current = zoomAt(camRef.current, dir === "in" ? 1.15 : 0.87, r.width / 2, r.height / 2, r.width, r.height);
    setCamTick((n) => n + 1);
  };
  const centerOn = (id: CrewId) => {
    const canvas = canvasRef.current; const sim = simRef.current;
    const person = sim?.people.find((p) => p.id === id);
    if (!canvas || !person) return;
    const r = canvas.getBoundingClientRect();
    camRef.current = focusWorld(camRef.current, person.x, person.y, r.width, r.height);
    setCamTick((n) => n + 1);
  };
  const selectCrew = (id: CrewId) => { setSelectedId(id); centerOn(id); };
  const onCrewCommand = (cmd: CrewCommandId) => {
    if (cmd === "deselect") { setSelectedId(null); return; }
    if (!selectedId) return;
    if (cmd === "center") { centerOn(selectedId); return; }
    run((sim) => sim.commandCrew(selectedId, cmd));
  };
  const onGeneral = (action: GeneralActionId) => {
    if (action === "center") { zoom("reset"); return; }
    if (action === "scene") { routePush(["play", "scene"]); return; }
    if (action === "story") { routePush(["play", "story"]); return; }
    if (action === "studio") { routePush(["play", "studio"]); return; }
    if (action === "options") { routePush(["play", "opts"]); return; }
    run((sim) => {
      if (action === "action") sim.accion();
      else if (action === "cut") sim.corten();
      else if (action === "team") sim.coordinate();
      else if (action === "pause") { if (sim.hud().paused) sim.accion(); else sim.corten(); }
    });
  };

  void camTick;

  return (
    <main className="studio-game relative h-[100dvh] min-h-[480px] w-full overflow-hidden bg-[#070906] text-fg" style={{ ["--bar-h" as string]: "178px" }}>
      {screen !== "playing" && (
        <div className="absolute inset-0 z-50 overflow-y-auto bg-bg p-3"><section className="min-h-[calc(100dvh-1.5rem)] rounded-lg border border-border bg-surface p-4 sm:p-7">
          <header className="mb-8 flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-xs font-bold tracking-[0.28em] text-primary">ESTUDIO INDEPENDIENTE</p>
              <h1 className="font-display text-3xl leading-tight text-fg sm:text-4xl">PIXEL SET</h1>
            </div>
            <span className="rounded border border-primary/40 px-3 py-2 text-[10px] font-bold tracking-widest text-primary">DIRECTOR'S CUT</span>
          </header>

          {screen === "menu" && (
            <div className="grid items-center gap-8 py-5 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="mb-3 text-xs font-bold tracking-[0.22em] text-primary">EL RODAJE NUNCA SALE COMO ESTÁ PLANEADO</p>
                <h2 className="font-display text-4xl leading-[1.02] text-fg sm:text-6xl">Una película.<br />Ocho personalidades.<br /><span className="text-primary">Un solo director.</span></h2>
                <p className="mt-5 max-w-xl text-sm leading-6 text-muted">Gestioná un equipo de rodaje vivo. Cada integrante tiene su trabajo, sus tiempos y sus distracciones. Vos decidís cuándo intervenir para que la historia llegue al último plano.</p>
                <div className="mt-7 grid max-w-md grid-cols-3 gap-2">
                  <div className="rounded border border-border bg-bg p-3"><p className="font-display text-2xl text-primary">08</p><p className="text-[10px] text-muted">PROFESIONALES</p></div>
                  <div className="rounded border border-border bg-bg p-3"><p className="font-display text-2xl text-primary">03</p><p className="text-[10px] text-muted">CAPÍTULOS</p></div>
                  <div className="rounded border border-border bg-bg p-3"><p className="font-display text-2xl text-primary">03</p><p className="text-[10px] text-muted">INTENTOS</p></div>
                </div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-bg p-4 sm:p-6">
                <p className="mb-4 text-xs font-bold tracking-[0.2em] text-primary">MENÚ PRINCIPAL</p>
                <div className="grid gap-3">
                  <button type="button" onClick={() => setScreen("stories")} className="min-h-14 rounded border border-primary bg-primary px-4 text-left font-bold text-bg hover:brightness-110">NUEVA PARTIDA <span className="block text-xs font-normal opacity-80">Elegí una historia y empezá a rodar</span></button>
                  <button type="button" onClick={() => setScreen("stories")} className="min-h-12 rounded border border-border px-4 text-left text-sm font-semibold text-fg hover:border-primary">MIS HISTORIAS <span className="block text-xs font-normal text-muted">Campañas disponibles: {availableStories.length}</span></button>
                  <button type="button" onClick={() => { setStoryError(""); setScreen("create"); }} className="min-h-12 rounded border border-border px-4 text-left text-sm font-semibold text-fg hover:border-primary">CREAR HISTORIA <span className="block text-xs font-normal text-muted">Inventá el argumento de tu próxima película</span></button>
                  <div className="mt-2 rounded border border-border p-3 text-xs leading-5 text-muted"><span className="font-bold text-fg">CÓMO SE JUEGA</span><br />Arrastrá a los personajes hasta su escritorio cuando se distraigan. Completá los objetivos del capítulo, administrá el estrés y usá las órdenes del director con criterio.</div>
                </div>
              </div>
            </div>
          )}

          {screen === "stories" && (
            <div>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div><p className="text-xs font-bold tracking-[0.2em] text-primary">SELECCIÓN DE CAMPAÑA</p><h2 className="font-display text-3xl text-fg">Elegí qué película vas a rodar</h2><p className="mt-1 text-sm text-muted">Cada historia tiene tres capítulos y objetivos diferentes.</p></div>
                <button type="button" onClick={() => setScreen("menu")} className="rounded border border-border px-3 py-2 text-xs text-muted hover:text-fg">VOLVER</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {availableStories.map((story) => (
                  <button key={story.id} type="button" onClick={() => setSelectedStoryId(story.id)} className={`rounded-lg border p-4 text-left transition-colors ${selectedStoryId === story.id ? "border-primary bg-primary/10" : "border-border bg-bg hover:border-primary/60"}`}>
                    <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[10px] font-bold tracking-[0.18em] text-primary">{story.genre.toUpperCase()}</span>{story.custom && <span className="rounded bg-primary/15 px-2 py-1 text-[9px] font-bold text-primary">TU HISTORIA</span>}</div>
                    <h3 className="font-display text-2xl text-fg">{story.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-muted">{story.premise}</p>
                    <p className="mt-3 text-[10px] font-bold tracking-widest text-muted">3 CAPÍTULOS · {story.chapters[0]?.timeLimit ?? 90}s EN EL PRIMERO</p>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => startStory()} className="min-h-12 rounded border border-primary bg-primary px-6 text-sm font-bold text-bg">COMENZAR: {selectedStory.title.toUpperCase()}</button>
                <button type="button" onClick={() => { setStoryError(""); setScreen("create"); }} className="min-h-12 rounded border border-border px-5 text-sm font-semibold text-fg hover:border-primary">+ CREAR OTRA HISTORIA</button>
              </div>
            </div>
          )}

          {screen === "create" && (
            <div className="mx-auto max-w-2xl">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div><p className="text-xs font-bold tracking-[0.2em] text-primary">TALLER DE GUION</p><h2 className="font-display text-3xl text-fg">Creá tu historia</h2><p className="mt-1 text-sm text-muted">Definí la película. Pixel Set arma una campaña de tres capítulos a partir de tu idea.</p></div>
                <button type="button" onClick={() => setScreen("menu")} className="rounded border border-border px-3 py-2 text-xs text-muted hover:text-fg">VOLVER</button>
              </div>
              <div className="grid gap-4 rounded-lg border border-border bg-bg p-4 sm:p-6">
                <label className="grid gap-2 text-xs font-bold tracking-wider text-fg">TÍTULO DE LA PELÍCULA
                  <input value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} maxLength={48} placeholder="Ej. La ciudad de los silencios" className="min-h-11 rounded border border-border bg-surface px-3 text-sm font-normal tracking-normal text-fg outline-none focus:border-primary" />
                </label>
                <label className="grid gap-2 text-xs font-bold tracking-wider text-fg">¿DE QUÉ TRATA?
                  <textarea value={customPremise} onChange={(event) => setCustomPremise(event.target.value)} maxLength={220} rows={4} placeholder="Un equipo encuentra una grabación que cambia el sentido de la película..." className="resize-y rounded border border-border bg-surface px-3 py-3 text-sm font-normal tracking-normal text-fg outline-none focus:border-primary" />
                  <span className="text-right text-[10px] font-normal text-muted">{customPremise.length}/220</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-xs font-bold tracking-wider text-fg">GÉNERO
                    <select value={customGenre} onChange={(event) => setCustomGenre(event.target.value as StoryGenre)} className="min-h-11 rounded border border-border bg-surface px-3 text-sm font-normal tracking-normal text-fg">
                      <option value="Drama">Drama</option><option value="Comedia">Comedia</option><option value="Suspenso">Suspenso</option><option value="Documental">Documental</option>
                    </select>
                  </label>
                  <label className="grid gap-2 text-xs font-bold tracking-wider text-fg">ESTILO DE DESAFÍO
                    <select value={challengeStyle} onChange={(event) => setChallengeStyle(event.target.value as ChallengeStyle)} className="min-h-11 rounded border border-border bg-surface px-3 text-sm font-normal tracking-normal text-fg">
                      <option value="balanced">Equilibrado</option><option value="deadline">A contrarreloj</option><option value="team">Cuidar al equipo</option>
                    </select>
                  </label>
                </div>
                <div className="rounded border border-primary/20 p-3 text-xs leading-5 text-muted">Tu historia tendrá tres capítulos. El estilo elegido cambia los tiempos, la calidad exigida, las recuperaciones manuales y el límite de estrés. Se guarda en este navegador.</div>
                {storyError && <p role="alert" className="text-sm text-danger">{storyError}</p>}
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={saveCustomStory} className="min-h-12 rounded border border-primary bg-primary px-6 text-sm font-bold text-bg">GUARDAR HISTORIA</button>
                  <button type="button" onClick={() => setScreen("stories")} className="min-h-12 rounded border border-border px-5 text-sm font-semibold text-fg">CANCELAR</button>
                </div>
              </div>
            </div>
          )}
        </section></div>
      )}
      <div className="absolute inset-0 bottom-[var(--bar-h)]">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair"
          style={{ touchAction: "none" }}
          aria-label="Mapa del set"
        />
        {(hud.campaignComplete || hud.gameOver) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-lg border border-primary/50 bg-surface p-5 text-center shadow-2xl">
              <p className="text-[10px] font-bold tracking-[0.24em] text-primary">{hud.campaignComplete ? "PELÍCULA TERMINADA" : hud.gameOver ? "FIN DE LA JORNADA" : "CAPÍTULO FALLIDO"}</p>
              <h2 className="mt-2 font-display text-3xl text-fg">{hud.campaignComplete ? "¡Lo lograron!" : hud.gameOver ? "Se acabaron los intentos" : "La toma no llegó"}</h2>
              <p className="mt-3 text-sm leading-5 text-muted">{hud.campaignComplete ? `Terminaste "${hud.storyTitle}". El equipo consiguió cerrar la historia.` : hud.gameOver ? "El equipo agotó sus tres intentos. Podés probar otra campaña o diseñar una nueva." : `No se cumplió el objetivo de "${hud.chapterTitle}". Todavía quedan ${hud.lives} intentos.`}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                
                <button type="button" onClick={() => setScreen("stories")} className="min-h-11 rounded border border-border px-4 text-xs font-bold text-fg">ELEGIR OTRA HISTORIA</button>
                <button type="button" onClick={openMenu} className="min-h-11 rounded border border-border px-4 text-xs font-bold text-fg">MENÚ PRINCIPAL</button>
              </div>
            </div>
          </div>
        )}
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
          {hud.storyTitle && <p className="text-[11px] text-[#9fbf5a]">{hud.storyTitle} · Cap. {hud.chapterIndex}/{hud.chapterCount}: {hud.chapterTitle} · ♥ {hud.lives}</p>}
        </div>
        <div className="pointer-events-auto flex items-center gap-2"><button type="button" onClick={openMenu} className="rounded border border-[#4a6b28] bg-[#0a0e06]/90 px-2 py-1 text-[10px] font-bold text-[#9fbf5a]">MENÚ</button><div className="rounded border border-[#4a6b28] bg-[#0a0e06]/90 px-2 py-1 text-[10px] text-[#9fbf5a]">
          ZOOM {(camRef.current.zoom * 100) | 0}%
        </div></div>
      </header>

      <CrewRoster people={hud.people} selectedId={selectedId} portraits={PORTRAITS} onSelect={selectCrew} onOptions={() => routePush(["play", "opts"])} />

      <CommandBar
        hud={hud}
        log={log}
        selectedId={selectedId}
        onCrewCommand={onCrewCommand}
        onGeneral={onGeneral}
        onZoom={zoom}
        minimapRef={minimapRef}
      />

      {hud.crisis && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 p-3 pb-[120px] sm:items-center sm:pb-3"><div className="w-full max-w-xl">
        <div className="rounded-md border-2 border-danger bg-surface p-4 shadow-lg">
          <p className="text-xs font-bold tracking-widest text-danger">CRISIS EN SET</p>
          <h2 className="mt-1 font-display text-xl text-fg">{hud.crisis.title}</h2>
          <p className="mt-2 text-sm text-muted">{hud.crisis.text}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => run((s) => { if (typeof s.resolveCrisis === "function") s.resolveCrisis("A"); })}
              className="min-h-12 rounded-md border border-primary bg-primary/15 px-3 py-2 text-left text-sm font-semibold text-fg hover:bg-primary/25">
              {hud.crisis.optionA.label}
            </button>
            <button type="button" onClick={() => run((s) => { if (typeof s.resolveCrisis === "function") s.resolveCrisis("B"); })}
              className="min-h-12 rounded-md border border-border bg-bg px-3 py-2 text-left text-sm font-semibold text-fg hover:border-primary">
              {hud.crisis.optionB.label}
            </button>
          </div>
        </div>
      </div></div>
      )}

      {hud.takeResult && !hud.crisis && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/60 p-3 pb-[120px] sm:items-center sm:pb-3"><div className="w-full max-w-xl">
        <div className="rounded-md border-2 border-primary bg-surface p-4">
          <p className="text-xs font-bold tracking-widest text-primary">PLAYBACK DE LA TOMA</p>
          <p className="mt-2 font-display text-3xl text-fg">
            {"★".repeat(hud.takeResult.stars)}{"☆".repeat(3 - hud.takeResult.stars)}
          </p>
          <p className="mt-1 text-sm text-muted">
            Calidad {hud.takeResult.quality} · {hud.takeResult.playback === "great" ? "Plano limpio, emoción clara." : hud.takeResult.playback === "ok" ? "Usable, con algún ruido." : "Fuera de foco / cortado."}
          </p>
          <p className="mt-2 text-sm font-semibold text-fg">{hud.takeResult.summary}</p>
          <p className="mt-1 text-xs text-muted">
            Progreso del día: {hud.takeResult.dayGoodTakes}/{hud.takeResult.dayTarget} tomas buenas
            {hud.takeResult.dayComplete ? " — ¡Día completo!" : ""}
          </p>
          <button type="button" onClick={() => run((s) => { if (typeof s.dismissTakeResult === "function") s.dismissTakeResult(); })}
            className="mt-4 min-h-11 rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-bg">
            Continuar
          </button>
        </div>
      </div></div>
      )}

      {playing && gamePath.length > 0 && (
        <GameMenus
          path={gamePath}
          snap={snap}
          director={directorRef.current}
          nav={{ back: routeBack, forward: routeForward, push: routePush }}
          onClose={() => routePush(["play"])}
          onMainMenu={() => routePush(["menu"])}
          onStoryDecision={(choice) => run((sim) => sim.storyDecision(choice.consequence, choice.effects.quality ?? 0, choice.effects.tension ?? 0, choice.effects.morale ?? 0))}
        />
      )}
    </main>
  );
}
