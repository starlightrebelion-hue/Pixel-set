/**
 * Agente real: Dirección de estudio / Marketing.
 * Hoy corre con lógica de mercado + catálogo de temáticas.
 * Mañana: setStudioAiRunner(...) y el mismo contrato alimenta un LLM.
 */

import {
  getStudioAiRunner,
  type AgentContext,
  type AgentMessage,
  type AgentRunResult,
  type StudioAgent,
  type ThemeBrief,
} from "@/game/agents/types";

export const MARKETING_AGENT_ID = "studio-marketing";

const THEME_CATALOG: ThemeBrief[] = [
  {
    id: "betrayal-intimate",
    title: "Traición íntima",
    genre: "Drama",
    audience: "Adultos 25–45",
    tone: "Contenido, realista",
    why: "Los dramas de pareja con secreto siguen performando en festivales y SVOD.",
    risk: "Si el giro se ve venir, cae el boca a boca.",
    opportunity: "Bajo costo de locaciones; fuerte en actuación.",
    ceoLine: "El CEO quiere algo que se pueda vender como ‘relación rota’ sin blockbuster.",
    priority: 5,
    tags: ["drama", "pareja", "secreto", "bajo-presupuesto"],
  },
  {
    id: "heist-small",
    title: "Golpe chico",
    genre: "Thriller",
    audience: "Jóvenes-adultos 18–35",
    tone: "Tenso, ágil",
    why: "Thriller de escala contenida: buen tráiler, buen retenido.",
    risk: "Necesita un set piece claro; si no hay, se siente TV genérica.",
    opportunity: "Marketing fácil (un objeto, un reloj, una noche).",
    ceoLine: "Marketing pide un logline de 8 palabras y un póster con un objeto.",
    priority: 4,
    tags: ["thriller", "robo", "noche", "marketing-fuerte"],
  },
  {
    id: "comedy-work",
    title: "Oficina al límite",
    genre: "Comedia",
    audience: "Amplio 20–50",
    tone: "Ácido, coral",
    why: "Comedia laboral exporta bien y permite sketches para redes.",
    risk: "Sin un conflicto central, se diluye en gags.",
    opportunity: "Clips cortos para TikTok/Reels desde el montaje.",
    ceoLine: "El board quiere algo ‘compartible’ esta temporada.",
    priority: 4,
    tags: ["comedia", "trabajo", "coral", "redes"],
  },
  {
    id: "genre-mystery",
    title: "El pueblo calla",
    genre: "Misterio",
    audience: "Adultos 30–55",
    tone: "Atmosférico",
    why: "Misterio de pueblo rinde en catálogo y en boca a boca lento.",
    risk: "Requiere un final que justifique la espera.",
    opportunity: "Posible segunda temporada / universo.",
    ceoLine: "CEO: si el final no cierra, no renovamos nada.",
    priority: 3,
    tags: ["misterio", "pueblo", "atmosfera", "final"],
  },
  {
    id: "coming-of-age",
    title: "Último verano",
    genre: "Coming-of-age",
    audience: "Teen / jóvenes 15–25",
    tone: "Melancólico, luminoso",
    why: "Plataformas buscan historias jóvenes con emoción limpia.",
    risk: "Fácil caer en cliché; hace falta una voz propia.",
    opportunity: "Soundtrack y estética de marca.",
    ceoLine: "Marketing ya tiene moodboard: luz de atardecer y una canción.",
    priority: 3,
    tags: ["joven", "verano", "branding", "musica"],
  },
  {
    id: "sci-lofi",
    title: "Señal en el edificio",
    genre: "Sci-fi lo-fi",
    audience: "Nicho cinéfilo 20–40",
    tone: "Extraño, íntimo",
    why: "Sci-fi de un locación: barato y diferenciador si la idea es fuerte.",
    risk: "Nicho puro; el estudio pide un gancho comercial claro.",
    opportunity: "Festival + prestigio de marca del estudio.",
    ceoLine: "Solo si el concepto se explica en una frase. Si no, descartamos.",
    priority: 2,
    tags: ["sci-fi", "un-locacion", "festival", "nicho"],
  },
];

