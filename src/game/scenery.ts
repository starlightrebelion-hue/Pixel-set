/** Escenarios intercambiables, plan de película de 15 escenas, puesta en escena y continuidad. */

export const GENRE_LIST = ["Drama", "Thriller", "Comedia", "Terror", "Romance", "Ciencia ficción", "Noir", "Fantasía", "Western", "Aventura"] as const;
export type Genre = (typeof GENRE_LIST)[number];
export const TIMES = ["amanecer", "día", "tarde", "noche"] as const;
export type TimeOfDay = (typeof TIMES)[number];
export const WEATHERS = ["despejado", "nublado", "lluvia", "niebla", "nieve"] as const;
export type Weather = (typeof WEATHERS)[number];
export type Tag = "home" | "work" | "public" | "street" | "nature" | "intimate" | "secret" | "climax";

export type FurnKind =
  | "window" | "door" | "shelf" | "desk" | "sofa" | "bed" | "table" | "lamp" | "plant" | "tv" | "counter"
  | "fridge" | "painting" | "crate" | "tree" | "bench" | "car" | "lamppost" | "tomb" | "fence" | "console"
  | "capsule" | "neon" | "curtain" | "rug" | "fireplace" | "building" | "wave" | "star" | "cobweb" | "balloon";
export type Furn = { k: FurnKind; x: number; y: number; s: number };
export type Palette = { wall: string; wall2: string; floor: string; floor2: string; accent: string };
export type Location = {
  id: string; name: string; interior: boolean; genres: Genre[]; tags: Tag[]; keywords: string[];
  palette: Palette; furniture: Furn[]; surface: { x: number; y: number; label: string }[];
};

const f = (k: FurnKind, x: number, y: number, s = 0.2): Furn => ({ k, x, y, s });
const P = (wall: string, wall2: string, floor: string, floor2: string, accent: string): Palette => ({ wall, wall2, floor, floor2, accent });
const ALL = [...GENRE_LIST] as Genre[];

