export type ChallengeStyle = "balanced" | "deadline" | "team";
export type StoryGenre = "Drama" | "Comedia" | "Suspenso" | "Documental";

export type StoryChapter = {
  title: string;
  briefing: string;
  qualityTarget: number;
  rescueGoal: number;
  stressLimit: number;
  timeLimit: number;
};

export type StoryDefinition = {
  id: string;
  title: string;
  genre: StoryGenre;
  premise: string;
  chapters: StoryChapter[];
  custom?: boolean;
};

const chapter = (
  title: string,
  briefing: string,
  qualityTarget: number,
  rescueGoal: number,
  stressLimit: number,
  timeLimit: number,
): StoryChapter => ({
  title,
  briefing,
  qualityTarget,
  rescueGoal,
  stressLimit,
  timeLimit,
});

export const DEFAULT_STORY: StoryDefinition = {
  id: "la-ultima-toma",
  title: "La última toma",
  genre: "Drama",
  premise: "Un pequeño equipo tiene una sola jornada para filmar la escena que puede salvar la película. El talento está, pero nadie parece estar en el lugar indicado.",
  chapters: [
    chapter("Un comienzo complicado", "Prepará el set y recuperá al menos a una persona antes de rodar.", 52, 1, 88, 105),
    chapter("La escena se rompe", "La presión sube. Recuperá a dos integrantes y cuidá el clima del equipo.", 68, 2, 76, 105),
    chapter("La última toma", "El final depende de todos. Alcanzá la calidad necesaria sin dejar que el estrés domine el set.", 84, 3, 66, 110),
  ],
};

export const STORY_LIBRARY: StoryDefinition[] = [
  DEFAULT_STORY,
  {
    id: "rodaje-imposible",
    title: "El rodaje imposible",
    genre: "Comedia",
    premise: "Todo lo que puede salir mal en una filmación ocurre el mismo día: retrasos, discusiones, café y un director que no piensa rendirse.",
    chapters: [
      chapter("Llegó tarde el equipo", "Poné a trabajar al equipo antes de que se descontrole el primer día.", 58, 1, 82, 90),
      chapter("El café nunca alcanza", "Las distracciones se multiplican. Rescatá a dos integrantes y mantené la calma.", 72, 2, 72, 88),
      chapter("Una toma por milagro", "Cerrá la comedia con el equipo unido y una toma que funcione.", 86, 3, 62, 92),
    ],
  },
  {
    id: "el-secreto-del-plano",
    title: "El secreto del plano",
    genre: "Suspenso",
    premise: "Una escena aparentemente simple esconde una pista. Guion, cámara y montaje tienen que trabajar juntos antes de que se pierda la continuidad.",
    chapters: [
      chapter("La pista", "Ordená el primer equipo y conseguí una toma con calidad suficiente.", 62, 1, 82, 100),
      chapter("Fuera de continuidad", "Dos departamentos se distraen. Recuperalos antes de que el estrés arruine la escena.", 76, 2, 70, 95),
      chapter("El plano final", "La pista sólo se entiende si todo encaja. Completá el objetivo de equipo.", 90, 3, 60, 100),
    ],
  },
  {
    id: "documental-a-contrarreloj",
    title: "Documental a contrarreloj",
    genre: "Documental",
    premise: "La locación está disponible por unas horas. El equipo necesita coordinarse, cuidar el ambiente y conseguir material aprovechable.",
    chapters: [
      chapter("La locación", "Acomodá el equipo sin elevar demasiado el estrés.", 50, 1, 68, 115),
      chapter("La entrevista", "Mantené dos integrantes en sus puestos y controlá la presión.", 68, 2, 62, 110),
      chapter("La última luz", "Aprovechá el tiempo que queda y cerrá la jornada con una toma sólida.", 82, 3, 55, 105),
    ],
  },
];

