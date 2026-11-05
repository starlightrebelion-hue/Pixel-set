import type { CrewId } from "@/game/crew";
import type { Hud, LogLine, Sim } from "@/game/sim";

type CrisisOption = { label: string; quality: number; stress: number; log: string };
type Crisis = {
  id: string;
  title: string;
  text: string;
  optionA: CrisisOption;
  optionB: CrisisOption;
};
type TakeResult = {
  stars: number;
  quality: number;
  good: boolean;
  summary: string;
  playback: "great" | "ok" | "bad";
  dayGoodTakes: number;
  dayTarget: number;
  dayComplete: boolean;
};

const DAY_TARGET = 3;
const GENRES = ["Drama", "Thriller", "Comedia"] as const;

const CRISES: Crisis[] = [
  {
    id: "light",
    title: "Se fundió una luz",
    text: "Vera grita: se fue la key. ¿Repetimos con tiempo perdido o rodamos con otro clima?",
    optionA: { label: "Repetir con luz buena", quality: 12, stress: 8, log: "Esperamos la key. El clima vuelve, pero el reloj corre." },
    optionB: { label: "Rodar con clima distinto", quality: -4, stress: -6, log: "Rodamos a oscuras. Queda más crudo… y más raro." },
  },
  {
    id: "actor",
    title: "Nina se trabó",
    text: "Nina pierde el hilo emocional. ¿Cortamos y hablamos o forzamos la toma?",
    optionA: { label: "Cortar y hablar", quality: 10, stress: -4, log: "Rey baja al set. Nina respira y vuelve con intención." },
    optionB: { label: "Forzar la toma", quality: -8, stress: 10, log: "Seguimos igual. La toma se siente falsa y el set se tensa." },
  },
  {
    id: "sound",
    title: "Ruido de tráfico",
    text: "Teo marca ruido de afuera. ¿Repetimos en silencio o usamos el ruido como textura?",
    optionA: { label: "Silencio total", quality: 8, stress: 5, log: "Cerramos el set. Toma limpia, equipo impaciente." },
    optionB: { label: "Usarlo como textura", quality: 2, stress: -3, log: "El ruido queda en la cinta. Lila podrá jugarlo en montaje." },
  },
  {
    id: "continuity",
    title: "Falla de continuidad",
    text: "Lila avisa: el vaso cambió de mano entre tomas. ¿Rehacemos o lo salvamos en montaje?",
    optionA: { label: "Rehacer el plano", quality: 11, stress: 6, log: "Volvemos atrás. Continuidad impecable." },
    optionB: { label: "Salvar en montaje", quality: -5, stress: -2, log: "Lila se encomienda a un corte mágico. Riesgo alto." },
  },
];

type Enhanced = Sim & {
  resolveCrisis: (pick: "A" | "B") => void;
  dismissTakeResult: () => void;
  __enhanced?: boolean;
};

function starsFromQuality(q: number) {
  if (q >= 85) return 3;
  if (q >= 65) return 2;
  if (q >= 40) return 1;
  return 0;
}

function pickCrisis(): Crisis {
  return CRISES[Math.floor(Math.random() * CRISES.length)]!;
}