export const LOCATIONS: Location[] = [
  { id: "estudio", name: "Estudio original", interior: true, genres: ALL, tags: ["work", "public", "climax"], keywords: ["estudio", "set", "plató"],
    palette: P("#4a4038", "#3a322c", "#7a6048", "#6a5038", "#e2b340"), furniture: [], surface: [{ x: 0.5, y: 0.5, label: "mesa" }] },
  { id: "sala", name: "Sala de casa", interior: true, genres: ["Drama", "Romance", "Comedia", "Terror"], tags: ["home", "intimate"], keywords: ["casa", "hogar", "sala", "familia", "sofá", "cena"],
    palette: P("#7a5c48", "#6a4c3a", "#a87848", "#8a6038", "#e8b86a"),
    furniture: [f("window", 0.2, 0.2, 0.2), f("painting", 0.5, 0.18, 0.12), f("window", 0.78, 0.2, 0.2), f("shelf", 0.1, 0.4, 0.26), f("sofa", 0.42, 0.46, 0.2), f("lamp", 0.9, 0.42, 0.2), f("rug", 0.5, 0.78, 0.4), f("plant", 0.93, 0.5, 0.15)],
    surface: [{ x: 0.5, y: 0.52, label: "mesa baja" }] },
  { id: "cafe", name: "Café de barrio", interior: true, genres: ["Drama", "Romance", "Comedia", "Thriller", "Noir", "Western"], tags: ["public", "intimate"], keywords: ["café", "cafe", "encuentro", "cita", "desayuno", "bar"],
    palette: P("#6a4a3a", "#5a3c2e", "#9a7248", "#7e5a38", "#d89a50"),
    furniture: [f("window", 0.2, 0.2, 0.22), f("window", 0.5, 0.2, 0.22), f("counter", 0.82, 0.42, 0.24), f("table", 0.22, 0.5, 0.14), f("table", 0.5, 0.5, 0.14), f("lamp", 0.35, 0.18, 0.12), f("plant", 0.07, 0.48, 0.14)],
    surface: [{ x: 0.5, y: 0.5, label: "mesa" }, { x: 0.22, y: 0.5, label: "mesa" }] },
  { id: "hospital", name: "Pasillo de hospital", interior: true, genres: ["Drama", "Terror", "Thriller", "Noir"], tags: ["public", "secret"], keywords: ["hospital", "médico", "pasillo", "enfermo", "clínica"],
    palette: P("#a8b8b4", "#8aa09c", "#c8d0cc", "#b0bab6", "#6ac0b0"),
    furniture: [f("door", 0.14, 0.34, 0.26), f("door", 0.4, 0.34, 0.26), f("door", 0.66, 0.34, 0.26), f("bench", 0.5, 0.5, 0.18), f("lamp", 0.28, 0.14, 0.1), f("lamp", 0.78, 0.14, 0.1), f("plant", 0.92, 0.5, 0.14)],
    surface: [{ x: 0.5, y: 0.5, label: "banco" }] },
  { id: "estacion", name: "Estación de tren", interior: false, genres: ["Drama", "Romance", "Thriller", "Noir", "Western", "Aventura"], tags: ["public", "street", "climax"], keywords: ["estación", "tren", "viaje", "partida", "despedida", "andén"],
    palette: P("#6a7480", "#58626e", "#7a7a80", "#686870", "#e2b340"),
    furniture: [f("building", 0.2, 0.3, 0.3), f("lamppost", 0.12, 0.4, 0.3), f("bench", 0.4, 0.5, 0.18), f("lamppost", 0.62, 0.4, 0.3), f("bench", 0.82, 0.5, 0.18), f("fence", 0.5, 0.42, 0.2)],
    surface: [{ x: 0.4, y: 0.5, label: "banco" }] },
  { id: "oficina", name: "Oficina", interior: true, genres: ["Thriller", "Comedia", "Drama", "Ciencia ficción", "Noir"], tags: ["work", "secret"], keywords: ["oficina", "trabajo", "jefe", "archivo", "reunión", "expediente"],
    palette: P("#8a8e96", "#747880", "#6a6e78", "#5a5e68", "#6ab0e0"),
    furniture: [f("window", 0.22, 0.2, 0.24), f("window", 0.6, 0.2, 0.24), f("desk", 0.28, 0.5, 0.2), f("desk", 0.62, 0.5, 0.2), f("shelf", 0.9, 0.38, 0.26), f("plant", 0.07, 0.5, 0.15), f("tv", 0.45, 0.18, 0.12)],
    surface: [{ x: 0.28, y: 0.48, label: "escritorio" }, { x: 0.62, y: 0.48, label: "escritorio" }] },
  { id: "callejon", name: "Callejón", interior: false, genres: ["Thriller", "Drama", "Terror", "Ciencia ficción", "Noir"], tags: ["street", "secret", "climax"], keywords: ["callejón", "calle", "persecución", "huida", "esquina", "sombras"],
    palette: P("#2e3038", "#22242c", "#3a3a40", "#2e2e34", "#e2b340"),
    furniture: [f("building", 0.14, 0.28, 0.34), f("building", 0.82, 0.28, 0.34), f("lamppost", 0.38, 0.4, 0.3), f("crate", 0.7, 0.5, 0.1), f("crate", 0.62, 0.52, 0.08), f("neon", 0.88, 0.3, 0.1)],
    surface: [{ x: 0.7, y: 0.48, label: "cajón" }] },
  { id: "estacionamiento", name: "Estacionamiento", interior: false, genres: ["Thriller", "Comedia", "Ciencia ficción", "Noir"], tags: ["street", "secret"], keywords: ["auto", "coche", "estacionamiento", "garaje", "motor"],
    palette: P("#3c4048", "#2e3238", "#4a4a50", "#3e3e44", "#d4533c"),
    furniture: [f("lamppost", 0.15, 0.4, 0.3), f("car", 0.36, 0.52, 0.26), f("car", 0.74, 0.52, 0.26), f("fence", 0.5, 0.32, 0.2), f("building", 0.9, 0.28, 0.28)],
    surface: [{ x: 0.5, y: 0.56, label: "capó" }] },
  { id: "departamento", name: "Departamento", interior: true, genres: ["Thriller", "Romance", "Comedia", "Drama", "Noir"], tags: ["home", "intimate", "secret"], keywords: ["departamento", "apartamento", "vigilancia", "ventana", "cama", "dormitorio"],
    palette: P("#6a6068", "#584e56", "#8a7058", "#6e5844", "#e8a0a0"),
    furniture: [f("window", 0.18, 0.2, 0.24), f("curtain", 0.34, 0.2, 0.2), f("bed", 0.62, 0.46, 0.26), f("lamp", 0.86, 0.4, 0.18), f("shelf", 0.08, 0.42, 0.22), f("desk", 0.4, 0.52, 0.14)],
    surface: [{ x: 0.4, y: 0.5, label: "escritorio" }] },
  { id: "cocina", name: "Cocina", interior: true, genres: ["Comedia", "Drama", "Romance", "Terror"], tags: ["home", "work"], keywords: ["cocina", "cocinar", "comida", "receta", "desayuno", "horno"],
    palette: P("#c8b898", "#b0a07e", "#8a7a68", "#70624e", "#d4533c"),
    furniture: [f("window", 0.6, 0.2, 0.2), f("fridge", 0.1, 0.36, 0.28), f("counter", 0.34, 0.42, 0.26), f("table", 0.72, 0.52, 0.16), f("shelf", 0.45, 0.16, 0.12), f("plant", 0.93, 0.5, 0.14)],
    surface: [{ x: 0.72, y: 0.5, label: "mesa" }, { x: 0.34, y: 0.42, label: "mesada" }] },
  { id: "tienda", name: "Tienda", interior: true, genres: ["Comedia", "Drama", "Romance", "Western"], tags: ["public", "work"], keywords: ["tienda", "mercado", "compras", "súper", "negocio", "mostrador"],
    palette: P("#b8c4d0", "#9aa8b6", "#c0b8a8", "#a49c8c", "#e2b340"),
    furniture: [f("shelf", 0.14, 0.34, 0.3), f("shelf", 0.4, 0.34, 0.3), f("counter", 0.78, 0.42, 0.26), f("balloon", 0.62, 0.2, 0.1), f("crate", 0.55, 0.54, 0.1), f("neon", 0.88, 0.16, 0.1)],
    surface: [{ x: 0.78, y: 0.42, label: "mostrador" }] },
  { id: "plaza", name: "Plaza del pueblo", interior: false, genres: ["Comedia", "Romance", "Drama", "Fantasía", "Western", "Aventura"], tags: ["public", "nature", "climax"], keywords: ["plaza", "parque", "paseo", "fiesta", "pueblo", "banco"],
    palette: P("#8ac0e0", "#6aa6cc", "#7aaa5a", "#689648", "#f0a0b0"),
    furniture: [f("tree", 0.14, 0.32, 0.34), f("lamppost", 0.34, 0.4, 0.28), f("bench", 0.5, 0.5, 0.18), f("tree", 0.78, 0.32, 0.34), f("balloon", 0.64, 0.24, 0.1), f("fence", 0.92, 0.46, 0.14)],
    surface: [{ x: 0.5, y: 0.5, label: "banco" }] },
  { id: "playa", name: "Playa al borde del mar", interior: false, genres: ["Romance", "Drama", "Ciencia ficción", "Fantasía", "Aventura"], tags: ["nature", "intimate", "climax"], keywords: ["playa", "mar", "arena", "olas", "océano", "orilla"],
    palette: P("#7ac0e8", "#5aa6d8", "#e0c890", "#c8ae78", "#f0a050"),
    furniture: [f("wave", 0.5, 0.36, 0.5), f("tree", 0.9, 0.34, 0.3), f("crate", 0.18, 0.56, 0.1), f("star", 0.3, 0.12, 0.05), f("lamppost", 0.08, 0.42, 0.26)],
    surface: [{ x: 0.18, y: 0.56, label: "cajón" }] },
  { id: "terraza", name: "Terraza", interior: false, genres: ["Romance", "Drama", "Thriller", "Noir", "Fantasía", "Aventura"], tags: ["intimate", "climax", "home"], keywords: ["terraza", "balcón", "azotea", "ciudad", "atardecer", "baranda"],
    palette: P("#c88868", "#a86a58", "#7a6a60", "#665850", "#f0b870"),
    furniture: [f("building", 0.2, 0.26, 0.3), f("building", 0.7, 0.24, 0.34), f("fence", 0.5, 0.44, 0.3), f("table", 0.34, 0.54, 0.12), f("plant", 0.9, 0.5, 0.16), f("lamp", 0.1, 0.5, 0.16)],
    surface: [{ x: 0.34, y: 0.52, label: "mesa" }] },
  { id: "restaurante", name: "Restaurante", interior: true, genres: ["Romance", "Comedia", "Drama", "Noir"], tags: ["public", "intimate"], keywords: ["restaurante", "cena", "vino", "mesero", "comer"],
    palette: P("#5a2e34", "#4a2428", "#6a4a38", "#58392a", "#e8b86a"),
    furniture: [f("curtain", 0.15, 0.2, 0.22), f("painting", 0.4, 0.18, 0.12), f("curtain", 0.82, 0.2, 0.22), f("table", 0.3, 0.52, 0.14), f("table", 0.7, 0.52, 0.14), f("lamp", 0.5, 0.2, 0.14)],
    surface: [{ x: 0.3, y: 0.5, label: "mesa" }, { x: 0.7, y: 0.5, label: "mesa" }] },
  { id: "casona", name: "Casona abandonada", interior: true, genres: ["Terror", "Thriller", "Drama", "Fantasía", "Western", "Aventura"], tags: ["home", "secret", "climax"], keywords: ["casona", "mansión", "abandonada", "fantasma", "escalera", "polvo"],
    palette: P("#3a3438", "#2c2630", "#4e4036", "#3c3028", "#8a2e34"),
    furniture: [f("window", 0.2, 0.2, 0.24), f("cobweb", 0.05, 0.1, 0.1), f("fireplace", 0.5, 0.36, 0.26), f("painting", 0.74, 0.2, 0.14), f("sofa", 0.84, 0.48, 0.18), f("shelf", 0.08, 0.42, 0.24), f("lamp", 0.34, 0.48, 0.14)],
    surface: [{ x: 0.5, y: 0.5, label: "repisa" }] },
  { id: "bosque", name: "Bosque oscuro", interior: false, genres: ["Terror", "Drama", "Thriller", "Fantasía", "Aventura"], tags: ["nature", "secret", "street"], keywords: ["bosque", "árboles", "campamento", "sendero", "montaña", "huella"],
    palette: P("#1e2e28", "#16221e", "#2a3a28", "#223022", "#a8e0a0"),
    furniture: [f("tree", 0.1, 0.3, 0.4), f("tree", 0.3, 0.32, 0.36), f("tree", 0.62, 0.3, 0.4), f("tree", 0.88, 0.32, 0.38), f("crate", 0.5, 0.54, 0.08), f("fence", 0.45, 0.4, 0.16)],
    surface: [{ x: 0.5, y: 0.54, label: "tronco" }] },
  { id: "sotano", name: "Sótano", interior: true, genres: ["Terror", "Thriller", "Ciencia ficción", "Fantasía", "Aventura"], tags: ["secret", "climax"], keywords: ["sótano", "bodega", "escondite", "trampilla", "subsuelo"],
    palette: P("#34322e", "#26241f", "#44403a", "#38342e", "#d4533c"),
    furniture: [f("crate", 0.12, 0.46, 0.14), f("shelf", 0.32, 0.34, 0.26), f("lamp", 0.5, 0.14, 0.16), f("crate", 0.7, 0.5, 0.12), f("cobweb", 0.9, 0.1, 0.1), f("desk", 0.82, 0.5, 0.14)],
    surface: [{ x: 0.82, y: 0.48, label: "mesa" }] },
  { id: "cementerio", name: "Cementerio", interior: false, genres: ["Terror", "Drama", "Fantasía", "Western"], tags: ["nature", "climax", "intimate"], keywords: ["cementerio", "tumba", "funeral", "cruz", "luto"],
    palette: P("#242a38", "#1a1f2c", "#2c3a2c", "#243024", "#c0c8d8"),
    furniture: [f("fence", 0.2, 0.34, 0.3), f("tomb", 0.3, 0.5, 0.16), f("tomb", 0.55, 0.46, 0.18), f("tree", 0.82, 0.3, 0.38), f("tomb", 0.7, 0.54, 0.14), f("lamppost", 0.08, 0.42, 0.24)],
    surface: [{ x: 0.55, y: 0.46, label: "lápida" }] },
  { id: "puente", name: "Puente de mando", interior: true, genres: ["Ciencia ficción"], tags: ["work", "climax", "public"], keywords: ["nave", "puente", "mando", "capitán", "órbita", "cabina"],
    palette: P("#1e2a40", "#16203a", "#2c3650", "#242c44", "#4ae0f0"),
    furniture: [f("window", 0.5, 0.2, 0.5), f("star", 0.3, 0.14, 0.05), f("console", 0.22, 0.5, 0.2), f("console", 0.5, 0.52, 0.2), f("console", 0.78, 0.5, 0.2), f("neon", 0.08, 0.3, 0.1)],
    surface: [{ x: 0.5, y: 0.5, label: "consola" }] },
  { id: "laboratorio", name: "Laboratorio", interior: true, genres: ["Ciencia ficción", "Thriller", "Terror"], tags: ["work", "secret", "intimate"], keywords: ["laboratorio", "experimento", "muestra", "cápsula", "investigación", "ciencia"],
    palette: P("#c8d4dc", "#aebcc6", "#9aa8b0", "#86949c", "#4ae0b0"),
    furniture: [f("capsule", 0.16, 0.34, 0.3), f("console", 0.4, 0.5, 0.18), f("tv", 0.6, 0.18, 0.14), f("capsule", 0.82, 0.34, 0.3), f("desk", 0.6, 0.52, 0.16), f("neon", 0.5, 0.1, 0.08)],
    surface: [{ x: 0.4, y: 0.5, label: "consola" }, { x: 0.6, y: 0.5, label: "mesa" }] },
  { id: "ciudad-neon", name: "Ciudad de neón", interior: false, genres: ["Ciencia ficción", "Thriller"], tags: ["street", "public", "climax"], keywords: ["neón", "ciudad", "futuro", "rascacielos", "cyber", "avenida"],
    palette: P("#14102a", "#0e0a20", "#262236", "#1c1a2c", "#ff4ad0"),
    furniture: [f("building", 0.1, 0.24, 0.38), f("building", 0.34, 0.2, 0.42), f("neon", 0.5, 0.26, 0.12), f("building", 0.7, 0.22, 0.4), f("lamppost", 0.9, 0.4, 0.28), f("car", 0.5, 0.56, 0.2)],
    surface: [{ x: 0.5, y: 0.56, label: "vehículo" }] },
  { id: "desierto", name: "Planeta desierto", interior: false, genres: ["Ciencia ficción", "Western", "Aventura"], tags: ["nature", "street", "secret"], keywords: ["planeta", "desierto", "dunas", "exploración", "marte", "ruinas"],
    palette: P("#d09a68", "#b87c50", "#c8905c", "#b07a48", "#4ae0f0"),
    furniture: [f("star", 0.2, 0.1, 0.06), f("star", 0.7, 0.14, 0.05), f("capsule", 0.2, 0.42, 0.22), f("crate", 0.55, 0.54, 0.1), f("tomb", 0.82, 0.46, 0.16)],
    surface: [{ x: 0.55, y: 0.54, label: "caja" }] },
];