const STYLE_CHAPTERS: Record<ChallengeStyle, StoryChapter[]> = {
  balanced: [
    chapter("La primera escena", "Prepará el rodaje y recuperá al menos a una persona.", 52, 1, 86, 105),
    chapter("Complicaciones", "Coordiná al equipo cuando aumenten las distracciones.", 68, 2, 74, 105),
    chapter("El desenlace", "Completá la toma final con calidad y estrés controlado.", 84, 3, 64, 110),
  ],
  deadline: [
    chapter("Se nos va la luz", "El tiempo corre: recuperá a alguien y mejorá la toma rápido.", 58, 1, 82, 78),
    chapter("Último aviso", "No hay margen para pausas largas. Recuperá a dos integrantes.", 72, 2, 70, 76),
    chapter("Ahora o nunca", "Conseguí la toma final antes de que termine el tiempo.", 88, 3, 60, 78),
  ],
  team: [
    chapter("Volver a encontrarse", "Cuidá al equipo, recuperá a una persona y mantené bajo el estrés.", 48, 1, 68, 120),
    chapter("Confiar en el equipo", "Sostené la calma y reuní a dos integrantes en sus puestos.", 64, 2, 62, 118),
    chapter("Una buena jornada", "Cerrá la historia con el equipo en armonía.", 80, 3, 56, 115),
  ],
};

export function createCustomStory(
  title: string,
  premise: string,
  genre: StoryGenre,
  style: ChallengeStyle,
): StoryDefinition {
  const safeTitle = title.trim().slice(0, 48) || "Mi historia";
  const safePremise = premise.trim().slice(0, 220) || "Un equipo de rodaje intenta terminar una película.";
  const slug = safeTitle
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "historia";

  const beats: Record<StoryGenre, Array<{ title: string; briefing: string }>> = {
    Drama: [
      { title: "La herida inicial", briefing: "Presentá el conflicto de tu película y conseguí que el equipo encuentre el tono." },
      { title: "La decisión difícil", briefing: "La historia se complica. Organizá los departamentos antes de la escena decisiva." },
      { title: "Lo que queda", briefing: "Filmá el desenlace y cerrá la historia con el equipo unido." },
    ],
    Comedia: [
      { title: "El primer blooper", briefing: "Arrancá la película sin que el caos se adueñe del set." },
      { title: "Enredos en el set", briefing: "Los contratiempos se acumulan. Volvé a reunir al equipo." },
      { title: "El remate final", briefing: "Prepará el último gag y conseguí una toma que cierre la comedia." },
    ],
    Suspenso: [
      { title: "Una pista fuera de lugar", briefing: "Plantá la primera pista y mantené la continuidad de la escena." },
      { title: "La verdad se acerca", briefing: "La tensión aumenta. Coordiná cámara, guion y montaje." },
      { title: "El plano que revela todo", briefing: "Filmá la revelación final antes de que se agote la jornada." },
    ],
    Documental: [
      { title: "La primera entrevista", briefing: "Prepará el equipo y capturá el testimonio inicial." },
      { title: "La historia detrás", briefing: "Ordená las entrevistas y mantené al equipo enfocado." },
      { title: "La última evidencia", briefing: "Registrá el cierre y completá el documental con calma." },
    ],
  };

  return {
    id: `custom-${slug}-${Date.now().toString(36)}`,
    title: safeTitle,
    premise: safePremise,
    genre,
    chapters: STYLE_CHAPTERS[style].map((item, index) => ({
      ...item,
      title: beats[genre][index]?.title ?? item.title,
      briefing: `${beats[genre][index]?.briefing ?? item.briefing} ${item.briefing}`,
    })),
    custom: true,
  };
}

export function isStoryDefinition(value: unknown): value is StoryDefinition {
  if (!value || typeof value !== "object") return false;
  const story = value as Partial<StoryDefinition>;
  return (
    typeof story.id === "string" &&
    typeof story.title === "string" &&
    typeof story.premise === "string" &&
    ["Drama", "Comedia", "Suspenso", "Documental"].includes(story.genre ?? "") &&
    Array.isArray(story.chapters) &&
    story.chapters.length === 3 &&
    story.chapters.every((item) =>
      !!item &&
      typeof item.title === "string" &&
      typeof item.briefing === "string" &&
      typeof item.qualityTarget === "number" &&
      typeof item.rescueGoal === "number" &&
      typeof item.stressLimit === "number" &&
      typeof item.timeLimit === "number"
    )
  );
}
