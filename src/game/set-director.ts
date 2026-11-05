import {
  GENRE_LIST, applyContinuity, chooseLocation, dressSet, initialContinuity, interpretScript, lightingFor, locationById, locationsFor, planFilm,
  type Continuity, type Dressing, type Genre, type Lighting, type Location, type PlannedScene, type TimeOfDay, type Weather,
} from "@/game/scenery";

export type TransitionKind = "fundido" | "cortinilla" | "iris";
export type SetSnapshot = {
  genre: Genre; plan: PlannedScene[]; sceneIndex: number; scene: PlannedScene; location: Location; time: TimeOfDay; weather: Weather;
  seed: number; autoDress: boolean; autoAdvance: boolean; lighting: Lighting; dressing: Dressing; continuity: Continuity;
  transitioning: boolean; recent: string[];
};
type Pending = { apply: () => void; kind: TransitionKind; title: string };

/** Director de puesta en escena: elige set, viste, ilumina, hace transiciones y vigila continuidad. */
export function createSetDirector(onLog: (who: string, text: string) => void) {
  let genre: Genre = "Drama";
  let plan = planFilm(genre);
  let sceneIndex = 0;
  let location = locationById(plan[0]!.locationId);
  let time: TimeOfDay = plan[0]!.time;
  let weather: Weather = plan[0]!.weather;
  let seed = 0, autoDress = true, autoAdvance = true;
  let propIds: string[] = [];
  let continuity = initialContinuity(genre);
  let dressing: Dressing = { items: [], props: [] };
  const recent: string[] = [];
  const tr = { active: false, t: 0, kind: "fundido" as TransitionKind, title: "", applied: true, pending: null as Pending | null };
  const DURATION = 1.4;

  function redress() { dressing = dressSet(location, genre, propIds, seed); }
  function loadScene(scene: PlannedScene) {
    location = locationById(scene.locationId); time = scene.time; weather = scene.weather;
    const r = applyContinuity(continuity, genre, scene, location);
    continuity = r.cont; propIds = r.props; recent.push(location.id); if (recent.length > 6) recent.shift();
    redress();
    for (const w of continuity.warnings.slice(0, 3)) onLog("Vera", `Continuidad: ${w}`);
  }
  function swap(title: string, apply: () => void, kind?: TransitionKind) {
    if (tr.active) { tr.pending = { apply, kind: kind ?? tr.kind, title }; return; }
    tr.active = true; tr.t = 0; tr.applied = false; tr.title = title;
    tr.kind = kind ?? (["fundido", "cortinilla", "iris"] as const)[(sceneIndex + seed) % 3]!;
    tr.pending = { apply, kind: tr.kind, title };
  }
  function step(dt: number) {
    if (!tr.active) return;
    tr.t += dt / DURATION;
    if (!tr.applied && tr.t >= 0.5) { tr.pending?.apply(); tr.pending = null; tr.applied = true; }
    if (tr.t >= 1) { tr.active = false; tr.t = 0; }
  }
  const sceneTitle = () => `Escena ${plan[sceneIndex]!.n}/${plan.length} · ${location.name} · ${time}`;

  loadScene(plan[0]!);

  return {
    step,
    snapshot(): SetSnapshot {
      return {
        genre, plan, sceneIndex, scene: plan[sceneIndex]!, location, time, weather, seed, autoDress, autoAdvance,
        lighting: lightingFor(time, weather), dressing, continuity, transitioning: tr.active, recent: [...recent],
      };
    },
    /** Estado de la transición para el renderizador. */
    transition: () => ({ active: tr.active, t: tr.t, kind: tr.kind, title: tr.title }),
    genres: GENRE_LIST,
    locationsFor,
    setGenre(g: Genre) {
      if (g === genre) return;
      swap(`Nuevo género · ${g}`, () => {
        genre = g; plan = planFilm(g); sceneIndex = 0; continuity = initialContinuity(g); recent.length = 0;
        loadScene(plan[0]!);
        onLog("Marcos", `Plan de ${plan.length} escenas armado para ${g}.`);
      });
    },
    goScene(i: number) {
      const idx = Math.max(0, Math.min(plan.length - 1, i));
      const scene = plan[idx]!;
      swap(`Escena ${scene.n}/${plan.length} · ${locationById(scene.locationId).name}`, () => {
        sceneIndex = idx; loadScene(scene); onLog("Sol", `Escena ${scene.n}: ${scene.title}. ${scene.text}`);
      });
    },
    nextScene() { this.goScene((sceneIndex + 1) % plan.length); },
    /** Director cambia manualmente la localización (se vuelve a vestir y se revisa continuidad). */
    setLocation(id: string) {
      if (id === location.id) return;
      swap(`${locationById(id).name}`, () => {
        location = locationById(id); recent.push(id); redress();
        onLog("Rey", `Cambiamos de set: ${location.name}.`);
        reviewTimeline();
      });
    },
    setTime(t: TimeOfDay) { time = t; reviewTimeline(); onLog("Vera", `Iluminación: ${lightingFor(time, weather).label}.`); },
    setWeather(w: Weather) { weather = w; onLog("Vera", `Clima: ${w}. ${lightingFor(time, weather).label}.`); },
    reshuffle() { seed += 1; redress(); onLog("Producción", "Decorado reordenado: muebles y objetos recolocados."); },
    setAutoDress(v: boolean) { autoDress = v; if (v) redress(); },
    setAutoAdvance(v: boolean) { autoAdvance = v; },
    /** Un guionista escribe una línea y el motor monta el escenario. */
    applyScript(text: string) {
      const r = interpretScript(text, genre, recent);
      swap(r.location.name, () => {
        location = r.location; if (r.time) time = r.time; if (r.weather) weather = r.weather;
        recent.push(location.id); redress();
        onLog("Sol", `Guion: «${text.slice(0, 60)}» → ${location.name}, ${time}, ${weather}.`);
        reviewTimeline();
      });
    },
    autoPick() {
      const loc = chooseLocation(genre, plan[sceneIndex]!.tags, plan[sceneIndex]!.text, recent, seed + 1);
      this.setLocation(loc.id);
    },
    transitionTitle: sceneTitle,
  };

  function reviewTimeline() {
    const c = continuity;
    if (c.day === plan[sceneIndex]!.day && ["amanecer", "día", "tarde", "noche"].indexOf(time) < ["amanecer", "día", "tarde", "noche"].indexOf(c.time)) {
      onLog("Vera", "Aviso de continuidad: la hora quedó antes que la escena anterior.");
    }
  }
}
export type SetDirector = ReturnType<typeof createSetDirector>;
