import type { StoryChapter } from "@/game/stories";

/** Misiones de capítulo: objetivos con progreso real medido en el estudio. */
export type MissionKind = "good_takes" | "rescues" | "clean_takes" | "crises" | "stars" | "bond";
export type MissionReward = { label: string; lives?: number; quality?: number; stars?: number };
export type MissionDef = {
  id: string; kind: MissionKind; label: string; hint: string; target: number; required: boolean; reward: MissionReward | null;
};
export type MissionView = MissionDef & { progress: number; done: boolean; claimed: boolean };
export type MissionCounters = Record<MissionKind, number>;

export const emptyCounters = (): MissionCounters => ({ good_takes: 0, rescues: 0, clean_takes: 0, crises: 0, stars: 0, bond: 0 });

export function missionsFor(chapterIdx: number, chapter: StoryChapter): MissionDef[] {
  const n = chapterIdx;
  const list: MissionDef[] = [
    { id: "good", kind: "good_takes", label: "Rodar tomas buenas", hint: `Calidad de ${chapter.qualityTarget}% o más al cortar.`, target: 2 + n, required: true, reward: null },
    { id: "rescue", kind: "rescues", label: "Recuperar integrantes", hint: "Arrastrá a quien se distraiga hasta su escritorio.", target: Math.min(8, chapter.rescueGoal), required: true, reward: null },
  ];
  if (n >= 1) {
    list.push({ id: "clean", kind: "clean_takes", label: "Tomas limpias", hint: `Cortá con el estrés en ${chapter.stressLimit}% o menos.`, target: n + 1, required: true, reward: null });
  }
  list.push(
    { id: "crisis", kind: "crises", label: "Resolver crisis del set", hint: "Decidí cuando aparezca una crisis durante el rodaje.", target: 1 + Math.min(n, 2), required: false, reward: { label: "+1 intento", lives: 1 } },
    { id: "stars", kind: "stars", label: "Acumular estrellas", hint: "Sumá estrellas con buenas tomas.", target: 3 + 2 * n, required: false, reward: { label: "+8 calidad en el set", quality: 8 } },
    { id: "bond", kind: "bond", label: "Vínculo fuerte del equipo", hint: "Subí un vínculo a 70 resolviendo bien las crisis.", target: 70, required: false, reward: { label: "+2 estrellas", stars: 2 } },
  );
  return list;
}

export function viewMissions(defs: MissionDef[], counters: MissionCounters, claimed: Set<string>): MissionView[] {
  return defs.map((d) => {
    const progress = Math.min(d.target, Math.round(counters[d.kind]));
    return { ...d, progress, done: progress >= d.target, claimed: claimed.has(d.id) };
  });
}
