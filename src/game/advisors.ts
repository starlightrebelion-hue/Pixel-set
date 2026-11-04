import type { CrewId } from "@/game/crew";

export type ProjectScene = {
  title?: string;
  purpose?: string;
  conflict?: string;
  turningPoint?: string;
  consequence?: string;
  estimatedMinutes?: number;
  visualDescription?: string;
};

export type StoryProject = {
  title?: string;
  premise?: string;
  genre?: string;
  tone?: string;
  audience?: string;
  protagonist?: string;
  protagonistGoal?: string;
  obstacle?: string;
  stakes?: string;
  ending?: string;
  visualApproach?: string;
  estimatedBudget?: number;
  availableBudget?: number;
  estimatedDays?: number;
  availableDays?: number;
  targetMinutes?: number;
  scenes?: ProjectScene[];
};

export type AdvisorId = "director" | "guion" | "produccion" | "montaje" | "camara";
export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export type AdvisorRecommendation = {
  id: string;
  priority: RecommendationPriority;
  title: string;
  action: string;
  reason: string;
  relatedField: string;
};

export type AdvisorFinding = {
  id: string;
  severity: "strength" | "warning" | "problem";
  message: string;
  evidence: string;
};

export type AdvisorEvaluation = {
  advisorId: AdvisorId;
  crewId: CrewId;
  name: string;
  specialty: string;
  score: number;
  summary: string;
  findings: AdvisorFinding[];
  recommendations: AdvisorRecommendation[];
};