export const locationById = (id: string) => LOCATIONS.find((l) => l.id === id) ?? LOCATIONS[0]!;
export const locationsFor = (genre: Genre) => LOCATIONS.filter((l) => l.genres.includes(genre));

/* ---------- utilería ---------- */
export type PropDef = { id: string; label: string; icon: string; persistent: boolean };
export const PROPS: PropDef[] = [
  { id: "taza", label: "Taza", icon: "☕", persistent: false },
  { id: "sobre", label: "Sobre sellado", icon: "✉️", persistent: true },
  { id: "llave", label: "Llave vieja", icon: "🔑", persistent: true },
  { id: "maleta", label: "Maleta", icon: "🧳", persistent: true },
  { id: "telefono", label: "Teléfono", icon: "📱", persistent: true },
  { id: "foto", label: "Fotografía", icon: "🖼️", persistent: true },
  { id: "linterna", label: "Linterna", icon: "🔦", persistent: false },
  { id: "libro", label: "Libro", icon: "📖", persistent: false },
  { id: "flores", label: "Flores", icon: "💐", persistent: false },
  { id: "paraguas", label: "Paraguas", icon: "☂️", persistent: false },
];
export const propById = (id: string) => PROPS.find((p) => p.id === id);

/* ---------- guion de 15 escenas ---------- */
export type ScriptScene = {
  n: number; day: number; title: string; text: string; tags: Tag[]; time: TimeOfDay; weather: Weather; props: string[];
};
const ARC: Omit<ScriptScene, "n" | "weather">[] = [
  { day: 1, title: "Apertura", text: "Una mañana cualquiera. Todo parece en orden, pero algo no encaja.", tags: ["home", "public"], time: "amanecer", props: ["taza"] },
  { day: 1, title: "El conflicto", text: "Llega la noticia que cambia el plan de trabajo.", tags: ["work"], time: "día", props: ["telefono"] },
  { day: 1, title: "El encuentro", text: "Dos personajes se cruzan en un lugar público y se reconocen.", tags: ["public"], time: "tarde", props: ["libro"] },
  { day: 1, title: "La primera pista", text: "Alguien deja un sobre sellado sin remitente.", tags: ["secret", "work"], time: "noche", props: ["sobre"] },
  { day: 2, title: "Complicación", text: "Hay que salir de aquí antes de que alguien note la ausencia.", tags: ["street"], time: "día", props: ["maleta"] },
  { day: 2, title: "La confesión", text: "En voz baja, el protagonista admite lo que sabe del sobre.", tags: ["intimate", "home"], time: "tarde", props: ["sobre", "foto"] },
  { day: 2, title: "Punto medio", text: "Una celebración se interrumpe: la verdad empieza a notarse.", tags: ["public"], time: "tarde", props: ["flores"] },
  { day: 2, title: "El giro", text: "El aliado resulta tener la otra llave.", tags: ["secret"], time: "noche", props: ["llave", "linterna"] },
  { day: 3, title: "La persecución", text: "Corren bajo el cielo cerrado; nadie puede detenerse.", tags: ["street"], time: "noche", props: ["linterna", "paraguas"] },
  { day: 3, title: "El refugio", text: "Empapados, encuentran dónde pasar la noche.", tags: ["home", "intimate"], time: "noche", props: ["taza"] },
  { day: 3, title: "La revelación", text: "Se abre el sobre. La verdad pesa más de lo esperado.", tags: ["work", "secret"], time: "amanecer", props: ["sobre", "llave"] },
  { day: 3, title: "La confrontación", text: "Todos en un mismo lugar, cada uno con su versión.", tags: ["public"], time: "día", props: ["telefono"] },
  { day: 3, title: "El clímax", text: "Se decide el destino de todos. No hay vuelta atrás.", tags: ["climax"], time: "tarde", props: ["llave"] },
  { day: 3, title: "Consecuencias", text: "El silencio después. Cada uno hace su balance.", tags: ["intimate"], time: "noche", props: ["foto"] },
  { day: 4, title: "Epílogo", text: "Un nuevo día. Lo que cambió, cambió para siempre.", tags: ["nature", "public"], time: "amanecer", props: ["flores", "maleta"] },
];

