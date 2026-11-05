/** Desarrollo de guion en sala de reunión: asesores que cobran, días y presupuesto. */

export type SceneStatus = "borrador" | "en-revision" | "aprobada";

export type DevScene = {
  id: string;
  title: string;
  purpose: string;
  minutes: number;
  status: SceneStatus;
  cost: number;
  daysSpent: number;
};

export type AdvisorOffer = {
  id: string;
  name: string;
  role: string;
  fee: number;
  specialty: string;
  options: Array<{
    id: string;
    label: string;
    detail: string;
    sceneId: string;
    approvalDelta: number;
    daysCost: number;
    rewriteCost: number;
  }>;
};

export type DevelopmentState = {
  projectTitle: string;
  budget: number;
  day: number;
  approval: number;
  hired: string[];
  scenes: DevScene[];
  log: string[];
  approved: boolean;
  meetingOpen: boolean;
};

const STORAGE_KEY = "pixel-set-dev-v1";

const DEFAULT_SCENES: DevScene[] = [
  { id: "s1", title: "Apertura", purpose: "Presentar al protagonista y el deseo.", minutes: 3, status: "borrador", cost: 4000, daysSpent: 0 },
  { id: "s2", title: "El conflicto", purpose: "Mostrar el obstáculo y lo que está en juego.", minutes: 5, status: "borrador", cost: 7000, daysSpent: 0 },
  { id: "s3", title: "El giro", purpose: "Cambiar la información del espectador.", minutes: 4, status: "borrador", cost: 6000, daysSpent: 0 },
  { id: "s4", title: "Clímax", purpose: "Forzar la decisión irreversible.", minutes: 6, status: "borrador", cost: 9000, daysSpent: 0 },
  { id: "s5", title: "Cierre", purpose: "Mostrar qué cambió después del conflicto.", minutes: 3, status: "borrador", cost: 3500, daysSpent: 0 },
];

export const ADVISORS_FOR_HIRE: Array<Omit<AdvisorOffer, "options">> = [
  { id: "drama", name: "Vera López", role: "Dramaturga", fee: 8000, specialty: "Estructura y arco" },
  { id: "exec", name: "Omar Ríos", role: "Productor ejecutivo", fee: 12000, specialty: "Alcance y presupuesto" },
  { id: "genre", name: "Kim Sato", role: "Consultora de género", fee: 6000, specialty: "Convenciones del tono" },
  { id: "doctor", name: "Leo Martins", role: "Script doctor", fee: 10000, specialty: "Diálogo y continuidad" },
];

function clamp(n: number, a = 0, b = 100) {
  return Math.max(a, Math.min(b, Math.round(n)));
}

function buildOptions(hiredIds: string[], scenes: DevScene[]): AdvisorOffer[] {
  const pool: AdvisorOffer[] = [];
  for (const base of ADVISORS_FOR_HIRE) {
    if (!hiredIds.includes(base.id)) continue;
    const draft = scenes.filter((s) => s.status !== "aprobada");
    const target = draft[0] ?? scenes[0]!;
    const options =
      base.id === "drama"
        ? [
            { id: `${base.id}-clarity`, label: "Aclarar el deseo", detail: `En “${target.title}”, que el protagonista quiera algo concreto en la primera página.`, sceneId: target.id, approvalDelta: 12, daysCost: 1, rewriteCost: 1500 },
            { id: `${base.id}-cut`, label: "Cortar un beat muerto", detail: `Sacar el beat sin conflicto de “${target.title}” para ganar ritmo.`, sceneId: target.id, approvalDelta: 8, daysCost: 1, rewriteCost: 1000 },
          ]
        : base.id === "exec"
          ? [
              { id: `${base.id}-scope`, label: "Bajar el alcance", detail: `Fusionar dos locaciones de “${target.title}” para ahorrar días de rodaje.`, sceneId: target.id, approvalDelta: 6, daysCost: 1, rewriteCost: 800 },
              { id: `${base.id}-protect`, label: "Proteger el clímax", detail: "No recortar el clímax: recortar la apertura en su lugar.", sceneId: "s1", approvalDelta: 10, daysCost: 2, rewriteCost: 2000 },
            ]
          : base.id === "genre"
            ? [
                { id: `${base.id}-tone`, label: "Fijar el tono", detail: `Marcar en “${target.title}” una convención clara del género (pista, gag o amenaza).`, sceneId: target.id, approvalDelta: 9, daysCost: 1, rewriteCost: 1200 },
                { id: `${base.id}-audience`, label: "Orientar al público", detail: "Dejar una señal temprana de a quién está dirigida la película.", sceneId: "s1", approvalDelta: 7, daysCost: 1, rewriteCost: 900 },
              ]
            : [
                { id: `${base.id}-dialog`, label: "Reescribir el diálogo clave", detail: `En “${target.title}”, una línea que revele el conflicto sin explicarlo.`, sceneId: target.id, approvalDelta: 11, daysCost: 2, rewriteCost: 1800 },
                { id: `${base.id}-cont`, label: "Coser continuidad", detail: "Un objeto o gesto que atraviese tres escenas.", sceneId: "s2", approvalDelta: 9, daysCost: 1, rewriteCost: 1100 },
              ];
    pool.push({ ...base, options });
  }
  return pool;
}

