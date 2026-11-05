import type { ProgressView } from "@/game/progress";

const RESULT: Record<string, string> = { completa: "🏆 Completa", fracaso: "💔 Fracaso", quiebra: "📉 Quiebra" };

/** Resumen de progresión del estudio (se usa en el menú principal y dentro del juego). */
export function ProgressSummary({ view }: { view: ProgressView }) {
  const pct = view.maxed ? 100 : Math.round((view.xpInto / Math.max(1, view.xpNeed)) * 100);
  return (
    <div className="grid gap-3 text-white">
      <div className="rounded-lg border border-[#3d5a1e]/70 bg-[#0a0e06] p-3">
        <p className="text-[10px] font-bold tracking-widest text-[#9fbf5a]">NIVEL {view.level} · {view.levelName.toUpperCase()}</p>
        <div className="mt-2 h-2.5 overflow-hidden rounded bg-[#1c2a10]"><i className="block h-full bg-[#e2b340]" style={{ width: `${pct}%` }} /></div>
        <p className="mt-1 text-xs text-[#a8b88a]">{view.maxed ? "Nivel máximo alcanzado." : `${view.xpInto} / ${view.xpNeed} XP para el nivel ${view.level + 1}`} · XP total {view.xp}</p>
        {view.nextPerk && <p className="mt-1 text-xs text-[#e2b340]">Próximo (nivel {view.nextPerk.level}): {view.nextPerk.text}</p>}
      </div>

      <div className="rounded-lg border border-[#3d5a1e]/70 bg-[#0a0e06] p-3">
        <p className="text-[10px] font-bold tracking-widest text-[#9fbf5a]">REPUTACIÓN · {view.tier.toUpperCase()}</p>
        <div className="mt-2 h-2.5 overflow-hidden rounded bg-[#1c2a10]"><i className="block h-full bg-[#6ac8e8]" style={{ width: `${view.reputation}%` }} /></div>
        <p className="mt-1 text-xs text-[#a8b88a]">{view.reputation} / 100 · Los ingresos por toma suben un {Math.round((view.incomeMul - 1) * 100)} % y empezás cada película con más hype.</p>
      </div>

      <div>
        <p className="mb-1 text-xs font-bold tracking-widest text-[#9fbf5a]">VENTAJAS Y DESBLOQUEOS</p>
        <ul className="grid gap-1.5">
          {view.perks.map((p) => (
            <li key={p.level} className={`rounded border px-2 py-1.5 text-xs ${p.unlocked ? "border-[#4a6b28] bg-[#0f140a] text-white" : "border-[#2a3a18] bg-[#0a0e06] text-[#7a8f4a]"}`}>
              <strong>{p.unlocked ? "✓" : "🔒"} Nivel {p.level}:</strong> {p.text}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-1 text-xs font-bold tracking-widest text-[#9fbf5a]">FILMOGRAFÍA</p>
        {view.films.length === 0 ? <p className="text-sm text-[#a8b88a]">Todavía no terminaste ninguna película.</p> : (
          <ul className="grid gap-1.5">
            {view.films.map((f) => (
              <li key={f.at} className="rounded border border-[#2a3a18] bg-[#0f140a] px-2 py-1.5 text-xs">
                <p className="flex justify-between gap-2"><strong className="truncate text-white">{f.title}</strong><span className="shrink-0 text-[#e2b340]">{RESULT[f.result] ?? f.result}</span></p>
                <p className="text-[#a8b88a]">★{f.stars} · Recaudó ${f.earned.toLocaleString("es-AR")} · Reputación {f.rep >= 0 ? "+" : ""}{f.rep}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