function weatherFor(genre: Genre, n: number, time: TimeOfDay): Weather {
  if (n === 9 || n === 10) return genre === "Comedia" ? "nublado" : "lluvia";
  if (genre === "Terror" || genre === "Fantasía") return time === "noche" ? "niebla" : "nublado";
  if (genre === "Noir" && time === "noche") return n % 2 ? "lluvia" : "niebla";
  if (genre === "Western" || genre === "Aventura") return "despejado";
  if (genre === "Comedia") return "despejado";
  if (genre === "Drama" && n % 5 === 3) return "nublado";
  if (genre === "Thriller" && time === "noche" && n % 2 === 0) return "lluvia";
  if (genre === "Romance" && n === 14) return "nieve";
  if (genre === "Ciencia ficción") return time === "noche" ? "niebla" : "despejado";
  return "despejado";
}

function scoreLocation(l: Location, genre: Genre, tags: Tag[], text: string, recent: string[]) {
  if (!l.genres.includes(genre)) return -99;
  const low = text.toLowerCase();
  let s = tags.reduce((a, t) => a + (l.tags.includes(t) ? 2 : 0), 0);
  s += l.keywords.reduce((a, k) => a + (low.includes(k) ? 4 : 0), 0);
  if (l.id === "estudio") s -= 3;
  const idx = recent.lastIndexOf(l.id);
  if (idx >= 0) s -= 6 - Math.min(5, recent.length - 1 - idx);
  return s;
}

