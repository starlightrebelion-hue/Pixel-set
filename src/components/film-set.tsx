import { useEffect, useRef, useState } from "react";
import { Clapperboard, Megaphone, Pause, TriangleAlert, Users } from "lucide-react";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { CREW, stateLabel } from "@/game/crew";
import { createSim, type Hud, type LogLine, type Person, type Sim } from "@/game/sim";

const POSES = ["pose-1", "pose-2", "pose-3", "pose-4"] as const;

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

export function FilmSet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim | null>(null);
  const [hud, setHud] = useState<Hud>(INITIAL_HUD);
  const [log, setLog] = useState<LogLine[]>(INITIAL_LOG);
  const [ready, setReady] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

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
        img.src = assetUrl(`/sprites/${crew.id}/${pose}.png`);
      }
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let anim = 0;
    let hudTick = 0;
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

      const ordered = [...sim.people].sort((a, b) => a.y - b.y);
      for (const p of ordered) {
        const x = toX(p.x);
        const y = toY(p.y);
        const moving = p.state === "work" && Math.hypot(p.tx - p.x, p.ty - p.y) > 0.015;
        const bob = p.state === "sleep" ? 0 : Math.sin(anim * (p.state === "angry" ? 22 : 3) + p.homeX * 12) * (p.state === "angry" ? 1.4 : 1.1);
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.22, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        if (p.ring > 0) {
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
        ctx.font = "600 11px 'Source Sans 3', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const label = p.name;
        const lw = ctx.measureText(label).width + 10;
        ctx.fillStyle = "rgba(18,16,14,0.78)";
        ctx.fillRect(x - lw / 2, y + 4, lw, 15);
        ctx.fillStyle = p.state === "angry" ? "#d4533c" : p.state === "sleep" ? "#b3a48f" : "#f4ecdf";
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
        sim.step(1 / 60);
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

    const onPointer = (event: PointerEvent) => {
      unlock();
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const nx = (x - layout.ox) / layout.dw;
      const ny = (y - layout.oy) / layout.dh;
      sim.click(nx, ny);
    };
    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointerdown", unlock);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerdown", unlock);
      simRef.current = null;
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
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-primary">SET DE RODAJE</p>
          <h1 className="font-display text-3xl leading-none text-fg">Pixel Set</h1>
          <p className="mt-1 text-sm text-muted">Trabajan, discuten, se enojan y vuelven a la toma.</p>
        </div>
        <p className="max-w-xs text-sm text-fg">{hud.mood}</p>
      </header>

      <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border bg-bg">
        <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Set de filmación con el equipo trabajando" />
        {!ready && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
            Preparando el set…
          </p>
        )}
      </div>

      <section className="grid gap-3 rounded-md border border-primary/40 bg-surface p-3 sm:grid-cols-[1fr_auto]" aria-label="Objetivo de la partida">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-primary">MISIÓN · TOMA {hud.take}</p>
          <p className="mt-1 text-sm font-semibold text-fg">{hud.objective}</p>
          <p className="mt-1 text-xs text-muted">Coordiná al equipo, resolvé los conflictos y conseguí una toma perfecta.</p>
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
            <span className={`block text-xs ${p.state === "angry" ? "text-danger" : p.state === "sleep" ? "text-muted" : "text-primary"}`}>
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
      <p className="text-xs text-muted">Tocá a alguien para escuchar su tarea. Coordiná para recuperar al equipo; ¡Acción! pone la toma en marcha.</p>
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

