import { useState } from "react";
import { evaluateProject, type ProjectAssessment, type StoryProject } from "@/game/advisors";

const emptyProject: StoryProject = {
  title: "", premise: "", genre: "", tone: "", audience: "",
  protagonist: "", protagonistGoal: "", obstacle: "", stakes: "", ending: "",
  visualApproach: "", scenes: [],
};

const fields: Array<{ key: keyof StoryProject; label: string; placeholder: string }> = [
  { key: "title", label: "Título", placeholder: "Nombre provisional del proyecto" },
  { key: "premise", label: "Premisa", placeholder: "¿De qué trata la historia en una o dos frases?" },
  { key: "genre", label: "Género", placeholder: "Drama, comedia, thriller…" },
  { key: "tone", label: "Tono", placeholder: "Íntimo, absurdo, realista, épico…" },
  { key: "audience", label: "Público", placeholder: "¿A quién está dirigida?" },
  { key: "protagonist", label: "Protagonista", placeholder: "¿Quién lleva la historia?" },
  { key: "protagonistGoal", label: "Objetivo", placeholder: "¿Qué quiere conseguir?" },
  { key: "obstacle", label: "Obstáculo", placeholder: "¿Qué o quién se lo impide?" },
  { key: "stakes", label: "Qué está en juego", placeholder: "¿Qué pierde si fracasa?" },
  { key: "ending", label: "Desenlace", placeholder: "¿Qué cambia al final?" },
  { key: "visualApproach", label: "Propuesta visual", placeholder: "Paleta, luz, encuadres, cámara y atmósfera" },
];

const priorityLabel = { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" };
const statusLabel = { incomplete: "Información incompleta", "needs-work": "Necesita trabajo", promising: "Prometedor", ready: "Listo para desarrollar" };

export function AdvisorPanel() {
  const [project, setProject] = useState<StoryProject>(emptyProject);
  const [sceneText, setSceneText] = useState("");
  const [assessment, setAssessment] = useState<ProjectAssessment | null>(null);

  const update = (key: keyof StoryProject, value: string) => {
    setProject((current) => ({ ...current, [key]: value }));
  };

  const assess = () => {
    const scenes = sceneText.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const [title, purpose, conflict, turningPoint, visualDescription] = line.split("|").map((part) => part.trim());
      return { title, purpose, conflict, turningPoint, visualDescription };
    });
    setAssessment(evaluateProject({ ...project, scenes }));
  };

  return (
    <section className="mt-2 rounded-lg border border-primary/30 bg-surface p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-primary">MESA DE ASESORES</p>
          <h2 className="font-display text-2xl text-fg">Evaluación del proyecto</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">Completá la ficha y pedí una revisión. Las notas salen de reglas explícitas, no de respuestas inventadas por una IA.</p>
        </div>
        <button type="button" onClick={assess} className="min-h-11 rounded-md bg-primary px-4 text-sm font-bold text-bg hover:opacity-90">Evaluar proyecto</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={String(field.key)} className={field.key === "premise" || field.key === "visualApproach" ? "sm:col-span-2" : ""}>
            <span className="mb-1 block text-xs font-semibold text-muted">{field.label}</span>
            <textarea
              value={String(project[field.key] ?? "")}
              onChange={(event) => update(field.key, event.target.value)}
              placeholder={field.placeholder}
              rows={field.key === "premise" || field.key === "visualApproach" ? 2 : 1}
              className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
            />
          </label>
        ))}
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">Escenas (una por línea)</span>
          <textarea
            value={sceneText}
            onChange={(event) => setSceneText(event.target.value)}
            placeholder={"El encuentro | Presentar el deseo | No se reconocen | Aparece una pista | Plano general bajo lluvia\nLa revelación | Cambiar la relación | El protagonista duda | Descubre la traición | Primer plano y luz lateral"}
            rows={4}
            className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-primary"
          />
          <span className="mt-1 block text-xs text-muted">Formato: título | propósito | conflicto | giro o consecuencia | descripción visual</span>
        </label>
      </div>

      {assessment && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-widest text-muted">RESULTADO GENERAL</p>
              <p className="font-display text-3xl text-primary">{assessment.overallScore}/100</p>
              <p className="text-sm text-fg">{statusLabel[assessment.status]}</p>
            </div>
            <p className="max-w-sm text-xs text-muted">La nota es un indicador interno basado en los campos completados; no predice éxito comercial ni calidad artística objetiva.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {assessment.advisors.map((advisor) => (
              <article key={advisor.advisorId} className="rounded-md border border-border bg-bg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-fg">{advisor.name} · {advisor.specialty}</h3>
                    <p className="mt-1 text-sm text-muted">{advisor.summary}</p>
                  </div>
                  <span className="shrink-0 font-display text-xl text-primary">{advisor.score}</span>
                </div>
                {advisor.findings.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {advisor.findings.map((item) => (
                      <li key={item.id} className="text-sm text-fg">
                        <span className={item.severity === "problem" ? "font-semibold text-danger" : item.severity === "strength" ? "font-semibold text-primary" : "font-semibold text-muted"}>{item.severity === "problem" ? "Problema" : item.severity === "strength" ? "Fortaleza" : "Alerta"}: </span>
                        {item.message} <span className="block text-xs text-muted">{item.evidence}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {advisor.recommendations.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-border pt-2">
                    {advisor.recommendations.map((item) => (
                      <li key={item.id} className="text-sm text-fg">
                        <span className="font-semibold text-primary">{priorityLabel[item.priority]} · {item.title}</span>
                        <p>{item.action}</p>
                        <p className="text-xs text-muted">{item.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          {assessment.conflicts.length > 0 && (
            <div className="mt-3 rounded-md border border-primary/40 p-3">
              <h3 className="font-semibold text-primary">Puntos de negociación entre asesores</h3>
              {assessment.conflicts.map((conflict) => <p key={conflict} className="mt-1 text-sm text-fg">{conflict}</p>)}
            </div>
          )}

          {assessment.topPriorities.length > 0 && (
            <div className="mt-3 rounded-md border border-border p-3">
              <h3 className="font-semibold text-fg">Prioridades del equipo</h3>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-fg">
                {assessment.topPriorities.map((item) => <li key={item.id}><strong>{priorityLabel[item.priority]}:</strong> {item.title} — {item.action}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