/** Elige localización según el guion (tags + palabras clave) evitando repetir. */
export function chooseLocation(genre: Genre, tags: Tag[], text: string, recent: string[], salt = 0): Location {
  const pool = LOCATIONS.map((l, i) => ({ l, s: scoreLocation(l, genre, tags, text, recent) + ((i * 7 + salt * 3) % 5) * 0.1 }));
  pool.sort((a, b) => b.s - a.s);
  return pool[0]!.l;
}

export type PlannedScene = ScriptScene & { locationId: string };
export function planFilm(genre: Genre, count = 15): PlannedScene[] {
  const recent: string[] = [];
  return ARC.slice(0, count).map((a, i) => {
    const n = i + 1;
    const weather = weatherFor(genre, n, a.time);
    const loc = chooseLocation(genre, a.tags, `${a.title} ${a.text}`, recent, n);
    recent.push(loc.id);
    return { ...a, n, weather, locationId: loc.id };
  });
}

/** Un guionista escribe una línea y el motor elige el escenario / hora / clima. */
export function interpretScript(text: string, genre: Genre, recent: string[]): { location: Location; time?: TimeOfDay; weather?: Weather } {
  const low = text.toLowerCase();
  const time: TimeOfDay | undefined = /amanec|madrugada|alba/.test(low) ? "amanecer" : /noche|oscur|medianoche/.test(low) ? "noche" : /atardec|tarde/.test(low) ? "tarde" : /mediod|mañana|día\b/.test(low) ? "día" : undefined;
  const weather: Weather | undefined = /llueve|lluvia|tormenta|mojad/.test(low) ? "lluvia" : /niebla|bruma/.test(low) ? "niebla" : /nieve|nevad/.test(low) ? "nieve" : /nublad|gris/.test(low) ? "nublado" : /sol\b|soleado|despejad/.test(low) ? "despejado" : undefined;
  const explicit = LOCATIONS.find((l) => l.id !== "estudio" && l.keywords.some((k) => low.includes(k)));
  const location = explicit ?? chooseLocation(genre, [], text, recent);
  return { location, time, weather };
}

