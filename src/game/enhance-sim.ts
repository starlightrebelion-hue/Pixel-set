import { DEFAULT_STORY, type StoryDefinition } from "@/game/stories";
import { emptyCounters, missionsFor, viewMissions, type MissionDef } from "@/game/missions";
import { DEPARTMENTS, computeEffects, deptOf, type BoostKey, type DeptView, type Effects } from "@/game/departments";
import { BANKRUPT_AT, HIRE_FEE, INCOME, SEVERANCE, START_BUDGET, UPGRADE_FEE, initialStaff, payrollOf, staffView, type LedgerEntry } from "@/game/studio";
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
  money?: { income: number; payroll: number; net: number; budget: number };
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
  orderCrew: (crewId: CrewId, orderId: string) => { ok: boolean; message: string };
  hire: (crewId: CrewId, level: 1 | 2) => { ok: boolean; message: string };
  upgrade: (crewId: CrewId) => { ok: boolean; message: string };
  fire: (crewId: CrewId) => { ok: boolean; message: string };
  setConditions: (c: { darkness: number }) => void;
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
  // Estudio: presupuesto, plantilla y libro de cuentas
  let budget = START_BUDGET;
  const staff = initialStaff(DEPARTMENTS.map((d) => d.id));
  let ledger: LedgerEntry[] = [];
  let gameOverReason: "lives" | "bankrupt" | null = null;
  const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString("es-AR")}`;
  function book(label: string, amount: number) {
    budget += amount;
    ledger = [{ id: Date.now() + Math.random(), label, amount }, ...ledger].slice(0, 10);
  }
  // Departamentos: eficiencia por rol, refuerzos temporales y enfriamientos de órdenes
  const eff = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, 1])) as Record<CrewId, number>;
  const boosts: Partial<Record<BoostKey, number>> = {};
  const cooldowns: Record<string, number> = {};
  let darkness = 0, hype = 0, reviewArmed = false;
  let fx: Effects = computeEffects(eff, boosts, 0);
  const BOOST_DEPT: Partial<Record<CrewId, BoostKey>> = { camara: "focus", luz: "lights", sonido: "silence", actores: "rehearse", maquillaje: "look", guion: "rewrite" };
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
    // Posproducción y hype: el montaje mejora la toma; el hype puede sumar una estrella.
    const bonus = fx.editorBonus + (reviewArmed ? 6 : 0);
    if (bonus > 0) { quality = Math.min(100, quality + bonus); onLog({ id: Date.now() + Math.random(), who: "Lila", text: `Edición: +${bonus} de calidad${reviewArmed ? " (cinta revisada)" : ""}.`, kind: "ok" }); }
    reviewArmed = false;
    let stars = starsFromQuality(quality);
    if (hype >= 50 && quality >= 55 && stars < 3) { stars += 1; hype = Math.max(0, hype - 25); onLog({ id: Date.now() + Math.random(), who: "Nora", text: "El hype del estudio suma una estrella a la toma.", kind: "ok" }); }
    lastStars = stars;
    totalStars += stars;
    const good = quality >= chapter().qualityTarget;
    if (good) dayGoodTakes += 1;
    counters.stars += stars;
    if (good) { counters.good_takes += 1; if (stressNow <= chapter().stressLimit) counters.clean_takes += 1; }
    if (stars === 0 && !gameOver) {
      lives = Math.max(0, lives - 1);
      if (lives === 0) { gameOver = true; gameOverReason = "lives"; onLog({ id: Date.now(), who: "Marcos", text: "Nos quedamos sin intentos. Fin de la jornada.", kind: "angry" }); }
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
    // Ingresos y sueldos de la toma
    const income = stars * INCOME.perStar + (good ? INCOME.goodBonus : 0);
    const payroll = payrollOf(staff);
    book(`Toma: ${"★".repeat(stars) || "sin estrellas"}`, income);
    if (payroll > 0) book("Sueldos del equipo", -payroll);
    if (budget <= BANKRUPT_AT && !gameOver) {
      gameOver = true; gameOverReason = "bankrupt";
      onLog({ id: Date.now() + Math.random(), who: "Marcos", text: "El estudio quebró: no hay presupuesto para seguir.", kind: "angry" });
    } else if (budget < 0) onLog({ id: Date.now() + Math.random(), who: "Marcos", text: `Estamos en números rojos (${money(budget)}). No podemos contratar.`, kind: "angry" });
    return {
      money: { income, payroll, net: income - payroll, budget },
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
    book(`Premio del capítulo ${chapterIdx + 1}`, INCOME.chapterPrize);
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

  function targetEff(p: (typeof base.people)[number], remote: boolean) {
    if (!p.employed) return 0;
    if (!p.visible) return remote ? 0.85 : 0;
    if (p.dragging) return 0.2;
    if (p.state === "sleep") return 0;
    if (p.state === "angry") return 0.25;
    if (p.state === "coffee") return 0.15;
    if (p.state === "talk") return 0.4;
    if (p.carrying) return 0.3;
    return Math.hypot(p.x - p.homeX, p.y - p.homeY) < 0.06 ? 1 : 0.55;
  }

  function updateDepartments(dt: number, phase: string) {
    for (const d of DEPARTMENTS) {
      const p = base.people.find((q) => q.id === d.id);
      const t = p ? targetEff(p, !!d.remote) : 0;
      eff[d.id] += (t - eff[d.id]) * Math.min(1, dt * 2.5);
    }
    for (const k of Object.keys(boosts) as BoostKey[]) { boosts[k] = Math.max(0, (boosts[k] ?? 0) - dt); if (!boosts[k]) delete boosts[k]; }
    for (const k of Object.keys(cooldowns)) cooldowns[k] = Math.max(0, cooldowns[k]! - dt);
    fx = computeEffects(eff, boosts, darkness);
    hype = Math.max(0, Math.min(100, hype + (eff.marketing > 0.5 ? 0.25 : 0) * dt - 0.05 * dt));
    if (phase === "rolling") base.adjust(fx.qualityRate * dt, fx.stressRate * dt, -fx.timeDrain * dt);
  }

  function orderCrew(crewId: CrewId, orderId: string): { ok: boolean; message: string } {
    const dept = deptOf(crewId);
    const order = dept?.orders.find((o) => o.id === orderId);
    if (!dept || !order) return { ok: false, message: "Orden desconocida." };
    if (crisis || takeResult || gameOver || campaignComplete) return { ok: false, message: "Ahora no se pueden dar órdenes." };
    const key = `${crewId}:${orderId}`;
    const left = cooldowns[key] ?? 0;
    if (left > 0) return { ok: false, message: `${order.label}: disponible en ${Math.ceil(left)}s.` };
    if (eff[crewId] < 0.3) { base.speak(crewId, "No puedo ahora: no estoy en mi puesto.", "angry"); return { ok: false, message: `${dept.name} no está en su puesto.` }; }
    const lvl = staff[crewId] ?? 1;
    const power = (0.6 + 0.4 * eff.director) * (lvl === 2 ? 1.2 : 1);
    const e = order.effect;
    let q = (e.quality ?? 0) * (e.quality && e.quality > 0 ? power : 1);
    let st = e.stress ?? 0;
    let say = order.say;
    if (orderId === "reflector") q = (2 + 4 * darkness) * power;
    if (e.gamble) {
      if (Math.random() < 0.6) { q = 8 * power; say = "¡Salió algo muy bueno!"; } else { q = -4; st = 6; say = "Uf… no funcionó. Perdimos ritmo."; }
    }
    base.adjust(q, st, e.time ?? 0);
    if (e.hype) hype = Math.min(100, hype + e.hype);
    if (e.boost) boosts[e.boost.key] = e.boost.seconds * (lvl === 2 ? 1.25 : 1);
    if (e.arm === "review") reviewArmed = true;
    cooldowns[key] = order.cooldown * (lvl === 2 ? 0.8 : 1);
    base.speak(crewId, say, q < 0 ? "angry" : "ok");
    setToast(`${order.icon} ${order.label}`);
    return { ok: true, message: say };
  }

  function hire(crewId: CrewId, level: 1 | 2): { ok: boolean; message: string } {
    const name = deptOf(crewId)?.name ?? crewId;
    if ((staff[crewId] ?? 0) !== 0) return { ok: false, message: `${name} ya tiene personal.` };
    const fee = HIRE_FEE[level];
    if (budget < fee) return { ok: false, message: `Falta presupuesto: ${money(fee)} (hay ${money(budget)}).` };
    book(`Contratación ${level === 2 ? "senior" : "junior"} · ${name}`, -fee);
    staff[crewId] = level;
    base.setEmployed(crewId, true);
    setToast(`🤝 ${name}: nuevo ${level === 2 ? "senior" : "junior"}`);
    return { ok: true, message: `${name} contratado.` };
  }
  function upgrade(crewId: CrewId): { ok: boolean; message: string } {
    const name = deptOf(crewId)?.name ?? crewId;
    if (staff[crewId] !== 1) return { ok: false, message: "Sólo se puede mejorar a un junior." };
    if (budget < UPGRADE_FEE) return { ok: false, message: `Falta presupuesto: ${money(UPGRADE_FEE)}.` };
    book(`Ascenso a senior · ${name}`, -UPGRADE_FEE);
    staff[crewId] = 2;
    base.speak(crewId, "¡Gracias por la confianza! Voy a rendir más.", "ok");
    setToast(`⭐ ${name}: ascendido a senior`);
    return { ok: true, message: `${name} ahora es senior.` };
  }
  function fire(crewId: CrewId): { ok: boolean; message: string } {
    const name = deptOf(crewId)?.name ?? crewId;
    const lvl = staff[crewId] ?? 0;
    if (crewId === "director") return { ok: false, message: "No se puede despedir a la dirección." };
    if (lvl === 0) return { ok: false, message: `${name} ya está vacante.` };
    book(`Indemnización · ${name}`, -SEVERANCE[lvl]);
    staff[crewId] = 0;
    base.setEmployed(crewId, false);
    setToast(`👋 ${name}: puesto vacante`);
    return { ok: true, message: `${name} despedido.` };
  }

  function setConditions(c: { darkness: number }) { darkness = Math.max(0, Math.min(1, c.darkness)); }

  function departmentViews(phase: string): DeptView[] {
    return DEPARTMENTS.map((d) => {
      const boostKey = BOOST_DEPT[d.id];
      const e = eff[d.id];
      const boosted = !!boostKey && (boosts[boostKey] ?? 0) > 0;
      const live = phase === "prep" || phase === "rolling";
      return {
        id: d.id, name: d.name, channel: d.channel, efficiency: Math.round(e * 100),
        status: boosted ? "boost" : e < 0.3 ? "out" : e < 0.6 ? "weak" : "ok",
        effect: live ? (fx.effect[d.id] ?? "") : (e < 0.3 && !d.remote ? "Fuera del set" : "En espera"),
        orders: d.orders.map((o) => { const cd = cooldowns[`${d.id}:${o.id}`] ?? 0; return { id: o.id, label: o.label, icon: o.icon, hint: o.hint, cooldownLeft: Math.ceil(cd), ready: cd <= 0 }; }),
      };
    });
  }

  function step(dt: number) {
    if (crisis || campaignComplete || gameOver) return;
    origStep(dt);
    const h = origHud();
    updateDepartments(dt, h.phase);

    if (h.phase === "rolling") {
      crisisCooldown -= dt * fx.crisisMult;
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
      budget: Math.round(budget), payroll: payrollOf(staff), ledger: ledger.slice(0, 6),
      staff: DEPARTMENTS.map((d) => staffView(d.id, staff[d.id] ?? 0)),
      gameOverReason,
      departments: departmentViews(h.phase),
      alerts: h.phase === "prep" || h.phase === "rolling" ? fx.alerts.filter(Boolean) : [],
      hype: Math.round(hype),
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
    for (const k of Object.keys(boosts)) delete boosts[k as BoostKey];
    for (const k of Object.keys(cooldowns)) delete cooldowns[k];
    hype = 0; reviewArmed = false;
    budget = START_BUDGET; ledger = []; gameOverReason = null;
    { const init = initialStaff(DEPARTMENTS.map((d) => d.id)); for (const d of DEPARTMENTS) { staff[d.id] = init[d.id]!; base.setEmployed(d.id, true, true); } }
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
  Object.assign(out, { step, hud, accion, startStory, orderCrew, hire, upgrade, fire, setConditions, resolveCrisis, dismissTakeResult, __enhanced: true });
  return out;
}
