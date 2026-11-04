export type CrewId =
  | "director"
  | "guion"
  | "camara"
  | "luz"
  | "sonido"
  | "montaje"
  | "produccion"
  | "actores";

export type Mood = "work" | "angry" | "sleep" | "talk";

export type CrewDef = {
  id: CrewId;
  name: string;
  role: string;
  homeX: number;
  homeY: number;
  job: string;
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
    homeX: 0.22,
    homeY: 0.74,
    job: "Quiero emoción, no sólo planos lindos.",
  },
  {
    id: "guion",
    name: "Sol",
    role: "Guion",
    homeX: 0.34,
    homeY: 0.86,
    job: "Esta escena necesita un objetivo claro y un giro.",
  },
  {
    id: "camara",
    name: "Nico",
    role: "Cámara",
    homeX: 0.46,
    homeY: 0.66,
    job: "Marco el plano. Necesito luz y la marca de los actores.",
  },
  {
    id: "luz",
    name: "Vera",
    role: "Luces",
    homeX: 0.7,
    homeY: 0.64,
    job: "Estoy armando el clima. No me muevan los prácticos.",
  },
  {
    id: "sonido",
    name: "Teo",
    role: "Sonido",
    homeX: 0.76,
    homeY: 0.8,
    job: "Silencio en el set. Estoy cazando un zumbido.",
  },
  {
    id: "montaje",
    name: "Lila",
    role: "Montaje",
    homeX: 0.28,
    homeY: 0.7,
    job: "Sin continuidad no hay relato. Reviso el orden de las tomas.",
  },
  {
    id: "produccion",
    name: "Marcos",
    role: "Producción",
    homeX: 0.56,
    homeY: 0.88,
    job: "Tiempo y presupuesto. Cuidado con los retrasos.",
  },
  {
    id: "actores",
    name: "Nina",
    role: "Actuación",
    homeX: 0.52,
    homeY: 0.76,
    job: "Estoy buscando qué quiere el personaje en esta toma.",
  },
];

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
};

export const ISSUES: Record<Exclude<CrewId, "director">, string> = {
  guion: "Se me cayó una página y cambió el orden de las escenas.",
  camara: "Se trabó la tarjeta. Perdimos la última toma.",
  luz: "Se fundió una luz y se fue el clima de la escena.",
  sonido: "Entró ruido de tráfico. Hay que repetir.",
  montaje: "Las tomas no cierran: un objeto cambió de lugar.",
  produccion: "Se retrasó el permiso de esta locación.",
  actores: "Perdí el hilo emocional del personaje.",
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
];

export function stateLabel(state: Mood, moving: boolean): string {
  if (state === "work" && moving) return "Camina";
  if (state === "work") return "Trabaja";
  if (state === "angry") return "Enojado";
  if (state === "sleep") return "Duerme";
  return "Habla";
}
