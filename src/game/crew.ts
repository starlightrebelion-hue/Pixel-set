export type CrewId =
  | "director"
  | "guion"
  | "camara"
  | "luz"
  | "sonido"
  | "montaje"
  | "produccion"
  | "actores"
  | "maquillaje";

export type Mood = "work" | "angry" | "sleep" | "talk" | "coffee" | "seated";

export type MapId = "guion" | "set" | "montaje";

export type CrewDef = {
  id: CrewId;
  name: string;
  role: string;
  homeX: number;
  homeY: number;
  job: string;
  homeMap: MapId;
};

export const SCENES = [
  "La traición",
  "El reencuentro",
  "La carta",
  "Bajo la lluvia",
  "El silencio",
  "Última toma",
];

export const CREW: CrewDef[] = [
  {
    id: "director",
    name: "Rey",
    role: "Dirección",
    homeX: 0.18,
    homeY: 0.78,
    job: "Quiero emoción, no sólo planos lindos.",
    homeMap: "set",
  },
  {
    id: "guion",
    name: "Sol",
    role: "Guion",
    homeX: 0.3,
    homeY: 0.62,
    job: "Esta escena necesita un objetivo claro y un giro.",
    homeMap: "guion",
  },
  {
    id: "camara",
    name: "Nico",
    role: "Cámara",
    homeX: 0.42,
    homeY: 0.55,
    job: "Marco el plano. Necesito luz y la marca de los actores.",
    homeMap: "set",
  },
  {
    id: "luz",
    name: "Vera",
    role: "Luces",
    homeX: 0.62,
    homeY: 0.52,
    job: "Estoy armando el clima. No me muevan los prácticos.",
    homeMap: "set",
  },
  {
    id: "sonido",
    name: "Teo",
    role: "Sonido",
    homeX: 0.74,
    homeY: 0.7,
    job: "Silencio en el set. La caña apunta a la escena.",
    homeMap: "set",
  },
  {
    id: "montaje",
    name: "Lila",
    role: "Montaje",
    homeX: 0.28,
    homeY: 0.62,
    job: "Sin continuidad no hay relato. Edito en mi sala.",
    homeMap: "montaje",
  },
  {
    id: "produccion",
    name: "Marcos",
    role: "Producción",
    homeX: 0.55,
    homeY: 0.88,
    job: "Tiempo y presupuesto. Cuidado con los retrasos.",
    homeMap: "set",
  },
  {
    id: "actores",
    name: "Nina",
    role: "Actuación",
    homeX: 0.52,
    homeY: 0.68,
    job: "Estoy buscando qué quiere el personaje en esta toma.",
    homeMap: "set",
  },
  {
    id: "maquillaje",
    name: "Ira",
    role: "Maquillaje",
    homeX: 0.44,
    homeY: 0.74,
    job: "Retoco el rostro. Que la luz no delate el maquillaje.",
    homeMap: "set",
  },
];

/** Station anchors per map (normalized 0–1). */
export const STATIONS: Record<
  MapId,
  Partial<Record<CrewId, { x: number; y: number; seated?: boolean }>>
> = {
  guion: {
    guion: { x: 0.32, y: 0.62, seated: true },
    produccion: { x: 0.48, y: 0.64, seated: true },
    director: { x: 0.62, y: 0.6, seated: true },
  },
  set: {
    director: { x: 0.18, y: 0.78, seated: true },
    camara: { x: 0.4, y: 0.55 },
    luz: { x: 0.62, y: 0.52 },
    sonido: { x: 0.74, y: 0.7 },
    actores: { x: 0.52, y: 0.68 },
    maquillaje: { x: 0.44, y: 0.74 },
    produccion: { x: 0.58, y: 0.88 },
    montaje: { x: 0.28, y: 0.72 },
  },
  montaje: {
    montaje: { x: 0.28, y: 0.62, seated: true },
    guion: { x: 0.48, y: 0.62, seated: true },
    director: { x: 0.62, y: 0.6, seated: true },
  },
};

/**
 * Door / hallway entrance per map (normalized).
 * Aligned to the stone arch on the set floor plan (bottom-right).
 * Guion and montaje draw the same arch so walk-in/out matches.
 */
export const DOOR: Record<MapId, { x: number; y: number }> = {
  set: { x: 0.88, y: 0.9 },
  guion: { x: 0.88, y: 0.9 },
  montaje: { x: 0.88, y: 0.9 },
};

/** Point just inside the room from the door (where characters land after entering). */
export const DOOR_IN: Record<MapId, { x: number; y: number }> = {
  set: { x: 0.78, y: 0.82 },
  guion: { x: 0.78, y: 0.82 },
  montaje: { x: 0.78, y: 0.82 },
};

export const BOUNDS = { minX: 0.08, maxX: 0.92, minY: 0.42, maxY: 0.96 };

