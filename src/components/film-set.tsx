import { useEffect, useRef, useState } from "react";
import { Clapperboard, Megaphone, Pause, TriangleAlert, Users } from "lucide-react";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { CREW, stateLabel, type CrewId } from "@/game/crew";
import { createCustomStory, isStoryDefinition, STORY_LIBRARY, type ChallengeStyle, type StoryDefinition, type StoryGenre } from "@/game/stories";
import { COFFEE_SPOT, createSim, type Hud, type LogLine, type Person, type Sim } from "@/game/sim";

const POSES = ["pose-1", "pose-2", "pose-3", "pose-4"] as const;

// Import sprite PNGs from the source asset folder so every crew role is bundled.
// The old /public/sprites path only contained director, camera and actors.
const SPRITE_ASSETS = import.meta.glob<string>("../../assets/sprites/*/pose-*.png", {
  eager: true,
  query: "?url",
  import: "default",
});

const INITIAL_LOG: LogLine[] = [
  {
    id: -3,
    who: "Rey",
    text: "Bienvenidos al set. Hoy la emoción tiene que aguantar la estructura.",
    kind: "dir",
  },
  {
    id: -2,
    who: "Sol",
    text: "Tengo el conflicto. Falta decidir qué sabe el espectador.",
    kind: "ok",
  },
  {
    id: -1,
    who: "Lila",
    text: "Cuando haya material, reviso ritmo, elipsis y continuidad.",
    kind: "ok",
  },
];

const INITIAL_HUD: Hud = {
  take: 1,
  scene: "La traición",
  stress: 12,
  quality: 8,
  mood: "Rodando. Los departamentos trabajan.",
  paused: false,
  timeLeft: 90,
  objective: "Recuperá 3 integrantes: arrastralos hasta su escritorio",
  stationCount: CREW.length,
  coffeeCount: 0,
  manualRescues: 0,
  rescueGoal: 1,
  storyTitle: "La última toma",
  storyPremise: "Un equipo intenta terminar una película en una jornada complicada.",
  chapterTitle: "Un comienzo complicado",
  chapterBriefing: "Prepará el set y recuperá al menos a una persona antes de rodar.",
  chapterIndex: 1,
  chapterCount: 3,
  qualityTarget: 52,
  stressLimit: 88,
  lives: 3,
  campaignComplete: false,
  gameOver: false,
  chapterFailed: false,
  people: CREW.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    state: "work" as const,
    moving: false,
  })),
};