/** Adds session goals, stars, crises and bonds on top of the base sim. */
export function enhanceSim(base: Sim, onLog: (line: LogLine) => void): Enhanced {
  if ((base as Enhanced).__enhanced) return base as Enhanced;

  let dayGoodTakes = 0;
  let totalStars = 0;
  let lastStars = 0;
  let genre: (typeof GENRES)[number] = "Drama";
  let unlockedGenres: Array<(typeof GENRES)[number]> = ["Drama"];
  let crisis: Crisis | null = null;
  let crisisCooldown = 18;
  let takeResult: TakeResult | null = null;
  let lastPhase = "";
  const bonds: Record<string, number> = {
    "camara|luz": 55,
    "actores|maquillaje": 60,
    "guion|montaje": 50,
  };

  const origHud = base.hud.bind(base);
  const origAccion = base.accion.bind(base);
  const origStep = base.step.bind(base);

  function buildTakeResult(quality: number): TakeResult {
    const stars = starsFromQuality(quality);
    lastStars = stars;
    totalStars += stars;
    if (stars >= 2) dayGoodTakes += 1;
    if (dayGoodTakes >= 2 && !unlockedGenres.includes("Thriller")) {
      unlockedGenres = [...unlockedGenres, "Thriller"];
      onLog({ id: Date.now(), who: "Marcos", text: "Desbloqueamos tono Thriller.", kind: "ok" });
    }
    if (totalStars >= 8 && !unlockedGenres.includes("Comedia")) {
      unlockedGenres = [...unlockedGenres, "Comedia"];
      onLog({ id: Date.now(), who: "Sol", text: "Hay material para una comedia.", kind: "ok" });
    }
    return {
      stars,
      quality: Math.round(quality),
      good: stars >= 2,
      summary:
        stars >= 3
          ? "Toma excelente. El plano respira y el eje se entiende."
          : stars === 2
            ? "Toma usable. Hay emoción, aunque sobra un poco de ruido."
            : stars === 1
              ? "Toma floja. Se puede salvar en montaje… apenas."
              : "Toma descartable. Mejor no imprimir esta cinta.",
      playback: stars >= 3 ? "great" : stars >= 2 ? "ok" : "bad",
      dayGoodTakes,
      dayTarget: DAY_TARGET,
      dayComplete: dayGoodTakes >= DAY_TARGET,
    };
  }

  function resolveCrisis(pick: "A" | "B") {
    if (!crisis) return;
    const opt = pick === "A" ? crisis.optionA : crisis.optionB;
    onLog({ id: Date.now(), who: "Rey", text: opt.log, kind: opt.quality >= 0 ? "dir" : "angry" });
    if (crisis.id === "actor") bonds["actores|maquillaje"] = Math.max(0, Math.min(100, (bonds["actores|maquillaje"] ?? 50) + (pick === "A" ? 8 : -6)));
    if (crisis.id === "light") bonds["camara|luz"] = Math.max(0, Math.min(100, (bonds["camara|luz"] ?? 50) + (pick === "A" ? 6 : -2)));
    if (crisis.id === "continuity") bonds["guion|montaje"] = Math.max(0, Math.min(100, (bonds["guion|montaje"] ?? 50) + (pick === "A" ? 7 : -5)));
    crisis = null;
    crisisCooldown = 22 + Math.random() * 10;
  }

  function dismissTakeResult() {
    takeResult = null;
    if (dayGoodTakes >= DAY_TARGET) {
      dayGoodTakes = 0;
      const idx = unlockedGenres.indexOf(genre);
      genre = unlockedGenres[(idx + 1) % unlockedGenres.length] ?? "Drama";
      onLog({ id: Date.now(), who: "Marcos", text: `Nuevo día · género: ${genre}.`, kind: "ok" });
    }
  }

  function step(dt: number) {
    if (crisis) return;
    origStep(dt);
    const h = origHud();

    if (h.phase === "rolling") {
      crisisCooldown -= dt;
      if (crisisCooldown <= 0 && Math.random() < 0.28) {
        crisis = pickCrisis();
        crisisCooldown = 28;
        onLog({ id: Date.now(), who: "Rey", text: `${crisis.title} — ¡decidí!`, kind: "dir" });
      }
    }

    if (h.phase === "cut" && lastPhase !== "cut" && !takeResult) {
      takeResult = buildTakeResult(h.quality);
    }
    lastPhase = h.phase;
  }

  function hud(): Hud {
    const h = origHud();
    const sceneBase = (h.scene || "La traición").split(" · ")[0]!;
    return {
      ...h,
      scene: `${sceneBase} · ${genre}`,
      dayGoodTakes,
      dayTarget: DAY_TARGET,
      lastStars,
      totalStars,
      genre,
      unlockedGenres: [...unlockedGenres],
      crisis,
      takeResult,
      onMarkReady: h.phase === "prep",
      bonds: [
        { a: "camara" as CrewId, b: "luz" as CrewId, label: "Eje visual", level: Math.round(bonds["camara|luz"] ?? 55) },
        { a: "actores" as CrewId, b: "maquillaje" as CrewId, label: "Cuidado de Nina", level: Math.round(bonds["actores|maquillaje"] ?? 60) },
        { a: "guion" as CrewId, b: "montaje" as CrewId, label: "Relato", level: Math.round(bonds["guion|montaje"] ?? 50) },
      ],
      objective: crisis
        ? "Elegí cómo resolver la crisis"
        : takeResult
          ? takeResult.dayComplete
            ? `Día listo: ${dayGoodTakes}/${DAY_TARGET} tomas buenas`
            : `Toma: ${"★".repeat(lastStars)}${"☆".repeat(3 - lastStars)}`
          : h.objective,
      mood: crisis ? `Crisis: ${crisis.title}` : takeResult ? "Toma evaluada." : h.mood,
      paused: h.paused || !!crisis,
    };
  }

  function accion() {
    takeResult = null;
    origAccion();
  }

  return {
    ...base,
    step,
    hud,
    accion,
    resolveCrisis,
    dismissTakeResult,
    __enhanced: true,
  } as Enhanced;
}
