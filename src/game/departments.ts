import type { CrewId } from "@/game/crew";

/** Departamentos: cada rol afecta la toma de una forma distinta y tiene sus propias órdenes. */
export type OrderEffect = {
  quality?: number; stress?: number; time?: number; hype?: number;
  boost?: { key: BoostKey; seconds: number };
  arm?: "review"; // utilería de montaje: bonus en la próxima toma
  gamble?: boolean;
};
export type BoostKey = "focus" | "lights" | "silence" | "rehearse" | "rewrite" | "look";
export type OrderDef = { id: string; label: string; icon: string; hint: string; cooldown: number; say: string; effect: OrderEffect };
export type DeptDef = { id: CrewId; name: string; channel: string; offline: string; remote?: boolean; orders: [OrderDef, OrderDef] };

export const DEPARTMENTS: DeptDef[] = [
  { id: "director", name: "Dirección", channel: "Orden", offline: "Sin director las órdenes pierden fuerza.", orders: [
    { id: "plano", label: "Dirigir plano", icon: "🎬", hint: "+calidad ahora", cooldown: 20, say: "¡Un plano limpio, todos conmigo!", effect: { quality: 6, stress: 3 } },
    { id: "arenga", label: "Arenga", icon: "📣", hint: "−estrés", cooldown: 25, say: "Respiren. Lo estamos haciendo bien.", effect: { stress: -10 } },
  ] },
  { id: "guion", name: "Guion", channel: "Claridad", offline: "Sin guion el equipo se confunde: sube el estrés.", remote: true, orders: [
    { id: "dialogo", label: "Reescribir diálogo", icon: "✍️", hint: "+calidad, calma 12s", cooldown: 22, say: "Recorto el parlamento: menos texto, más actuación.", effect: { quality: 4, boost: { key: "rewrite", seconds: 12 } } },
    { id: "tono", label: "Ajuste de tono", icon: "🎭", hint: "−estrés, +calidad", cooldown: 18, say: "Bajamos el tono. Todo más contenido.", effect: { quality: 2, stress: -6 } },
  ] },
  { id: "camara", name: "Cámara", channel: "Imagen", offline: "Sin operador la imagen sale fuera de foco: baja la calidad.", orders: [
    { id: "enfocar", label: "Enfocar", icon: "🎯", hint: "Imagen +20s", cooldown: 30, say: "Foco fino. Esto va a verse bien.", effect: { boost: { key: "focus", seconds: 20 } } },
    { id: "encuadre", label: "Cambiar encuadre", icon: "🔲", hint: "+calidad, +estrés", cooldown: 15, say: "Cierro el plano. Más cerca de la cara.", effect: { quality: 3, stress: 2 } },
  ] },
  { id: "luz", name: "Luces", channel: "Luz", offline: "Sin luces la escena se oscurece (más grave de noche o con lluvia).", orders: [
    { id: "luces", label: "Ajustar luces", icon: "💡", hint: "Luz +20s", cooldown: 30, say: "Subo la key y abro un relleno.", effect: { boost: { key: "lights", seconds: 20 } } },
    { id: "reflector", label: "Reflector", icon: "🔆", hint: "+calidad (más si está oscuro)", cooldown: 18, say: "Reflector en posición.", effect: { quality: 2 } },
  ] },
  { id: "sonido", name: "Sonido", channel: "Audio", offline: "Sin sonidista aumentan las crisis de ruido.", orders: [
    { id: "silencio", label: "Silencio en el set", icon: "🤫", hint: "Sin crisis 25s", cooldown: 35, say: "¡Silencio en el set, por favor!", effect: { boost: { key: "silence", seconds: 25 } } },
    { id: "ambiente", label: "Sonido ambiente", icon: "🎧", hint: "+calidad", cooldown: 16, say: "Grabo ambiente para tener colchón.", effect: { quality: 3 } },
  ] },
  { id: "montaje", name: "Montaje", channel: "Posproducción", offline: "Sin montajista la toma pierde el bonus de edición.", orders: [
    { id: "revisar", label: "Revisar cinta", icon: "🎞️", hint: "+6 a la próxima toma", cooldown: 40, say: "Reviso la cinta anterior para el empalme.", effect: { arm: "review" } },
    { id: "corte", label: "Corte rápido", icon: "✂️", hint: "−estrés, +calidad", cooldown: 14, say: "Marco un corte rápido y sigo.", effect: { quality: 1, stress: -5 } },
  ] },
  { id: "produccion", name: "Producción", channel: "Tiempo", offline: "Sin producción el reloj corre más rápido.", orders: [
    { id: "tiempo", label: "Pedir tiempo", icon: "⏱️", hint: "+12s, +estrés", cooldown: 40, say: "Negocio doce segundos más con el set.", effect: { time: 12, stress: 2 } },
    { id: "cafe", label: "Pausa de café", icon: "☕", hint: "−estrés", cooldown: 25, say: "Café para todos. Cinco minutos.", effect: { stress: -8 } },
  ] },
  { id: "actores", name: "Reparto", channel: "Actuación", offline: "Sin actores no hay escena: baja mucho la calidad.", orders: [
    { id: "ensayo", label: "Ensayo", icon: "🎭", hint: "Actuación +18s", cooldown: 28, say: "Un ensayo rápido y vamos.", effect: { boost: { key: "rehearse", seconds: 18 } } },
    { id: "improvisar", label: "Improvisar", icon: "🎲", hint: "Riesgo / recompensa", cooldown: 22, say: "Probemos algo distinto…", effect: { gamble: true } },
  ] },
  { id: "maquillaje", name: "Maquillaje", channel: "Continuidad", offline: "Sin maquillaje sube el estrés y baja un poco la calidad.", orders: [
    { id: "retoque", label: "Retoque", icon: "💄", hint: "−estrés, +calidad", cooldown: 16, say: "Retoque rápido antes de rodar.", effect: { quality: 2, stress: -6 } },
    { id: "look", label: "Cuidar el look", icon: "🪞", hint: "Calidad +20s", cooldown: 26, say: "Reviso peinado y vestuario: continuidad.", effect: { boost: { key: "look", seconds: 20 } } },
  ] },
  { id: "marketing", name: "Marketing", channel: "Hype", offline: "Sin marketing el hype no crece.", remote: true, orders: [
    { id: "foto", label: "Foto de set", icon: "📸", hint: "+15 hype", cooldown: 30, say: "Foto del set para redes. ¡Sonrían!", effect: { hype: 15 } },
    { id: "teaser", label: "Teaser", icon: "🎥", hint: "+10 hype", cooldown: 20, say: "Armo un teaser de 10 segundos.", effect: { hype: 10 } },
  ] },
];