function assetUrl(path: string) {
  if (typeof window === "undefined") return path;
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}${path}`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > max && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

function poseFor(p: Person, moving: boolean, t: number) {
  if (p.state === "sleep") return "pose-4";
  if (p.state === "angry") return "pose-3";
  const step = Math.floor(t * (moving ? 8 : 2) + p.homeX * 10) % 2;
  if (moving) return step === 0 ? "pose-2" : "pose-1";
  return step === 0 ? "pose-1" : "pose-2";
}

function drawWorkstationBack(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // Chair and monitor sit behind the crew sprite.
  ctx.fillStyle = "#29231f";
  ctx.fillRect(x - size * 0.16, y - size * 0.31, size * 0.32, size * 0.18);
  ctx.fillStyle = "#51402f";
  ctx.fillRect(x - size * 0.29, y - size * 0.43, size * 0.58, size * 0.07);
  ctx.fillStyle = "#161d20";
  ctx.fillRect(x - size * 0.12, y - size * 0.62, size * 0.24, size * 0.18);
  ctx.fillStyle = "#76a8a2";
  ctx.fillRect(x - size * 0.095, y - size * 0.595, size * 0.19, size * 0.125);
  ctx.fillStyle = "#c39a61";
  ctx.fillRect(x - size * 0.025, y - size * 0.42, size * 0.05, size * 0.04);
}

function drawWorkstationFront(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  // The desktop overlaps the character's waist to create a seated-at-work effect.
  ctx.fillStyle = "#533a2b";
  ctx.fillRect(x - size * 0.32, y - size * 0.39, size * 0.64, size * 0.12);
  ctx.fillStyle = "#a27a50";
  ctx.fillRect(x - size * 0.32, y - size * 0.405, size * 0.64, size * 0.035);
  ctx.fillStyle = "#38291f";
  ctx.fillRect(x - size * 0.27, y - size * 0.29, size * 0.045, size * 0.20);
  ctx.fillRect(x + size * 0.225, y - size * 0.29, size * 0.045, size * 0.20);
  ctx.fillStyle = "#d1b27d";
  ctx.fillRect(x + size * 0.18, y - size * 0.455, size * 0.045, size * 0.045);
}

function drawCoffeeCorner(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = "#302720";
  ctx.fillRect(x - size * 0.22, y - size * 0.25, size * 0.44, size * 0.22);
  ctx.fillStyle = "#9a704b";
  ctx.fillRect(x - size * 0.24, y - size * 0.27, size * 0.48, size * 0.045);
  ctx.fillStyle = "#1c2425";
  ctx.fillRect(x - size * 0.105, y - size * 0.43, size * 0.21, size * 0.18);
  ctx.fillStyle = "#bc9a6a";
  ctx.fillRect(x - size * 0.065, y - size * 0.39, size * 0.13, size * 0.045);
  ctx.fillStyle = "#f0d7a2";
  ctx.fillRect(x + size * 0.11, y - size * 0.34, size * 0.07, size * 0.06);
  ctx.fillStyle = "#f4ecdf";
  ctx.font = "700 10px 'Source Sans 3', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("CAFÉ", x, y - size * 0.46);
}

type Screen = "menu" | "stories" | "create" | "playing";

const CUSTOM_STORIES_KEY = "pixel-set-custom-stories-v1";

export function FilmSet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameActiveRef = useRef(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [customStories, setCustomStories] = useState<StoryDefinition[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState(STORY_LIBRARY[0]!.id);
  const [customTitle, setCustomTitle] = useState("");
  const [customPremise, setCustomPremise] = useState("");
  const [customGenre, setCustomGenre] = useState<StoryGenre>("Drama");
  const [challengeStyle, setChallengeStyle] = useState<ChallengeStyle>("balanced");
  const [storyError, setStoryError] = useState("");
  const simRef = useRef<Sim | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [ready, setReady] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

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

    let audio: AudioContext | null = null;
    const unlock = () => {
      if (!audio) audio = new AudioContext();
      if (audio.state === "suspended") void audio.resume();
    };
    const blip = (kind: LogLine["kind"]) => {
      if (!audio || audio.state !== "running") return;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "square";
      osc.frequency.value = kind === "angry" ? 170 : kind === "dir" ? 310 : 460;
      gain.gain.value = 0.028;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      const stopAt = audio.currentTime + 0.07;
      gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      osc.stop(stopAt);
    };

    const sim = createSim((line) => {
      blip(line.kind);
      setLog((prev) => [line, ...prev].slice(0, 40));
    });
    simRef.current = sim;
    const director = sim.people.find((p) => p.id === "director");
    if (director) {
      director.bubble = {
        text: "Bienvenidos al set. Hoy la emoción tiene que aguantar la estructura.",
        life: 4.6,
        kind: "dir",
      };
    }

    const sprites = new Map<string, HTMLImageElement>();
    const stage = new Image();
    let stageOk = false;
    let loaded = 0;
    const needed = CREW.length * POSES.length;
    const mark = () => {
      loaded += 1;
      if (loaded >= needed && stageOk) setReady(true);
    };
    stage.onload = () => {
      stageOk = true;
      if (loaded >= needed) setReady(true);
    };
    stage.src = assetUrl("/set/stage.jpg");
    for (const crew of CREW) {
      for (const pose of POSES) {
        const img = new Image();
        img.onload = () => {
          sprites.set(`${crew.id}:${pose}`, img);
          mark();
        };
        img.onerror = () => mark();
        const spritePath = `../../assets/sprites/${crew.id}/${pose}.png`;
        const spriteSrc = SPRITE_ASSETS[spritePath];
        if (!spriteSrc) {
          console.warn(`[Pixel Set] Falta el sprite: ${spritePath}`);
          mark();
          continue;
        }
        img.src = spriteSrc;
      }
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let anim = 0;
    let hudTick = 0;
    let draggedId: CrewId | null = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragMoved = false;
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

      const shake = sim.shake;
      const sx = shake ? (Math.random() - 0.5) * shake * 10 : 0;
      const sy = shake ? (Math.random() - 0.5) * shake * 6 : 0;
      ctx.save();
      ctx.translate(sx, sy);

      if (stageOk && stage.naturalWidth) {
        const scale = Math.min(cw / stage.naturalWidth, ch / stage.naturalHeight);
        layout.dw = stage.naturalWidth * scale;
        layout.dh = stage.naturalHeight * scale;
        layout.ox = (cw - layout.dw) / 2;
        layout.oy = (ch - layout.dh) / 2;
        ctx.drawImage(stage, layout.ox, layout.oy, layout.dw, layout.dh);
      } else {
        layout.ox = 0;
        layout.oy = 0;
        layout.dw = cw;
        layout.dh = ch;
      }

      const toX = (nx: number) => layout.ox + nx * layout.dw;
      const toY = (ny: number) => layout.oy + ny * layout.dh;
      const size = layout.dh * 0.23;

      for (const person of sim.people) {
        drawWorkstationBack(ctx, toX(person.homeX), toY(person.homeY), size);
      }
      drawCoffeeCorner(ctx, toX(COFFEE_SPOT[0]), toY(COFFEE_SPOT[1]), size);

      if (sim.people.some((person) => person.dragging)) {
        for (const person of sim.people) {
          const tx = toX(person.homeX);
          const ty = toY(person.homeY);
          ctx.save();
          ctx.strokeStyle = person.dragging ? "#e2b340" : "#76c79a";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.ellipse(tx, ty - size * 0.06, size * 0.38, size * 0.15, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#f4ecdf";
          ctx.font = "700 9px 'Source Sans 3', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText("PUESTO", tx, ty - size * 0.22);
          ctx.restore();
        }
      }

      const ordered = [...sim.people].sort((a, b) => a.y - b.y);
      for (const p of ordered) {
        const x = toX(p.x);
        const y = toY(p.y);
        const moving = (p.state === "work" || p.state === "coffee") && Math.hypot(p.tx - p.x, p.ty - p.y) > 0.015;
        const bob = p.state === "sleep" ? 0 : Math.sin(anim * (p.state === "angry" ? 22 : 3) + p.homeX * 12) * (p.state === "angry" ? 1.4 : 1.1);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        if (p.ring > 0 || p.dragging) {
          ctx.strokeStyle = "#e2b340";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(x, y, size * 0.28, size * 0.1, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        const frame = sprites.get(`${p.id}:${poseFor(p, moving, anim)}`);
        if (frame) {
          ctx.save();
          ctx.translate(x, y + bob);
          ctx.scale(p.facing, 1);
          ctx.drawImage(frame, -size / 2, -size, size, size);
          ctx.restore();
        } else {
          // Visible fallback: a missing image must never make a crew member disappear.
          ctx.fillStyle = "#d8c5a4";
          ctx.beginPath();
          ctx.arc(x, y - size * 0.82 + bob, size * 0.12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x - size * 0.12, y - size * 0.68 + bob, size * 0.24, size * 0.48);
          ctx.fillStyle = "#4b4034";
          ctx.fillRect(x - size * 0.15, y - size * 0.22 + bob, size * 0.11, size * 0.2);
          ctx.fillRect(x + size * 0.04, y - size * 0.22 + bob, size * 0.11, size * 0.2);
        }
        if (p.state === "coffee" && !moving) {
          ctx.fillStyle = "#f0d7a2";
          ctx.fillRect(x + size * 0.18, y - size * 0.55, size * 0.07, size * 0.065);
          ctx.fillStyle = "#f0d7a2";
          ctx.fillRect(x + size * 0.245, y - size * 0.535, size * 0.025, size * 0.035);
        }
        if (p.state === "angry") {
          ctx.strokeStyle = "#d4533c";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 16, y - size + 6);
          ctx.lineTo(x - 8, y - size + 12);
          ctx.moveTo(x + 16, y - size + 6);
          ctx.lineTo(x + 8, y - size + 12);
          ctx.stroke();
        }
      }

      for (const person of ordered) {
        drawWorkstationFront(ctx, toX(person.homeX), toY(person.homeY), size);
      }
      for (const p of ordered) {
        const x = toX(p.x);
        const y = toY(p.y);
        ctx.font = "600 11px 'Source Sans 3', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const label = p.name;
        const lw = ctx.measureText(label).width + 10;
        ctx.fillStyle = "rgba(18,16,14,0.78)";
        ctx.fillRect(x - lw / 2, y + 4, lw, 15);
        ctx.fillStyle = p.state === "angry" ? "#d4533c" : p.state === "sleep" ? "#b3a48f" : p.state === "coffee" ? "#e2b340" : "#f4ecdf";
        ctx.fillText(label, x, y + 6);
      }

      for (const particle of sim.particles) {
        const x = toX(particle.x);
        const y = toY(particle.y);
        const alpha = Math.max(0, particle.life / particle.max);
        ctx.globalAlpha = alpha;
        if (particle.kind === "z") {
          ctx.fillStyle = "#f4ecdf";
          ctx.font = "700 13px 'Source Sans 3', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(particle.char, x, y);
        } else if (particle.kind === "steam") {
          ctx.fillStyle = "#d4533c";
          ctx.fillRect(x, y, 3, 3);
        } else {
          ctx.fillStyle = "#e2b340";
          ctx.fillRect(x, y, 4, 3);
        }
        ctx.globalAlpha = 1;
      }

      ctx.font = "600 12px 'Source Sans 3', sans-serif";
      for (const p of sim.people) {
        if (!p.bubble) continue;
        const lines = wrap(ctx, p.bubble.text, 168);
        const bw = Math.min(190, Math.max(...lines.map((line) => ctx.measureText(line).width)) + 16);
        const bh = lines.length * 15 + 10;
        let bx = toX(p.x) - bw / 2;
        let by = toY(p.y) - size - bh - 6;
        bx = Math.max(layout.ox + 4, Math.min(bx, layout.ox + layout.dw - bw - 4));
        if (by < layout.oy + 4) by = toY(p.y) + 22;
        ctx.fillStyle = p.bubble.kind === "angry" ? "#3a1814" : p.bubble.kind === "dir" ? "#2c2414" : "#1c1814";
        ctx.strokeStyle = p.bubble.kind === "angry" ? "#d4533c" : p.bubble.kind === "dir" ? "#e2b340" : "#6a5c48";
        ctx.lineWidth = 2;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = p.bubble.kind === "angry" ? "#ffd0c6" : "#f4ecdf";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        lines.forEach((line, i) => ctx.fillText(line, bx + 8, by + 6 + i * 15));
      }

      ctx.restore();
    };

    const frame = (now: number) => {
      let dt = (now - last) / 1000;
      last = now;
      if (dt > 0.1) dt = 0.1;
      acc += dt;
      anim += dt;
      while (acc >= 1 / 60) {
        if (gameActiveRef.current) sim.step(1 / 60);
        acc -= 1 / 60;
      }
      draw();
      hudTick += dt;
      if (hudTick > 0.25) {
        hudTick = 0;
        setHud(sim.hud());
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const pointerPosition = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        nx: (event.clientX - rect.left - layout.ox) / layout.dw,
        ny: (event.clientY - rect.top - layout.oy) / layout.dh,
      };
    };
    const onPointerDown = (event: PointerEvent) => {
      unlock();
      const { nx, ny } = pointerPosition(event);
      draggedId = sim.grab(nx, ny);
      if (draggedId) {
        dragStartX = nx;
        dragStartY = ny;
        dragMoved = false;
        canvas.setPointerCapture(event.pointerId);
      } else {
        sim.click(nx, ny);
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!draggedId) return;
      const { nx, ny } = pointerPosition(event);
      if (!dragMoved && Math.hypot(nx - dragStartX, ny - dragStartY) > 0.008) {
        dragMoved = true;
      }
      if (dragMoved) sim.drag(draggedId, nx, ny);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!draggedId) return;
      const { nx, ny } = pointerPosition(event);
      if (dragMoved) sim.drop(draggedId, nx, ny);
      else {
        sim.cancelDrag(draggedId);
        sim.click(nx, ny);
      }
      draggedId = null;
      dragMoved = false;
      setHud(sim.hud());
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
      simRef.current = null;
    };
  }, []);

  const availableStories = [...STORY_LIBRARY, ...customStories];
  const selectedStory = availableStories.find((story) => story.id === selectedStoryId) ?? STORY_LIBRARY[0]!;
  const run = (fn: (sim: Sim) => void) => {
    const sim = simRef.current;
    if (!sim) return;
    fn(sim);
    setHud(sim.hud());
  };

  const startStory = (story: StoryDefinition = selectedStory) => {
    const sim = simRef.current;
    if (!sim) return;
    gameActiveRef.current = true;
    setLog([]);
    sim.startNewGame(story);
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
    gameActiveRef.current = false;
    setScreen("menu");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3 px-3 py-3">
      {screen !== "playing" && (
        <section className="min-h-[calc(100vh-1.5rem)] rounded-lg border border-border bg-surface p-4 sm:p-7">
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
        </section>
      )}

      <div className={screen === "playing" ? "mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-3" : "hidden"}>
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-primary">SET DE RODAJE</p>
          <h1 className="font-display text-3xl leading-none text-fg">Pixel Set</h1>
          <p className="mt-1 text-sm text-muted">{hud.storyTitle} · {hud.chapterTitle}</p>
        </div>
        <div className="flex items-center gap-3"><p className="max-w-xs text-sm text-fg">{hud.mood}</p><button type="button" onClick={openMenu} className="rounded border border-border px-3 py-2 text-[10px] font-bold tracking-widest text-muted hover:border-primary hover:text-fg">MENÚ</button></div>
      </header>

      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-bg">
        <canvas ref={canvasRef} className="h-full w-full touch-none cursor-grab active:cursor-grabbing" aria-label="Set de filmación: arrastrá a cada integrante hasta su escritorio" />
        {!ready && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
            Preparando el set…
          </p>
        )}
        {(hud.campaignComplete || hud.chapterFailed) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-lg border border-primary/50 bg-surface p-5 text-center shadow-2xl">
              <p className="text-[10px] font-bold tracking-[0.24em] text-primary">{hud.campaignComplete ? "PELÍCULA TERMINADA" : hud.gameOver ? "FIN DE LA JORNADA" : "CAPÍTULO FALLIDO"}</p>
              <h2 className="mt-2 font-display text-3xl text-fg">{hud.campaignComplete ? "¡Lo lograron!" : hud.gameOver ? "Se acabaron los intentos" : "La toma no llegó"}</h2>
              <p className="mt-3 text-sm leading-5 text-muted">{hud.campaignComplete ? `Terminaste "${hud.storyTitle}". El equipo consiguió cerrar la historia.` : hud.gameOver ? "El equipo agotó sus tres intentos. Podés probar otra campaña o diseñar una nueva." : `No se cumplió el objetivo de "${hud.chapterTitle}". Todavía quedan ${hud.lives} intentos.`}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {hud.chapterFailed && !hud.gameOver && <button type="button" onClick={() => { gameActiveRef.current = true; run((sim) => sim.retryChapter()); }} className="min-h-11 rounded border border-primary bg-primary px-4 text-xs font-bold text-bg">REINTENTAR CAPÍTULO</button>}
                <button type="button" onClick={() => { gameActiveRef.current = false; setScreen("stories"); }} className="min-h-11 rounded border border-border px-4 text-xs font-bold text-fg">ELEGIR OTRA HISTORIA</button>
                <button type="button" onClick={openMenu} className="min-h-11 rounded border border-border px-4 text-xs font-bold text-fg">MENÚ PRINCIPAL</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="grid gap-3 rounded-md border border-primary/40 bg-surface p-3 sm:grid-cols-[1fr_auto]" aria-label="Objetivo de la partida">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-primary">MISIÓN · CAPÍTULO {hud.chapterIndex}/{hud.chapterCount} · TOMA {hud.take}</p>
          <p className="mt-1 font-display text-xl text-fg">{hud.chapterTitle}</p>
          <p className="mt-1 text-xs leading-5 text-muted">{hud.chapterBriefing}</p>
          <p className="mt-1 text-[11px] leading-5 text-muted/80">{hud.storyPremise}</p>
          <p className="mt-1 text-xs font-semibold text-fg">{hud.objective}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold tracking-wider">
            <span className="rounded bg-bg px-2 py-1 text-primary">CALIDAD {hud.quality}/{hud.qualityTarget}</span>
            <span className="rounded bg-bg px-2 py-1 text-amber-400">RESCATES {hud.manualRescues}/{hud.rescueGoal}</span>
            <span className="rounded bg-bg px-2 py-1 text-fg">ESTRÉS {hud.stress}/{hud.stressLimit}</span>
            <span className="rounded bg-bg px-2 py-1 text-fg">PUESTOS {hud.stationCount}/{CREW.length}</span>
            <span className="rounded bg-bg px-2 py-1 text-fg">PAUSAS {hud.coffeeCount}</span>
            <span className="rounded bg-bg px-2 py-1 text-fg">VIDAS {hud.lives}/3</span>
          </div>
        </div>
        <div className="min-w-24 self-center rounded-md bg-bg px-4 py-2 text-center">
          <p className="text-[10px] font-bold tracking-widest text-muted">TIEMPO</p>
          <p className={`font-display text-2xl tabular-nums ${hud.timeLeft <= 20 ? "text-danger" : "text-primary"}`}>{Math.floor(hud.timeLeft / 60)}:{String(hud.timeLeft % 60).padStart(2, "0")}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Estado de la toma">
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <p className="text-xs text-muted">Toma {hud.take}</p>
          <p className="font-display text-lg text-fg">{hud.scene}</p>
        </div>
        <Meter label="Escena" value={hud.quality} tone="primary" />
        <Meter label="Estrés" value={hud.stress} tone="danger" />
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Departamentos">
        {hud.people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => run((sim) => sim.focus(p.id))}
            className="min-h-11 shrink-0 rounded-md border border-border bg-surface px-3 py-1.5 text-left"
          >
            <span className="block text-sm font-semibold text-fg">{p.name}</span>
            <span className={`block text-xs ${p.state === "angry" ? "text-danger" : p.state === "sleep" ? "text-muted" : p.state === "coffee" ? "text-amber-400" : "text-primary"}`}>
              {p.role} · {stateLabel(p.state, p.moving)}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => run((sim) => sim.accion())}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-primary bg-primary px-3 text-sm font-semibold text-bg"
        >
          <Clapperboard className="size-4" aria-hidden="true" />
          ¡Acción!
        </button>
        <button type="button" onClick={() => run((sim) => sim.scold())} className={btn}>
          <Megaphone className="size-4" aria-hidden="true" />
          Rey reta
        </button>
        <button type="button" onClick={() => run((sim) => sim.chaos())} className={btn}>
          <TriangleAlert className="size-4" aria-hidden="true" />
          Problema
        </button>
        <button type="button" onClick={() => run((sim) => sim.coordinate())} className={btn}>
          <Users className="size-4" aria-hidden="true" />
          Coordinar
        </button>
        <button type="button" onClick={() => run((sim) => sim.corten())} className={btn}>
          <Pause className="size-4" aria-hidden="true" />
          ¡Corten!
        </button>
      </div>

      <div
        ref={logRef}
        className="h-36 overflow-y-auto rounded-md border border-border bg-surface p-3 text-sm leading-relaxed"
        aria-live="polite"
      >
        {log.map((line) => (
          <p key={line.id} className="mb-1">
            <span className={line.kind === "angry" ? "font-semibold text-danger" : line.kind === "dir" ? "font-semibold text-primary" : "font-semibold text-fg"}>
              {line.who}:
            </span>{" "}
            <span className="text-fg">{line.text}</span>
          </p>
        ))}
      </div>
      <p className="text-xs text-muted">Arrastrá un personaje con el mouse y soltalo sobre el óvalo marcado como PUESTO. Un clic sin arrastrar muestra su tarea. ¡Acción! devuelve al equipo a sus estaciones.</p>
      </div>
    </main>
  );
}

const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-fg hover:border-primary hover:text-primary";

function Meter({ label, value, tone }: { label: string; value: number; tone: "primary" | "danger" }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="text-fg">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg">
        <div
          className={tone === "danger" ? "h-full bg-danger" : "h-full bg-primary"}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