/* ---------- puesta en escena ---------- */
export type DressedItem = Furn & { id: string };
export type Dressing = { items: DressedItem[]; props: { id: string; x: number; y: number; icon: string; label: string }[] };

/** Coloca muebles y objetos automáticamente según localización, género y semilla. */
export function dressSet(loc: Location, genre: Genre, propIds: string[], seed: number): Dressing {
  const mirror = seed % 2 === 1;
  const jitter = (i: number) => (((seed * 31 + i * 17) % 7) - 3) * 0.006;
  const items: DressedItem[] = loc.furniture.map((fu, i) => ({
    ...fu, id: `${loc.id}-${i}`, x: Math.min(0.95, Math.max(0.05, (mirror ? 1 - fu.x : fu.x) + jitter(i))), y: fu.y,
  }));
  if (loc.interior && loc.id !== "estudio") {
    if (genre === "Terror" && !items.some((i) => i.k === "cobweb")) items.push({ k: "cobweb", x: mirror ? 0.95 : 0.05, y: 0.1, s: 0.1, id: `${loc.id}-web` });
    if (genre === "Comedia") items.push({ k: "balloon", x: mirror ? 0.2 : 0.8, y: 0.2, s: 0.09, id: `${loc.id}-bal` });
    if (genre === "Ciencia ficción") items.push({ k: "neon", x: mirror ? 0.9 : 0.1, y: 0.12, s: 0.07, id: `${loc.id}-neon` });
  }
  const props: Dressing["props"] = [];
  propIds.forEach((pid, i) => {
    const def = propById(pid);
    if (!def) return;
    const sf = loc.surface[i % loc.surface.length] ?? { x: 0.5, y: 0.5 };
    const x = Math.min(0.94, Math.max(0.06, (mirror ? 1 - sf.x : sf.x) + (Math.floor(i / loc.surface.length) - 0.5 * 0) * 0.035));
    props.push({ id: pid, x, y: sf.y - 0.05, icon: def.icon, label: def.label });
  });
  return { items, props };
}

