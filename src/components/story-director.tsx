import { useEffect, useState } from "react";
import {
  chooseStoryOption, createStoryState, currentStoryBeat, isStoryState,
  storyBeatCount, storyProgress, type StoryState, type StoryStat,
} from "@/game/story-engine";

const STORAGE_KEY = "pixel-set-story-v1";
const statLabels: Record<StoryStat, string> = {
  trust: "Confianza", tension: "Tensión", budget: "Presupuesto", quality: "Calidad", morale: "Ánimo",
};

function loadStory(): StoryState {
  if (typeof window === "undefined") return createStoryState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStoryState();
    const parsed: unknown = JSON.parse(raw);
    return isStoryState(parsed) ? parsed : createStoryState();
  } catch {
    return createStoryState();
  }
}

export function StoryDirector() {
  const [story, setStory] = useState<StoryState>(loadStory);
  const [title, setTitle] = useState(story.projectTitle);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(story)); } catch { /* Storage may be unavailable. */ }
  }, [story]);

  const beat = currentStoryBeat(story);
  const progress = storyProgress(story);
  const restart = () => {
    const next = createStoryState(title.trim() || "La película");
    setStory(next);
  };

  return (
    <section className="mt-3 rounded-lg border border-primary/40 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-primary">MODO HISTORIA · DIRECTOR NARRATIVO</p>
          <h2 className="font-display text-2xl text-fg">{story.projectTitle}</h2>
          <p className="mt-1 text-sm text-muted">Decisiones persistentes: cada elección modifica al equipo y el resultado de la película.</p>
        </div>
        <div className="min-w-28 rounded-md bg-bg px-3 py-2 text-center">
          <p className="text-[10px] font-bold tracking-widest text-muted">PROGRESO</p>
          <p className="font-display text-2xl text-primary">{progress}%</p>
          <p className="text-xs text-muted">Día {story.day}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(Object.keys(statLabels) as StoryStat[]).map((key) => (
          <div key={key} className="rounded-md bg-bg p-2">
            <div className="flex justify-between gap-1 text-xs"><span className="text-muted">{statLabels[key]}</span><strong className="text-fg">{story.stats[key]}</strong></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${story.stats[key]}%` }} /></div>
          </div>
        ))}
      </div>

      {beat ? (
        <article className="mt-4 rounded-md border border-border bg-bg p-3">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="text-xs font-bold tracking-widest text-primary">{beat.location.toUpperCase()}</span>
            <span className="text-xs text-muted">Capítulo {story.beatIndex + 1} de {storyBeatCount()}</span>
          </div>
          <h3 className="mt-2 font-display text-xl text-fg">{beat.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-fg">{beat.setup}</p>
          <blockquote className="mt-3 border-l-2 border-primary pl-3 text-sm italic text-muted"><strong className="text-fg">{beat.speaker}:</strong> {beat.line}</blockquote>
          <h4 className="mt-4 text-xs font-bold tracking-widest text-muted">TU DECISIÓN</h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {beat.choices.map((choice) => (
              <button key={choice.id} type="button" onClick={() => setStory((current) => chooseStoryOption(current, choice.id))} className="rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-primary">
                <span className="block text-sm font-bold text-fg">{choice.label}</span>
                <span className="mt-1 block text-xs text-muted">{choice.description}</span>
                <span className="mt-2 block text-xs text-primary">Elegir esta opción →</span>
              </button>
            ))}
          </div>
        </article>
      ) : (
        <div className="mt-4 rounded-md border border-primary/40 bg-bg p-4">
          <p className="text-xs font-bold tracking-widest text-primary">PELÍCULA TERMINADA</p>
          <h3 className="mt-2 font-display text-xl text-fg">{story.ending}</h3>
          <p className="mt-2 text-sm text-muted">El resultado surge de las decisiones y del estado final del equipo; no hay un único final correcto.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Título de la próxima película" className="min-h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-fg" />
            <button type="button" onClick={restart} className="min-h-10 rounded-md bg-primary px-4 text-sm font-bold text-bg">Nueva historia</button>
          </div>
        </div>
      )}

      {story.history.length > 0 && (
        <details className="mt-3 rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold text-fg">Libro de decisiones ({story.history.length})</summary>
          <ol className="mt-2 space-y-2">
            {story.history.map((entry) => (
              <li key={entry.id} className="border-l border-primary/50 pl-3 text-sm">
                <strong className="text-fg">Día {entry.day} · {entry.beatTitle}: {entry.choiceLabel}</strong>
                <p className="text-xs text-muted">{entry.consequence}</p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
