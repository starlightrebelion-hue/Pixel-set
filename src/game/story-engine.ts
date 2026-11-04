export type StoryStat = "trust" | "tension" | "budget" | "quality" | "morale";
export type StoryChoice = {
  id: string;
  label: string;
  description: string;
  effects: Partial<Record<StoryStat, number>>;
  consequence: string;
  tags: string[];
};
export type StoryBeat = {
  id: string;
  title: string;
  location: string;
  setup: string;
  speaker: string;
  line: string;
  choices: StoryChoice[];
};
export type StoryLogEntry = {
  id: string;
  beatTitle: string;
  choiceLabel: string;
  consequence: string;
  day: number;
};
export type StoryState = {
  version: 1;
  projectTitle: string;
  beatIndex: number;
  day: number;
  stats: Record<StoryStat, number>;
  history: StoryLogEntry[];
  completed: boolean;
  ending: string | null;
};

const beats: StoryBeat[] = [
  {
    id: "the-secret",
    title: "La traición",
    location: "Sala de guion",
    setup: "Sol encuentra una contradicción en el guion: el personaje que parece traicionar al protagonista quizá está protegiéndolo. El giro cambia toda la película.",
    speaker: "Sol",
    line: "Si revelamos el secreto ahora, perdemos el misterio. Si lo escondemos demasiado, el público puede sentirse engañado.",
    choices: [
      { id: "reveal", label: "Revelar una pista ahora", description: "El público sabe un poco más que el protagonista.", effects: { quality: 8, trust: 3, budget: -3 }, consequence: "Sol reescribe la escena y deja una pista visual. El misterio sigue vivo, pero el rodaje suma una toma.", tags: ["clarity", "cost"] },
      { id: "hide", label: "Guardar el secreto", description: "Proteger el giro hasta el último acto.", effects: { tension: 9, quality: -2, morale: -3 }, consequence: "Rey acepta el riesgo. El misterio crece, aunque Nina teme que su personaje parezca inexplicable.", tags: ["mystery", "risk"] },
      { id: "test", label: "Probar dos versiones", description: "Rodar una alternativa y decidir en montaje.", effects: { quality: 6, budget: -9, morale: 2 }, consequence: "Marcos advierte que habrá horas extra. Lila tendrá dos versiones para comparar.", tags: ["experiment", "cost"] },
    ],
  },
  {
    id: "the-lead",
    title: "El personaje",
    location: "Set de rodaje",
    setup: "Nina no encuentra la motivación de la escena. El texto dice que está furiosa, pero ella cree que el personaje está intentando no quebrarse.",
    speaker: "Nina",
    line: "¿Querés que explote o que haga todo lo posible para que nadie note que está destruida?",
    choices: [
      { id: "subtle", label: "Contener la emoción", description: "Una actuación mínima, sostenida por miradas y silencios.", effects: { quality: 10, trust: 5, tension: -2 }, consequence: "Rey cambia la indicación. La escena gana intimidad y Nina confía más en la dirección.", tags: ["performance", "trust"] },
      { id: "big", label: "Ir a una ruptura emocional", description: "Una toma intensa, física y difícil de repetir.", effects: { tension: 6, quality: 5, morale: -2 }, consequence: "La toma impacta al equipo, pero repetirla será difícil y aumenta el desgaste.", tags: ["performance", "stress"] },
      { id: "rewrite", label: "Reescribir el diálogo", description: "Eliminar explicaciones y dejar que la acción hable.", effects: { quality: 7, budget: -4, trust: 2 }, consequence: "Sol recorta el parlamento. La escena ahora depende de la actuación y la puesta.", tags: ["rewrite"] },
    ],
  },
  {
    id: "the-light",
    title: "La última luz",
    location: "Set de rodaje",
    setup: "Vera ve que la luz natural está cambiando. Nico necesita diez minutos más para preparar un movimiento de cámara.",
    speaker: "Marcos",
    line: "Tenemos una ventana corta. Si esperamos, perdemos la luz. Si corremos, podemos perder la toma.",
    choices: [
      { id: "wait", label: "Esperar a Nico", description: "Priorizar el plano diseñado aunque se pierda luz natural.", effects: { quality: 7, budget: -8, tension: 4 }, consequence: "Nico consigue el movimiento. Producción registra el retraso y Vera prepara una alternativa de iluminación.", tags: ["craft", "time"] },
      { id: "adapt", label: "Adaptar el plano", description: "Resolver con un encuadre más simple y rápido.", effects: { budget: 5, morale: 3, quality: -1 }, consequence: "El equipo se reorganiza. La escena será menos ambiciosa, pero el rodaje sigue en horario.", tags: ["efficiency"] },
      { id: "natural", label: "Rodar con la luz disponible", description: "Aceptar el cambio de luz como parte del lenguaje visual.", effects: { quality: 8, trust: 3, tension: 3 }, consequence: "Vera convierte la limitación en una decisión estética. La continuidad de luz será un desafío.", tags: ["visual-risk"] },
    ],
  },
  {
    id: "the-noise",
    title: "Silencio en el set",
    location: "Set de rodaje",
    setup: "Teo detecta ruido de tráfico en la toma. Repetir implica retrasar el plan; conservarla puede arruinar el momento más importante.",
    speaker: "Teo",
    line: "La actuación está. Pero el ruido tapa la frase que cambia el sentido de la escena.",
    choices: [
      { id: "retake", label: "Repetir la toma", description: "Cerrar el set y grabar de nuevo.", effects: { quality: 9, budget: -7, morale: -2 }, consequence: "Teo consigue una pista limpia. El equipo se cansa, pero la escena queda utilizable.", tags: ["sound", "time"] },
      { id: "wild", label: "Grabar sonido aparte", description: "Hacer una toma de sonido ambiente y reconstruir en edición.", effects: { quality: 5, budget: -3, trust: 3 }, consequence: "Teo registra ambiente y diálogos. Lila tendrá más trabajo, pero no se pierde la actuación.", tags: ["postproduction"] },
      { id: "keep", label: "Conservar la toma", description: "Aceptar el defecto como textura documental.", effects: { quality: -5, tension: 5, morale: 2 }, consequence: "Rey conserva la toma por su verdad emocional. El defecto queda como una apuesta estética.", tags: ["risk", "style"] },
    ],
  },
  {
    id: "the-cut",
    title: "El montaje",
    location: "Sala de montaje",
    setup: "Lila encuentra dos versiones del final. Una explica todo; la otra termina antes de la respuesta y deja al público con una duda.",
    speaker: "Lila",
    line: "El corte no es sólo duración. Es decidir qué siente el espectador cuando termina la película.",
    choices: [
      { id: "resolve", label: "Cerrar todas las respuestas", description: "Un final claro y emocionalmente completo.", effects: { trust: 5, quality: 3, tension: -5 }, consequence: "El público recibe una resolución clara. Sol cree que el final pierde algo de misterio.", tags: ["closure"] },
      { id: "open", label: "Dejar una pregunta abierta", description: "Un final ambiguo que invita a conversar.", effects: { quality: 8, tension: 4, trust: -1 }, consequence: "La película termina con una imagen inquietante. No todos en el equipo están convencidos.", tags: ["ambiguity"] },
      { id: "hybrid", label: "Resolver la emoción, no el misterio", description: "Cerrar el arco del personaje y dejar abierta la verdad.", effects: { quality: 9, trust: 4, morale: 3 }, consequence: "Lila encuentra un equilibrio: el personaje cambia, pero el secreto conserva una última sombra.", tags: ["character", "mystery"] },
    ],
  },
  {
    id: "premiere",
    title: "La première",
    location: "Sala de proyección",
    setup: "La película está lista. El equipo se sienta a verla por primera vez. Nadie habla durante los créditos.",
    speaker: "Rey",
    line: "No podemos cambiar todas las decisiones. Ahora tenemos que hacernos cargo de la película que hicimos.",
    choices: [
      { id: "team", label: "Compartir el mérito", description: "Reconocer el trabajo de todo el equipo.", effects: { trust: 8, morale: 8 }, consequence: "El equipo siente que la película también le pertenece. Quedan ganas de hacer otra.", tags: ["team"] },
      { id: "vision", label: "Defender la visión del director", description: "Presentar la película como una obra de autor.", effects: { quality: 3, trust: -4, tension: 3 }, consequence: "Rey asume la autoría y la responsabilidad. Parte del equipo se distancia.", tags: ["authorship"] },
      { id: "learn", label: "Hacer una retrospectiva", description: "Revisar aciertos y errores antes del próximo proyecto.", effects: { quality: 5, morale: 5, budget: 3 }, consequence: "La producción registra aprendizajes concretos. El equipo termina con un plan para la próxima película.", tags: ["learning"] },
    ],
  },
];

