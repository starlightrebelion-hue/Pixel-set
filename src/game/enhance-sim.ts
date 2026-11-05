import { DEFAULT_STORY, type StoryDefinition } from "@/game/stories";
import { emptyCounters, missionsFor, viewMissions, type MissionDef } from "@/game/missions";
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

export type Enhanced = Sim & {
  startStory: (story: StoryDefinition) => void;
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

  let story: StoryDefinition = DEFAULT_STORY;
  let chapterIdx = 0, lives = 3, campaignComplete = false, gameOver = false;
  const chapter = () => story.chapters[chapterIdx] ?? story.chapters[story.chapters.length - 1]!;
  const DAY_TARGET_FN = () => 2 + chapterIdx;
  // Misiones del capítulo actual
  let counters = emptyCounters();
  let defs: MissionDef[] = missionsFor(0, story.chapters[0]!);
  let claimed = new Set<string>();
  let rescueBase = 0;
  let toast: { id: number; text: string } | null = null;
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

  function buildTakeResult(quality: number, stressNow = 0): TakeResult {
    const stars = starsFromQuality(quality);
    lastStars = stars;
    totalStars += stars;
    const good = quality >= chapter().qualityTarget;
    if (good) dayGoodTakes += 1;
    counters.stars += stars;
    if (good) { counters.good_takes += 1; if (stressNow <= chapter().stressLimit) counters.clean_takes += 1; }
    if (stars === 0 && !gameOver) {
      lives = Math.max(0, lives - 1);
      if (lives === 0) { gameOver = true; onLog({ id: Date.now(), who: "Marcos", text: "Nos quedamos sin intentos. Fin de la jornada.", kind: "angry" }); }
      else onLog({ id: Date.now(), who: "Marcos", text: `Toma perdida. Quedan ${lives} intentos.`, kind: "angry" });
    }
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
      good,
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
      dayTarget: DAY_TARGET_FN(),
      dayComplete: requiredDone(),
    };
  }

  function resolveCrisis(pick: "A" | "B") {
    if (!crisis) return;
    const opt = pick === "A" ? crisis.optionA : crisis.optionB;
    onLog({ id: Date.now(), who: "Rey", text: opt.log, kind: opt.quality >= 0 ? "dir" : "angry" });
    if (crisis.id === "actor") bonds["actores|maquillaje"] = Math.max(0, Math.min(100, (bonds["actores|maquillaje"] ?? 50) + (pick === "A" ? 8 : -6)));
    if (crisis.id === "light") bonds["camara|luz"] = Math.max(0, Math.min(100, (bonds["camara|luz"] ?? 50) + (pick === "A" ? 6 : -2)));
    if (crisis.id === "continuity") bonds["guion|montaje"] = Math.max(0, Math.min(100, (bonds["guion|montaje"] ?? 50) + (pick === "A" ? 7 : -5)));
    counters.crises += 1;
    crisis = null;
    crisisCooldown = 22 + Math.random() * 10;
  }

  const requiredDone = () => defs.filter((d) => d.required).every((d) => counters[d.kind] >= d.target);

  function setToast(text: string) { toast = { id: Date.now() + Math.random(), text }; }

  /** Revisa misiones: entrega recompensas (con efecto real en el set) y avanza el capítulo. */
  function reviewMissions() {
    counters.bond = Math.max(...Object.values(bonds));
    counters.rescues = Math.max(0, (origHud().rescuesTotal ?? 0) - rescueBase);
    for (const m of viewMissions(defs, counters, claimed)) {
      if (!m.done || m.claimed) continue;
      claimed.add(m.id);
      onLog({ id: Date.now() + Math.random(), who: "Marcos", text: `Misión cumplida: ${m.label}.${m.reward ? ` Recompensa: ${m.reward.label}.` : ""}`, kind: "dir" });
      setToast(`✓ ${m.label}${m.reward ? ` · ${m.reward.label}` : ""}`);
      if (m.reward?.lives) lives = Math.min(5, lives + m.reward.lives);
      if (m.reward?.stars) totalStars += m.reward.stars;
      if (m.reward?.quality) base.storyDecision("Buen ritmo de rodaje: el equipo se anima.", m.reward.quality, 0, 4);
    }
  }

  function advanceChapter() {
    dayGoodTakes = 0;
    if (chapterIdx + 1 >= story.chapters.length) { campaignComplete = true; setToast("🏆 ¡Película terminada!"); onLog({ id: Date.now(), who: "Rey", text: `¡Fin de "${story.title}"! El equipo terminó la película.`, kind: "dir" }); return; }
    chapterIdx += 1;
    counters = emptyCounters(); claimed = new Set(); defs = missionsFor(chapterIdx, chapter());
    rescueBase = origHud().rescuesTotal ?? 0;
    setToast(`🎬 Capítulo ${chapterIdx + 1}: ${chapter().title}`);
    onLog({ id: Date.now(), who: "Rey", text: `Capítulo ${chapterIdx + 1}: ${chapter().title}. ${chapter().briefing}`, kind: "dir" });
    const idx = unlockedGenres.indexOf(genre);
    genre = unlockedGenres[(idx + 1) % unlockedGenres.length] ?? "Drama";
  }

  function dismissTakeResult() {
    takeResult = null;
  }

  function step(dt: number) {
    if (crisis || campaignComplete || gameOver) return;
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
      takeResult = buildTakeResult(h.quality, h.stress);
    }
    lastPhase = h.phase;
    reviewMissions();
    if (!takeResult && requiredDone() && !campaignComplete && !gameOver) advanceChapter();
  }

  function hud(): Hud {
    const h = origHud();
    const sceneBase = (h.scene || "La traición").split(" · ")[0]!;
    return {
      ...h,
      scene: `${sceneBase} · ${genre}`,
      dayGoodTakes,
      dayTarget: DAY_TARGET_FN(),
      lastStars,
      totalStars,
      genre,
      unlockedGenres: [...unlockedGenres],
      storyTitle: story.title, storyPremise: story.premise, chapterTitle: chapter().title, chapterBriefing: chapter().briefing,
      chapterIndex: chapterIdx + 1, chapterCount: story.chapters.length, lives, campaignComplete, gameOver,
      rescuesTotal: h.rescuesTotal,
      missions: viewMissions(defs, counters, claimed),
      missionToast: toast,
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
            ? `Día listo: ${dayGoodTakes}/${DAY_TARGET_FN()} tomas buenas`
            : `Toma: ${"★".repeat(lastStars)}${"☆".repeat(3 - lastStars)}`
          : (() => {
              const next = viewMissions(defs, counters, claimed).find((m) => m.required && !m.done);
              return next ? `${next.label}: ${next.progress}/${next.target}` : h.objective;
            })(),
      mood: crisis ? `Crisis: ${crisis.title}` : takeResult ? "Toma evaluada." : h.mood,
      paused: h.paused || !!crisis,
    };
  }

  function startStory(next: StoryDefinition) {
    story = next.chapters?.length ? next : DEFAULT_STORY;
    chapterIdx = 0; lives = 3; campaignComplete = false; gameOver = false;
    counters = emptyCounters(); claimed = new Set(); defs = missionsFor(0, chapter()); rescueBase = origHud().rescuesTotal ?? 0; toast = null;
    dayGoodTakes = 0; totalStars = 0; lastStars = 0; crisis = null; takeResult = null; crisisCooldown = 18;
    onLog({ id: Date.now(), who: "Rey", text: `Comienza "${story.title}". ${chapter().briefing}`, kind: "dir" });
  }

  function accion() {
    takeResult = null;
    origAccion();
  }

  // OJO: `{...base}` congelaría los getters (map, phase, shake); se copian los descriptores.
  const out = Object.defineProperties({}, Object.getOwnPropertyDescriptors(base)) as Enhanced;
  Object.assign(out, { step, hud, accion, startStory, resolveCrisis, dismissTakeResult, __enhanced: true });
  return out;
}