export const deptOf = (id: CrewId) => DEPARTMENTS.find((d) => d.id === id)!;

export type DeptStatus = "ok" | "weak" | "out" | "boost";
export type DeptView = {
  id: CrewId; name: string; channel: string; efficiency: number; status: DeptStatus; effect: string;
  orders: { id: string; label: string; icon: string; hint: string; cooldownLeft: number; ready: boolean }[];
};

export type Effects = { qualityRate: number; stressRate: number; timeDrain: number; crisisMult: number; editorBonus: number; effect: Partial<Record<CrewId, string>>; alerts: string[] };

const gap = (e: number) => 1 - Math.min(1, e / 0.6); // 0 = bien, 1 = fuera

/** Efecto continuo de cada departamento durante el rodaje. `eff` va de 0 a 1. */
export function computeEffects(eff: Record<CrewId, number>, boosts: Partial<Record<BoostKey, number>>, darkness: number): Effects {
  const r: Effects = { qualityRate: 0, stressRate: 0, timeDrain: 0, crisisMult: 1, editorBonus: Math.round(8 * eff.montaje), effect: {}, alerts: [] };
  const on = (k: BoostKey) => (boosts[k] ?? 0) > 0;
  const note = (id: CrewId, text: string, alert?: string) => { r.effect[id] = text; if (alert) r.alerts.push(alert); };

  const cam = gap(eff.camara); r.qualityRate -= 0.45 * cam;
  if (on("focus")) { r.qualityRate += 0.35 * eff.camara; note("camara", "Enfocando: imagen nítida", ""); }
  else if (cam > 0.15) note("camara", `Fuera de foco: −${(0.45 * cam).toFixed(2)} calidad/s`, "Cámara sin operador");
  else note("camara", "Imagen estable");

  const lg = gap(eff.luz); const dk = 0.15 + 0.5 * darkness; r.qualityRate -= dk * lg;
  if (on("lights")) { r.qualityRate += (0.25 + 0.35 * darkness) * eff.luz; note("luz", "Luces reforzadas", ""); }
  else if (lg > 0.15) note("luz", `Escena oscura: −${(dk * lg).toFixed(2)} calidad/s`, "Luces fuera de puesto");
  else note("luz", darkness > 0.3 ? "Iluminando una escena oscura" : "Luz correcta");

  const sg = gap(eff.sonido);
  if (on("silence")) { r.crisisMult = 0; note("sonido", "Set en silencio: sin crisis", ""); }
  else if (sg > 0.15) { r.crisisMult *= 1 + 2 * sg; r.stressRate += 0.25 * sg; note("sonido", "Entra ruido: más crisis y estrés", "Sonido sin cubrir"); }
  else note("sonido", "Audio limpio");

  const ag = gap(eff.actores); r.qualityRate -= 0.5 * ag;
  if (on("rehearse")) { r.qualityRate += 0.3 * eff.actores; note("actores", "Ensayado: actuación segura", ""); }
  else if (ag > 0.15) note("actores", "Sin actores no hay escena", "Reparto fuera de marca");
  else note("actores", "Actuación en marcha");

  const mg = gap(eff.maquillaje); r.stressRate += 0.12 * mg; r.qualityRate -= 0.15 * mg;
  if (on("look")) { r.qualityRate += 0.15 * eff.maquillaje; note("maquillaje", "Look cuidado", ""); }
  else if (mg > 0.15) note("maquillaje", "Continuidad descuidada", "Maquillaje sin cubrir");
  else note("maquillaje", "Continuidad al día");

  const gg = gap(eff.guion); r.stressRate += 0.2 * gg;
  if (on("rewrite")) { r.stressRate -= 0.25; note("guion", "Diálogo reescrito: equipo tranquilo", ""); }
  else if (gg > 0.15) note("guion", "Equipo confundido: +estrés", "Guion sin atender");
  else note("guion", "Guion claro");

  const pg = gap(eff.produccion); r.timeDrain = 0.6 * pg;
  if (pg > 0.15) note("produccion", "El reloj corre más rápido", "Producción sin cubrir");
  else note("produccion", "Cronograma bajo control");

  note("montaje", eff.montaje > 0.5 ? `Bonus de edición +${r.editorBonus}` : "Sin bonus de edición");
  note("director", eff.director > 0.5 ? "Dirige con autoridad" : "Órdenes debilitadas", eff.director > 0.5 ? "" : "Dirección ausente");
  note("marketing", eff.marketing > 0.5 ? "Hype en crecimiento" : "Sin campaña activa");
  return r;
}