export function createStoryState(projectTitle = "La película") : StoryState {
  return {
    version: 1,
    projectTitle,
    beatIndex: 0,
    day: 1,
    stats: { trust: 50, tension: 25, budget: 70, quality: 35, morale: 65 },
    history: [],
    completed: false,
    ending: null,
  };
}

export function currentStoryBeat(state: StoryState): StoryBeat | null {
  return state.completed ? null : beats[state.beatIndex] ?? null;
}

export function chooseStoryOption(state: StoryState, choiceId: string): StoryState {
  const beat = currentStoryBeat(state);
  if (!beat || state.completed) return state;
  const choice = beat.choices.find((item) => item.id === choiceId);
  if (!choice) return state;

  const stats = { ...state.stats };
  for (const [key, delta] of Object.entries(choice.effects) as Array<[StoryStat, number]>) {
    stats[key] = Math.max(0, Math.min(100, stats[key] + delta));
  }
  const history = [...state.history, {
    id: `${beat.id}:${choice.id}`,
    beatTitle: beat.title,
    choiceLabel: choice.label,
    consequence: choice.consequence,
    day: state.day,
  }];
  const nextIndex = state.beatIndex + 1;
  const completed = nextIndex >= beats.length;
  const ending = completed
    ? stats.trust >= 65 && stats.quality >= 65 && stats.morale >= 50
      ? "Una película de equipo: la obra encuentra su identidad y el grupo termina unido."
      : stats.quality >= 65
        ? "Una obra de autor: la película llega a destino, aunque el equipo queda dividido."
        : stats.morale <= 30
          ? "Un rodaje al límite: la película se termina, pero el costo humano fue demasiado alto."
          : "Un final abierto: el proyecto se completa con aciertos y deudas creativas por resolver."
    : null;

  return {
    ...state,
    beatIndex: nextIndex,
    day: state.day + (beat.id === "the-light" || beat.id === "the-noise" ? 1 : 0),
    stats,
    history,
    completed,
    ending,
  };
}

export function storyBeatCount() {
  return beats.length;
}

export function storyProgress(state: StoryState) {
  return Math.round((state.history.length / beats.length) * 100);
}

export function isStoryState(value: unknown): value is StoryState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<StoryState>;
  return state.version === 1
    && typeof state.projectTitle === "string"
    && Number.isInteger(state.beatIndex)
    && typeof state.day === "number"
    && !!state.stats
    && ["trust", "tension", "budget", "quality", "morale"].every((key) => Number.isFinite(state.stats?.[key as StoryStat]))
    && Array.isArray(state.history)
    && typeof state.completed === "boolean";
}