/* ---------- iluminación ---------- */
export type Lighting = { tint: string; alpha: number; sky: [string, string]; lamps: number; label: string };
export function lightingFor(time: TimeOfDay, weather: Weather): Lighting {
  const base: Record<TimeOfDay, Lighting> = {
    amanecer: { tint: "#ffb27a", alpha: 0.16, sky: ["#ffcf9a", "#8ab0d8"], lamps: 0.2, label: "Luz dorada baja" },
    día: { tint: "#ffffff", alpha: 0, sky: ["#a8d4f4", "#d8ecfa"], lamps: 0, label: "Luz plena" },
    tarde: { tint: "#ff9a4a", alpha: 0.14, sky: ["#f0a870", "#c87890"], lamps: 0.35, label: "Luz cálida de tarde" },
    noche: { tint: "#0a1440", alpha: 0.5, sky: ["#0a1030", "#1c2450"], lamps: 1, label: "Noche, lámparas encendidas" },
  };
  const l = { ...base[time] };
  if (weather === "nublado") { l.tint = "#6a7280"; l.alpha = Math.min(0.6, l.alpha + 0.16); l.sky = ["#8a929c", "#aab2ba"]; l.lamps = Math.min(1, l.lamps + 0.2); l.label += " · cielo cubierto"; }
  if (weather === "lluvia") { l.tint = "#2a3a5a"; l.alpha = Math.min(0.65, l.alpha + 0.24); l.sky = ["#505a68", "#6a7482"]; l.lamps = Math.min(1, l.lamps + 0.4); l.label += " · lluvia"; }
  if (weather === "niebla") { l.tint = "#c8d0d8"; l.alpha = Math.min(0.5, l.alpha + 0.2); l.sky = ["#9aa4ae", "#b8c0c8"]; l.lamps = Math.min(1, l.lamps + 0.3); l.label += " · niebla"; }
  if (weather === "nieve") { l.tint = "#dce8f8"; l.alpha = Math.min(0.45, l.alpha + 0.14); l.sky = ["#c0cada", "#dce4ee"]; l.label += " · nieve"; }
  return l;
}