export type ProjectAssessment = {
  overallScore: number;
  status: "incomplete" | "needs-work" | "promising" | "ready";
  evaluatedAt: string;
  advisors: AdvisorEvaluation[];
  topPriorities: AdvisorRecommendation[];
  conflicts: string[];
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

function present(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function recommendation(
  id: string,
  priority: RecommendationPriority,
  title: string,
  action: string,
  reason: string,
  relatedField: string,
): AdvisorRecommendation {
  return { id, priority, title, action, reason, relatedField };
}

function finding(
  id: string,
  severity: AdvisorFinding["severity"],
  message: string,
  evidence: string,
): AdvisorFinding {
  return { id, severity, message, evidence };
}

function scoreFrom(checks: boolean[], base = 20) {
  if (!checks.length) return base;
  return clamp(base + checks.filter(Boolean).length * (80 / checks.length));
}

function evaluateDirector(project: StoryProject): AdvisorEvaluation {
  const checks = [
    present(project.premise),
    present(project.genre),
    present(project.tone),
    present(project.audience),
    present(project.visualApproach),
    present(project.ending),
  ];
  const score = scoreFrom(checks);
  const findings: AdvisorFinding[] = [];
  const recommendations: AdvisorRecommendation[] = [];
  if (present(project.premise) && present(project.genre) && present(project.tone)) {
    findings.push(finding("identity-defined", "strength", "El proyecto ya tiene una base de identidad reconocible.", "Hay premisa, género y tono definidos."));
  } else {
    findings.push(finding("identity-incomplete", "problem", "Todavía no se puede reconocer con claridad la identidad de la obra.", "Falta premisa, género o tono."));
    recommendations.push(recommendation("director-identity", "high", "Definir la identidad creativa", "Completar premisa, género y tono en una frase coherente.", "Sin una dirección común, guion, imagen y montaje pueden empujar en sentidos distintos.", "premise"));
  }
  if (!present(project.visualApproach)) {
    findings.push(finding("visual-missing", "warning", "La propuesta visual todavía no tiene una dirección concreta.", "No se indicó una estrategia visual."));
    recommendations.push(recommendation("director-visual", "medium", "Definir el lenguaje visual", "Describir paleta, iluminación, encuadres y movimiento de cámara.", "La identidad creativa debe poder traducirse a decisiones visibles.", "visualApproach"));
  }
  if (!present(project.audience)) {
    recommendations.push(recommendation("director-audience", "medium", "Precisar el público", "Describir a quién debería interesarle la historia y por qué.", "El atractivo del proyecto no puede evaluarse sin una audiencia objetivo.", "audience"));
  }
  return {
    advisorId: "director", crewId: "director", name: "Rey", specialty: "Dirección creativa",
    score, summary: score >= 75 ? "La identidad creativa está tomando forma." : "Necesitamos una visión más clara antes de dirigir al equipo.",
    findings, recommendations,
  };
}

function evaluateScript(project: StoryProject): AdvisorEvaluation {
  const checks = [
    present(project.protagonist),
    present(project.protagonistGoal),
    present(project.obstacle),
    present(project.stakes),
    present(project.ending),
    (project.scenes?.length ?? 0) >= 2,
  ];
  const score = scoreFrom(checks);
  const findings: AdvisorFinding[] = [];
  const recommendations: AdvisorRecommendation[] = [];
  if (present(project.protagonistGoal) && present(project.obstacle)) {
    findings.push(finding("dramatic-engine", "strength", "Hay un motor dramático identificable.", "El protagonista tiene un objetivo y un obstáculo."));
  } else {
    findings.push(finding("dramatic-engine-missing", "problem", "El conflicto central todavía no está suficientemente definido.", "Falta el objetivo del protagonista o aquello que se lo impide."));
    recommendations.push(recommendation("script-conflict", "critical", "Construir el conflicto central", "Definir qué quiere el protagonista y qué fuerza concreta se lo impide.", "Sin deseo y oposición no hay una línea dramática que impulse las escenas.", "protagonistGoal"));
  }
  if (!present(project.stakes)) {
    recommendations.push(recommendation("script-stakes", "high", "Aclarar qué está en juego", "Explicar qué pierde el protagonista si fracasa.", "Las consecuencias vuelven urgente el conflicto.", "stakes"));
  }
  if (!present(project.ending)) {
    findings.push(finding("ending-open", "warning", "El desenlace todavía no está definido.", "El campo de final está vacío."));
    recommendations.push(recommendation("script-ending", "high", "Elegir una dirección de desenlace", "Definir qué cambia al final, aunque después se revise.", "El final ayuda a comprobar si cada escena conduce a una transformación.", "ending"));
  }
  if ((project.scenes?.length ?? 0) < 2) {
    recommendations.push(recommendation("script-scenes", "medium", "Desarrollar la progresión de escenas", "Crear al menos una escena de presentación y otra que complique el objetivo.", "Con una sola escena no se puede valorar todavía el ritmo ni la progresión.", "scenes"));
  }
  const scenesWithoutConflict = (project.scenes ?? []).filter((scene) => !present(scene.conflict));
  if (scenesWithoutConflict.length > 0) {
    findings.push(finding("scene-conflicts", "warning", "Hay escenas sin conflicto declarado.", `${scenesWithoutConflict.length} escena(s) no describen una oposición.`));
    recommendations.push(recommendation("script-scene-conflict", "medium", "Dar una tensión a cada escena", "Indicar qué quiere alguien en cada escena y qué se interpone.", "Las escenas necesitan producir un cambio, una decisión o una nueva pregunta.", "scenes"));
  }
  return {
    advisorId: "guion", crewId: "guion", name: "Sol", specialty: "Guion y dramaturgia",
    score, summary: score >= 75 ? "La estructura dramática tiene buenos cimientos." : "El conflicto y la progresión necesitan más trabajo.",
    findings, recommendations,
  };
}

function evaluateProduction(project: StoryProject): AdvisorEvaluation {
  const hasBudget = Number.isFinite(project.estimatedBudget) && Number.isFinite(project.availableBudget);
  const hasSchedule = Number.isFinite(project.estimatedDays) && Number.isFinite(project.availableDays);
  const budgetOk = hasBudget && project.estimatedBudget! <= project.availableBudget!;
  const scheduleOk = hasSchedule && project.estimatedDays! <= project.availableDays!;
  const checks = [hasBudget, hasSchedule, budgetOk, scheduleOk, (project.scenes?.length ?? 0) > 0];
  const score = scoreFrom(checks);
  const findings: AdvisorFinding[] = [];
  const recommendations: AdvisorRecommendation[] = [];
  if (!hasBudget) {
    findings.push(finding("budget-unknown", "warning", "No hay datos suficientes para validar el presupuesto.", "Falta presupuesto estimado o disponible."));
    recommendations.push(recommendation("production-budget", "high", "Completar el presupuesto", "Cargar el costo estimado y el presupuesto disponible con la misma unidad monetaria.", "Sin ambos valores no se puede determinar la viabilidad económica.", "estimatedBudget"));
  } else if (budgetOk) {
    findings.push(finding("budget-ok", "strength", "El presupuesto estimado está dentro del límite disponible.", `Estimado: ${project.estimatedBudget}; disponible: ${project.availableBudget}.`));
  } else {
    findings.push(finding("budget-over", "problem", "El presupuesto estimado supera los recursos disponibles.", `Estimado: ${project.estimatedBudget}; disponible: ${project.availableBudget}.`));
    recommendations.push(recommendation("production-budget-cut", "critical", "Ajustar el alcance o conseguir recursos", "Reducir costos, simplificar escenas o aumentar el presupuesto disponible.", "El plan actual no entra en el presupuesto declarado.", "estimatedBudget"));
  }
  if (!hasSchedule) {
    recommendations.push(recommendation("production-schedule", "medium", "Definir el calendario", "Cargar días estimados de producción y días disponibles.", "No se puede medir el riesgo de retraso sin un calendario.", "estimatedDays"));
  } else if (!scheduleOk) {
    findings.push(finding("schedule-over", "problem", "El calendario estimado supera los días disponibles.", `Estimado: ${project.estimatedDays}; disponibles: ${project.availableDays}.`));
    recommendations.push(recommendation("production-schedule-cut", "high", "Replanificar el rodaje", "Reducir jornadas, agrupar locaciones o ampliar el plazo.", "El calendario actual no es viable con el tiempo declarado.", "estimatedDays"));
  }
  return {
    advisorId: "produccion", crewId: "produccion", name: "Marcos", specialty: "Producción y viabilidad",
    score, summary: score >= 75 ? "La planificación parece viable con los datos cargados." : "Faltan datos o hay restricciones de producción que resolver.",
    findings, recommendations,
  };
}

function evaluateEditing(project: StoryProject): AdvisorEvaluation {
  const scenes = project.scenes ?? [];
  const withPurpose = scenes.filter((scene) => present(scene.purpose)).length;
  const withTurn = scenes.filter((scene) => present(scene.turningPoint) || present(scene.consequence)).length;
  const checks = [
    scenes.length >= 2,
    scenes.length > 0 && withPurpose === scenes.length,
    scenes.length > 0 && withTurn >= Math.ceil(scenes.length / 2),
    present(project.ending),
    scenes.every((scene) => !Number.isFinite(scene.estimatedMinutes) || scene.estimatedMinutes! > 0),
  ];
  const score = scoreFrom(checks);
  const findings: AdvisorFinding[] = [];
  const recommendations: AdvisorRecommendation[] = [];
  if (scenes.length === 0) {
    findings.push(finding("edit-no-scenes", "problem", "Todavía no hay escenas para evaluar el montaje.", "La lista de escenas está vacía."));
    recommendations.push(recommendation("edit-scenes", "high", "Crear una primera escaleta", "Ordenar las escenas y describir qué aporta cada una.", "El montaje necesita una progresión de material para evaluar ritmo y continuidad.", "scenes"));
  } else {
    findings.push(finding("edit-scene-count", scenes.length >= 2 ? "strength" : "warning", `${scenes.length} escena(s) cargadas para revisar.`, `Propósito definido en ${withPurpose} de ${scenes.length} escena(s).`));
    if (withPurpose < scenes.length) {
      recommendations.push(recommendation("edit-purpose", "medium", "Aclarar la función de cada escena", "Escribir qué información, emoción o cambio aporta cada escena.", "Esto permite detectar repeticiones y escenas que no hacen avanzar el relato.", "scenes"));
    }
    if (withTurn < Math.ceil(scenes.length / 2)) {
      recommendations.push(recommendation("edit-turns", "medium", "Marcar los cambios dramáticos", "Identificar dónde cambia la situación o aparece una consecuencia.", "Los puntos de giro ayudan a construir ritmo y evitar una sucesión plana de escenas.", "scenes"));
    }
  }
  if (Number.isFinite(project.targetMinutes)) {
    const knownDuration = scenes.reduce((sum, scene) => sum + (scene.estimatedMinutes ?? 0), 0);
    if (knownDuration > 0 && knownDuration > project.targetMinutes!) {
      findings.push(finding("edit-duration", "warning", "La duración estimada de escenas supera el objetivo.", `Escenas: ${knownDuration} min; objetivo: ${project.targetMinutes} min.`));
      recommendations.push(recommendation("edit-duration-cut", "high", "Revisar la duración", "Recortar, fusionar o redistribuir escenas para acercarse al objetivo.", "La duración prevista excede el formato elegido.", "targetMinutes"));
    }
  }
  return {
    advisorId: "montaje", crewId: "montaje", name: "Lila", specialty: "Ritmo y continuidad",
    score, summary: score >= 75 ? "La progresión de escenas permite empezar a pensar el montaje." : "Todavía falta material o información para evaluar el ritmo.",
    findings, recommendations,
  };
}

function evaluateCamera(project: StoryProject): AdvisorEvaluation {
  const scenes = project.scenes ?? [];
  const visualScenes = scenes.filter((scene) => present(scene.visualDescription)).length;
  const checks = [
    present(project.visualApproach),
    scenes.length > 0,
    scenes.length > 0 && visualScenes === scenes.length,
    present(project.tone),
    present(project.genre),
  ];
  const score = scoreFrom(checks);
  const findings: AdvisorFinding[] = [];
  const recommendations: AdvisorRecommendation[] = [];
  if (!present(project.visualApproach)) {
    findings.push(finding("camera-language", "problem", "No hay una propuesta visual general.", "El lenguaje visual no está descrito."));
    recommendations.push(recommendation("camera-style", "high", "Definir la puesta en cámara", "Describir encuadres, movimientos, distancia, luz y composición predominantes.", "La cámara necesita una intención que acompañe el género y el tono.", "visualApproach"));
  }
  if (scenes.length > 0 && visualScenes < scenes.length) {
    findings.push(finding("camera-scenes", "warning", "No todas las escenas tienen una descripción visual.", `${visualScenes} de ${scenes.length} escenas tienen descripción visual.`));
    recommendations.push(recommendation("camera-shotlist", "medium", "Describir la intención visual por escena", "Agregar qué vemos, desde dónde y qué información debe revelar cada escena.", "Una descripción visual permite planificar planos y detectar escenas difíciles de producir.", "scenes"));
  }
  return {
    advisorId: "camara", crewId: "camara", name: "Nico", specialty: "Narrativa visual y cámara",
    score, summary: score >= 75 ? "La propuesta visual empieza a ser traducible a planos." : "La imagen todavía necesita una intención más concreta.",
    findings, recommendations,
  };
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

export function evaluateProject(project: StoryProject): ProjectAssessment {
  const advisors = [
    evaluateDirector(project),
    evaluateScript(project),
    evaluateProduction(project),
    evaluateEditing(project),
    evaluateCamera(project),
  ];
  const overallScore = clamp(advisors.reduce((sum, advisor) => sum + advisor.score, 0) / advisors.length);
  const recommendations = advisors.flatMap((advisor) => advisor.recommendations);
  const seen = new Set<string>();
  const topPriorities = recommendations
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 8);

  const conflicts: string[] = [];
  const production = advisors.find((advisor) => advisor.advisorId === "produccion")!;
  const script = advisors.find((advisor) => advisor.advisorId === "guion")!;
  if (production.recommendations.some((item) => item.id === "production-budget-cut") && script.score >= 75) {
    conflicts.push("Sol propone desarrollar la historia, pero Marcos detecta que el alcance actual supera el presupuesto. Conviene preservar el conflicto central y simplificar la producción antes de recortar escenas clave.");
  }

  const missingCore = !present(project.premise) || !present(project.protagonistGoal) || !present(project.obstacle);
  return {
    overallScore,
    status: missingCore ? "incomplete" : overallScore >= 80 ? "ready" : overallScore >= 60 ? "promising" : "needs-work",
    evaluatedAt: new Date().toISOString(),
    advisors,
    topPriorities,
    conflicts,
  };
}