export const FLOOR: Array<[number, number]> = [
  [0.24, 0.7],
  [0.36, 0.78],
  [0.48, 0.72],
  [0.6, 0.8],
  [0.7, 0.7],
  [0.32, 0.88],
  [0.66, 0.88],
  [0.42, 0.84],
  [0.16, 0.58],
  [0.34, 0.5],
  [0.52, 0.56],
  [0.76, 0.48],
  [0.88, 0.68],
  [0.14, 0.84],
  [0.84, 0.9],
  [0.58, 0.94],
];

export const COMPLAINTS: Record<Exclude<CrewId, "director">, string> = {
  guion: "El conflicto no avanza. ¿Cuál es el objetivo de la escena?",
  camara: "Ese encuadre no acompaña el punto de vista del personaje.",
  luz: "La luz está plana. Quiero clima, no un catálogo.",
  sonido: "Hay ruido. No dirijo una escena que no se escucha.",
  montaje: "Cortaste antes del gesto. Se pierde la emoción.",
  produccion: "Se nos va el día. Organizá el cambio de set.",
  actores: "Más intención. El personaje quiere algo: mostralo.",
  maquillaje: "El brillo en la frente arruina el close-up. Retoco ya.",
};

export const ISSUES: Record<Exclude<CrewId, "director">, string> = {
  guion: "Se me cayó una página y cambió el orden de las escenas.",
  camara: "Se trabó la tarjeta. Perdimos la última toma.",
  luz: "Se fundió una luz y se fue el clima de la escena.",
  sonido: "Entró ruido de tráfico. Hay que repetir.",
  montaje: "Las tomas no cierran: un objeto cambió de lugar.",
  produccion: "Se retrasó el permiso de esta locación.",
  actores: "Perdí el hilo emocional del personaje.",
  maquillaje: "Se corrió el maquillaje con el calor de las luces.",
};

export const ANGRY_REPLIES = [
  "¡Está bien! Lo corrijo ya.",
  "No me apures, lo estoy resolviendo.",
  "¡No es tan fácil como parece!",
  "Uf… está bien. Vuelvo a trabajar.",
];

export const FIXED_REPLIES = [
  "Listo, ya está resuelto.",
  "Volví al trabajo.",
  "Quedó corregido.",
  "Sigo con esto.",
];

export const CHATS: Array<{ a: CrewId; b: CrewId; line: string; reply: string }> = [
  {
    a: "guion",
    b: "camara",
    line: "El plano tiene que revelar el secreto justo acá.",
    reply: "Entonces lo dejo en el eje hasta el gesto.",
  },
  {
    a: "camara",
    b: "luz",
    line: "Necesito más contraste del lado izquierdo.",
    reply: "Te bajo la contra y subo la key.",
  },
  {
    a: "sonido",
    b: "produccion",
    line: "Para esta toma necesito silencio absoluto.",
    reply: "Cierro el set. Nadie entra.",
  },
  {
    a: "montaje",
    b: "guion",
    line: "Si sacamos esta réplica, el arco queda más claro.",
    reply: "Dale, pero no perdamos el objetivo.",
  },
  {
    a: "actores",
    b: "director",
    line: "¿Mi personaje ya sabe que la traicionaron?",
    reply: "Todavía no. Duda, no llanto.",
  },
  {
    a: "produccion",
    b: "director",
    line: "Si repetimos mucho, perdemos la luz del ventanal.",
    reply: "Entonces esta es la buena. Concentración.",
  },
  {
    a: "luz",
    b: "camara",
    line: "La key está lista. No me muevan el trípode.",
    reply: "No lo toco. Sólo ajusto el foco.",
  },
  {
    a: "director",
    b: "actores",
    line: "Menos explicación y más deseo.",
    reply: "Lo busco desde el cuerpo, no desde el texto.",
  },
  {
    a: "sonido",
    b: "luz",
    line: "Ese dimmer zumba. ¿Lo podés cambiar?",
    reply: "Lo saco y paso a la otra línea.",
  },
  {
    a: "montaje",
    b: "camara",
    line: "Cuidá el eje: en la toma anterior miraba a la izquierda.",
    reply: "Anotado. Misma altura de ojos.",
  },
  {
    a: "maquillaje",
    b: "actores",
    line: "Quedate quieta un segundo, retoco el párpado.",
    reply: "Dale, pero no me borres la expresión.",
  },
  {
    a: "maquillaje",
    b: "luz",
    line: "Con esa key se ve demasiado el corrector.",
    reply: "Bajo un punto y difundo el brillo.",
  },
];

export function stateLabel(state: Mood, moving: boolean): string {
  if (state === "seated") return "Sentado";
  if (state === "work" && moving) return "Camina";
  if (state === "work") return "Trabaja";
  if (state === "angry") return "Enojado";
  if (state === "sleep") return "Duerme";
  if (state === "coffee") return "Café";
  return "Habla";
}

export const MAP_LABEL: Record<MapId, string> = {
  guion: "Sala de guion",
  set: "Set de rodaje",
  montaje: "Sala de montaje",
};
