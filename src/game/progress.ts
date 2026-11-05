/** Progresión del estudio entre películas: nivel, ventajas, desbloqueos, reputación y filmografía. */
export type FilmRecord = { title: string; genre: string; stars: number; earned: number; result: "completa" | "fracaso" | "quiebra"; rep: number; at: number };
export type Progress = { version: 1; xp: number; reputation: number; films: FilmRecord[] };

export const STORAGE_KEY = "pixel-set-studio-v1";
export const LEVEL_XP = [0, 150, 350, 650, 1050, 1550, 2200, 3000]; // XP acumulada para cada nivel
export const MAX_LEVEL = LEVEL_XP.length;
export const LEVEL_NAME = [
  "Garaje", "Estudio independiente", "Productora local", "Productora regional",
  "Estudio consolidado", "Estudio de prestigio", "Gran estudio", "Estudio legendario",
] as const;
export const REP_TIERS = [
  { min: 0, name: "Desconocido" }, { min: 20, name: "Emergente" }, { min: 40, name: "Respetado" },
  { min: 60, name: "Prestigioso" }, { min: 80, name: "Leyenda" },
] as const;

/** Nivel mínimo para usar cada género en la dirección de escena. */
export const GENRE_LEVEL: Record<string, number> = {
  Drama: 1, Comedia: 1, Thriller: 2, Romance: 3, Terror: 4, "Ciencia ficción": 5, Noir: 6, Fantasía: 7, Western: 8, Aventura: 8,
};
/** Nivel mínimo para jugar cada historia de la biblioteca. */
export const STORY_LEVEL: Record<string, number> = { "la-ultima-toma": 1, "rodaje-imposible": 2, "el-secreto-del-plano": 3, "documental-a-contrarreloj": 4 };
export const CUSTOM_STORY_LEVEL = 2;

export type Perk = { level: number; text: string };
export const PERKS: Perk[] = [
  { level: 2, text: "+$1.000 de presupuesto inicial · historia «Rodaje imposible» · género Thriller · Crear historias" },
  { level: 3, text: "Un intento extra por película · historia «El secreto del plano» · género Romance" },
  { level: 4, text: "Contratar cuesta 15 % menos · historia «Documental a contrarreloj» · género Terror" },
  { level: 5, text: "+$2.000 de presupuesto inicial · género Ciencia ficción" },
  { level: 6, text: "Las órdenes se enfrían 10 % más rápido · género Noir" },
  { level: 7, text: "Otro intento extra por película · género Fantasía" },
  { level: 8, text: "Sueldos 10 % más baratos · géneros Western y Aventura" },
];

export type Perks = { startBudgetBonus: number; extraLives: number; hireMul: number; cooldownMul: number; payrollMul: number };
export function perksFor(level: number): Perks {
  return {
    startBudgetBonus: (level >= 2 ? 1000 : 0) + (level >= 5 ? 2000 : 0),
    extraLives: (level >= 3 ? 1 : 0) + (level >= 7 ? 1 : 0),
    hireMul: level >= 4 ? 0.85 : 1,
    cooldownMul: level >= 6 ? 0.9 : 1,
    payrollMul: level >= 8 ? 0.9 : 1,
  };
}

export const emptyProgress = (): Progress => ({ version: 1, xp: 0, reputation: 10, films: [] });

export function levelOf(xp: number) {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]!) level = i + 1;
  const base = LEVEL_XP[level - 1]!;
  const next = level >= MAX_LEVEL ? null : LEVEL_XP[level]!;
  return { level, into: xp - base, need: next === null ? 0 : next - base, next };
}
export const tierOf = (rep: number) => [...REP_TIERS].reverse().find((t) => rep >= t.min)!.name;

export type ProgressView = {
  level: number; levelName: string; xp: number; xpInto: number; xpNeed: number; maxed: boolean;
  reputation: number; tier: string; films: FilmRecord[]; unlockedGenres: string[];
  perks: (Perk & { unlocked: boolean })[]; nextPerk: Perk | null; incomeMul: number;
};
export function viewProgress(p: Progress): ProgressView {
  const l = levelOf(p.xp);
  return {
    level: l.level, levelName: LEVEL_NAME[l.level - 1]!, xp: p.xp, xpInto: l.into, xpNeed: l.need, maxed: l.next === null,
    reputation: Math.round(p.reputation), tier: tierOf(p.reputation), films: p.films,
    unlockedGenres: Object.keys(GENRE_LEVEL).filter((g) => GENRE_LEVEL[g]! <= l.level),
    perks: PERKS.map((x) => ({ ...x, unlocked: l.level >= x.level })),
    nextPerk: PERKS.find((x) => x.level > l.level) ?? null,
    incomeMul: 1 + Math.min(25, p.reputation / 4) / 100,
  };
}

function valid(v: unknown): v is Progress {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return o.version === 1 && typeof o.xp === "number" && o.xp >= 0 && typeof o.reputation === "number" && Array.isArray(o.films);
}
export function loadProgress(): Progress {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!valid(parsed)) return emptyProgress();
    return { ...parsed, films: parsed.films.filter((f) => f && typeof f === "object").slice(0, 12) as FilmRecord[] };
  } catch {
    return emptyProgress();
  }
}
export function saveProgress(p: Progress) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* sin almacenamiento */ }
}