export function createDevelopment(title = "La traición"): DevelopmentState {
  return {
    projectTitle: title,
    budget: 100_000,
    day: 1,
    approval: 18,
    hired: [],
    scenes: DEFAULT_SCENES.map((s) => ({ ...s })),
    log: ["Rey y Sol entran a la sala de reunión. El guion todavía no cierra."],
    approved: false,
    meetingOpen: true,
  };
}

export function loadDevelopment(): DevelopmentState {
  if (typeof window === "undefined") return createDevelopment();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDevelopment();
    const parsed = JSON.parse(raw) as DevelopmentState;
    if (!parsed || !Array.isArray(parsed.scenes)) return createDevelopment();
    return parsed;
  } catch {
    return createDevelopment();
  }
}

export function saveDevelopment(state: DevelopmentState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function hireAdvisor(state: DevelopmentState, advisorId: string): DevelopmentState {
  const adv = ADVISORS_FOR_HIRE.find((a) => a.id === advisorId);
  if (!adv || state.hired.includes(advisorId) || state.approved) return state;
  if (state.budget < adv.fee) {
    return {
      ...state,
      log: [`No alcanza el presupuesto para contratar a ${adv.name} ($${adv.fee}).`, ...state.log].slice(0, 30),
    };
  }
  return {
    ...state,
    budget: state.budget - adv.fee,
    day: state.day + 1,
    hired: [...state.hired, advisorId],
    log: [
      `Día ${state.day + 1}: se contrata a ${adv.name} (${adv.role}) por $${adv.fee.toLocaleString("es-AR")}.`,
      ...state.log,
    ].slice(0, 30),
  };
}

export function applyAdvisorOption(
  state: DevelopmentState,
  advisorId: string,
  optionId: string,
): DevelopmentState {
  if (state.approved) return state;
  const offers = buildOptions(state.hired, state.scenes);
  const adv = offers.find((a) => a.id === advisorId);
  const opt = adv?.options.find((o) => o.id === optionId);
  if (!adv || !opt) return state;
  if (state.budget < opt.rewriteCost) {
    return {
      ...state,
      log: [`Sol no puede reescribir: faltan $${opt.rewriteCost} para el rewrite.`, ...state.log].slice(0, 30),
    };
  }

  const scenes = state.scenes.map((s) => {
    if (s.id !== opt.sceneId) return s;
    return {
      ...s,
      status: (s.status === "aprobada" ? "aprobada" : "en-revision") as SceneStatus,
      daysSpent: s.daysSpent + opt.daysCost,
      cost: s.cost + opt.rewriteCost,
    };
  });

  const approval = clamp(state.approval + opt.approvalDelta);
  const day = state.day + opt.daysCost;
  const budget = state.budget - opt.rewriteCost;

  const scenes2 = scenes.map((s) => {
    if (s.status === "en-revision" && approval >= 55 && s.daysSpent >= 2) {
      return { ...s, status: "aprobada" as SceneStatus };
    }
    return s;
  });

  const approvedCount = scenes2.filter((s) => s.status === "aprobada").length;
  const approved = approval >= 75 && approvedCount >= 3;

  return {
    ...state,
    scenes: scenes2,
    approval,
    day,
    budget,
    approved,
    log: [
      approved
        ? `Día ${day}: ¡Guion aprobado! Sol y Rey cierran la reunión.`
        : `Día ${day}: Sol aplica “${opt.label}” (${adv.name}). Aprobación ${approval}%. -$${opt.rewriteCost}.`,
      ...state.log,
    ].slice(0, 30),
  };
}

export function skipDay(state: DevelopmentState): DevelopmentState {
  if (state.approved) return state;
  const burn = 1500;
  return {
    ...state,
    day: state.day + 1,
    budget: Math.max(0, state.budget - burn),
    approval: clamp(state.approval - 2),
    log: [`Día ${state.day + 1}: reunión sin avances. Overhead -$${burn}.`, ...state.log].slice(0, 30),
  };
}

export function advisorOffers(state: DevelopmentState): AdvisorOffer[] {
  return buildOptions(state.hired, state.scenes);
}

export function developmentSummary(state: DevelopmentState) {
  const totalMinutes = state.scenes.reduce((n, s) => n + s.minutes, 0);
  const totalSceneCost = state.scenes.reduce((n, s) => n + s.cost, 0);
  const approvedScenes = state.scenes.filter((s) => s.status === "aprobada").length;
  return { totalMinutes, totalSceneCost, approvedScenes, sceneCount: state.scenes.length };
}

export function resetDevelopment(title?: string) {
  const next = createDevelopment(title);
  saveDevelopment(next);
  return next;
}
