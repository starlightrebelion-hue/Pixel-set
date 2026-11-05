/** Contrato de agentes del juego. Pensado para swap rule-based ↔ IA. */

export type AgentRole = "system" | "user" | "assistant";

export type AgentMessage = {
  role: AgentRole;
  content: string;
};

/** Contexto de producción que el agente recibe cada vez que corre. */
export type AgentContext = {
  projectTitle: string;
  budget: number;
  day: number;
  approval: number;
  currentGenre?: string;
  selectedThemeId?: string;
  marketSignals?: string[];
  ceoNotes?: string;
};

export type ThemeBrief = {
  id: string;
  title: string;
  genre: string;
  audience: string;
  tone: string;
  why: string;
  risk: string;
  opportunity: string;
  ceoLine: string;
  priority: number;
  tags: string[];
};

export type AgentRunResult = {
  agentId: string;
  agentName: string;
  speech: string;
  themes: ThemeBrief[];
  messages: AgentMessage[];
  fromAi: boolean;
};

export interface StudioAgent {
  id: string;
  name: string;
  roleLabel: string;
  systemPrompt: string;
  run(context: AgentContext): Promise<AgentRunResult>;
}

export type AiRunner = (
  systemPrompt: string,
  context: AgentContext,
  messages: AgentMessage[],
) => Promise<AgentRunResult | null>;

let globalAiRunner: AiRunner | null = null;

/** Conectar un backend de IA más adelante (OpenAI, Grok, local, etc.). */
export function setStudioAiRunner(runner: AiRunner | null) {
  globalAiRunner = runner;
}

export function getStudioAiRunner(): AiRunner | null {
  return globalAiRunner;
}