/* ---------- continuidad ---------- */
export type CastContinuity = { name: string; wet: boolean; costume: string };
export type Continuity = {
  props: { id: string; since: number }[];
  cast: CastContinuity[];
  day: number; time: TimeOfDay; lastWeather: Weather; lastExterior: boolean;
  warnings: string[];
};
const CAST = ["Nina", "Rey"];
const COSTUMES: Record<Genre, string[]> = {
  Drama: ["Abrigo gris", "Camisa clara"], Thriller: ["Gabardina negra", "Saco oscuro"], Comedia: ["Camiseta colorida", "Delantal"],
  Terror: ["Camisón gastado", "Campera vieja"], Romance: ["Vestido rojo", "Traje azul"], "Ciencia ficción": ["Mono plateado", "Casco y chaqueta"],
  Noir: ["Gabardina beige", "Sombrero y traje"], Fantasía: ["Capa bordada", "Túnica larga"], Western: ["Poncho y sombrero", "Chaleco de cuero"], Aventura: ["Ropa de expedición", "Chaleco de explorador"],
};
export function initialContinuity(genre: Genre): Continuity {
  return { props: [], cast: CAST.map((name, i) => ({ name, wet: false, costume: COSTUMES[genre][i % 2]! })), day: 1, time: "amanecer", lastWeather: "despejado", lastExterior: false, warnings: [] };
}

/** Aplica una escena a la continuidad: arrastra utilería persistente, avisa de saltos. */
export function applyContinuity(prev: Continuity, genre: Genre, scene: { n: number; day: number; time: TimeOfDay; weather: Weather; props: string[] }, loc: Location): { cont: Continuity; props: string[] } {
  const warnings: string[] = [];
  const keep = prev.props.filter((p) => propById(p.id)?.persistent && !scene.props.includes(p.id));
  const propIds = [...scene.props];
  for (const k of keep) { propIds.push(k.id); warnings.push(`${propById(k.id)?.label ?? k.id} se mantiene en escena (utilería persistente).`); }
  if (scene.weather === "lluvia" && !loc.interior) {
    if (!propIds.includes("paraguas") && genre !== "Ciencia ficción") propIds.push("paraguas");
  } else if (scene.weather !== "lluvia") {
    const i = propIds.indexOf("paraguas"); if (i >= 0 && loc.interior) propIds.splice(i, 1);
  }
  const rainedOutside = prev.lastWeather === "lluvia" && prev.lastExterior;
  const sameDay = scene.day === prev.day;
  const cast = prev.cast.map((c) => {
    const wet = (scene.weather === "lluvia" && !loc.interior) || (c.wet && rainedOutside && sameDay && loc.interior && scene.time === "noche");
    if (wet && !c.wet) warnings.push(`${c.name} se moja: mantener cabello y ropa húmedos en la siguiente escena.`);
    if (!wet && c.wet) warnings.push(`${c.name} ya está seco: confirmar que pasó tiempo suficiente.`);
    const costume = sameDay ? c.costume : COSTUMES[genre][(CAST.indexOf(c.name) + scene.day) % 2]!;
    if (costume !== c.costume) warnings.push(`${c.name} cambia de vestuario (nuevo día): ${costume}.`);
    return { ...c, wet, costume };
  });
  if (sameDay && TIMES.indexOf(scene.time) < TIMES.indexOf(prev.time)) warnings.push(`Salto temporal: la hora retrocede de ${prev.time} a ${scene.time} el mismo día.`);
  const cont: Continuity = {
    props: propIds.map((id) => ({ id, since: prev.props.find((p) => p.id === id)?.since ?? scene.n })),
    cast, day: scene.day, time: scene.time, lastWeather: scene.weather, lastExterior: !loc.interior, warnings,
  };
  return { cont, props: propIds };
}