function scoreTheme(theme: ThemeBrief, ctx: AgentContext): number {
  let score = theme.priority * 10;
  const signals = (ctx.marketSignals ?? []).map((s) => s.toLowerCase());
  const notes = `${ctx.ceoNotes ?? ""} ${ctx.currentGenre ?? ""}`.toLowerCase();

  for (const tag of theme.tags) {
    if (signals.some((s) => s.includes(tag) || tag.includes(s))) score += 8;
    if (notes.includes(tag)) score += 6;
  }
  if (ctx.budget < 60_000 && theme.tags.includes("bajo-presupuesto")) score += 12;
  if (ctx.budget < 60_000 && theme.tags.includes("un-locacion")) score += 10;
  if (ctx.budget > 90_000 && theme.genre === "Thriller") score += 5;
  if (ctx.approval < 40 && theme.tags.includes("drama")) score += 4;
  if (ctx.selectedThemeId && theme.id === ctx.selectedThemeId) score -= 20;
  return score;
}

function pickThemes(ctx: AgentContext, limit = 3): ThemeBrief[] {
  return [...THEME_CATALOG]
    .map((t) => ({ t, s: scoreTheme(t, ctx) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.t);
}

function buildSpeech(themes: ThemeBrief[], ctx: AgentContext): string {
  const top = themes[0];
  if (!top) {
    return "El estudio todavía no cierra la línea editorial. Necesito números de marketing.";
  }
  return (
    `Hablé con el CEO y con mercadeo. Esta temporada empujan «${top.title}» (${top.genre}). ` +
    `${top.ceoLine} ` +
    `Audiencia: ${top.audience}. ` +
    (ctx.budget < 70_000
      ? "Con este presupuesto, prioricen poca locación y mucho conflicto."
      : "Hay margen para una imagen más ambiciosa, pero el logline tiene que ser claro.")
  );
}

function localRun(context: AgentContext): AgentRunResult {
  const themes = pickThemes(context, 3);
  const speech = buildSpeech(themes, context);
  const messages: AgentMessage[] = [
    { role: "system", content: STUDIO_MARKETING_SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify({
        projectTitle: context.projectTitle,
        budget: context.budget,
        day: context.day,
        approval: context.approval,
        currentGenre: context.currentGenre,
        marketSignals: context.marketSignals,
        ceoNotes: context.ceoNotes,
      }),
    },
    { role: "assistant", content: speech },
  ];
  return {
    agentId: MARKETING_AGENT_ID,
    agentName: "Nora Vega",
    speech,
    themes,
    messages,
    fromAi: false,
  };
}

export const STUDIO_MARKETING_SYSTEM_PROMPT = `Sos Nora Vega, Directora de Estudio y Marketing de Pixel Set.
Tu trabajo es traducir lo que pide el CEO y el área de mercadeo en temáticas concretas para desarrollar en sala de reunión.

Reglas:
- Hablás en español rioplatense, directo, profesional, sin relleno.
- Siempre proponés 2 o 3 temáticas con: título, género, audiencia, tono, por qué ahora, riesgo, oportunidad, y una frase del CEO.
- Priorizás proyectos viables según presupuesto y días.
- No escribís el guion: orientás el desarrollo (qué historia vale la pena contar para el estudio).
- Si el presupuesto es bajo, empujás pocas locaciones y conflicto fuerte.
- Respondés como personaje en la sala de reunión, no como asistente genérico.`;

export const studioMarketingAgent: StudioAgent = {
  id: MARKETING_AGENT_ID,
  name: "Nora Vega",
  roleLabel: "Dir. de estudio · Marketing",
  systemPrompt: STUDIO_MARKETING_SYSTEM_PROMPT,
  async run(context: AgentContext): Promise<AgentRunResult> {
    const ai = getStudioAiRunner();
    if (ai) {
      try {
        const messages: AgentMessage[] = [
          { role: "system", content: STUDIO_MARKETING_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Contexto de producción: ${JSON.stringify(context)}. Proponé temáticas para la sala de reunión.`,
          },
        ];
        const remote = await ai(STUDIO_MARKETING_SYSTEM_PROMPT, context, messages);
        if (remote) return { ...remote, fromAi: true };
      } catch {
        // fallback local
      }
    }
    return localRun(context);
  },
};

export function briefThemesLocal(context: AgentContext): AgentRunResult {
  return localRun(context);
}

export { THEME_CATALOG };
