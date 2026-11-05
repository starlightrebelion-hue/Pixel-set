import type { Hud, LogLine } from "@/game/sim";
import type { CrewId } from "@/game/crew";

export type CrewCommandId = "station" | "coffee" | "praise" | "scold" | "wake" | "center" | "deselect";
export type GeneralActionId = "action" | "cut" | "pause" | "team" | "scene" | "story" | "studio" | "center" | "options" | "missions";

type Props = {
  hud: Hud;
  log: LogLine[];
  selectedId: CrewId | null;
  onCrewCommand: (cmd: CrewCommandId) => void;
  onGeneral: (action: GeneralActionId) => void;
  onZoom: (dir: "in" | "out" | "reset") => void;
  minimapRef: { current: HTMLCanvasElement | null };
};

type Slot = { icon: string; label: string; onClick: () => void; hot?: boolean; disabled?: boolean } | null;

const STATE_LABEL: Record<string, string> = {
  seated: "Trabajando en su puesto", work: "En tarea", angry: "Enojado", sleep: "Dormido", coffee: "Tomando café", talk: "Conversando",
};

/** Barra inferior estilo StarCraft: minimapa + info + tarjeta de comandos 3×3 contextual. */
export function CommandBar({ hud, log, selectedId, onCrewCommand, onGeneral, onZoom, minimapRef }: Props) {
  const selected = hud.people.find((p) => p.id === selectedId) ?? null;
  const last = log[0];

  const crewSlots: Slot[] = selected
    ? [
        { icon: "🪑", label: "A su puesto", onClick: () => onCrewCommand("station") },
        { icon: "☕", label: "Al café", onClick: () => onCrewCommand("coffee") },
        { icon: "👏", label: "Elogiar", onClick: () => onCrewCommand("praise") },
        { icon: "📢", label: "Reñir", onClick: () => onCrewCommand("scold"), disabled: selected.id === "director" },
        { icon: "⏰", label: "Despertar", onClick: () => onCrewCommand("wake"), disabled: selected.state !== "sleep" },
        { icon: "🎯", label: "Ver", onClick: () => onCrewCommand("center") },
        null,
        null,
        { icon: "✕", label: "Cerrar", onClick: () => onCrewCommand("deselect") },
      ]
    : [];
  const generalSlots: Slot[] = [
    { icon: "🎬", label: "¡Acción!", onClick: () => onGeneral("action"), hot: true },
    { icon: "✂️", label: "¡Corten!", onClick: () => onGeneral("cut") },
    { icon: hud.paused ? "▶" : "⏸", label: hud.paused ? "Seguir" : "Pausa", onClick: () => onGeneral("pause") },
    { icon: "🤝", label: "Coordinar", onClick: () => onGeneral("team") },
    { icon: "📍", label: "Escena", onClick: () => onGeneral("scene") },
    { icon: "📜", label: "Historia", onClick: () => onGeneral("story") },
    { icon: "🏢", label: "Estudio", onClick: () => onGeneral("studio") },
    { icon: "🗺", label: "Vista", onClick: () => onGeneral("center") },
    { icon: "⚙", label: "Opciones", onClick: () => onGeneral("options") },
  ];
  const slots = selected ? crewSlots : generalSlots;

  return (
    <div className="sc-command-bar pointer-events-auto absolute inset-x-0 bottom-0 z-20">
      <div className="mx-auto max-w-3xl border-t-2 border-[#3d5a1e] bg-gradient-to-b from-[#1a2410] to-[#0d1208] p-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.55)] sm:p-2">
        <div className="mb-1 flex items-center gap-2 rounded border border-[#3d5a1e]/70 bg-[#0f140a] px-2 py-1 text-[11px]">
          {selected ? (
            <p className="min-w-0 truncate text-white">
              <strong>{selected.name}</strong> · {selected.role} <span className="text-[#a8b88a]">— {STATE_LABEL[selected.state] ?? selected.state}</span>
            </p>
          ) : (
            <p className="min-w-0 truncate text-[#c8d4a8]">
              {last ? <><strong className="text-white">{last.who}:</strong> {last.text}</> : hud.objective}
            </p>
          )}
          <span className="ml-auto shrink-0 text-[#e2b340]">★{hud.totalStars ?? 0} · {hud.timeLeft}s</span>
        </div>
        <div className="grid grid-cols-[auto_1fr_auto] items-stretch gap-1.5">
          <div className="flex flex-col gap-1">
            <div className="relative overflow-hidden rounded border-2 border-[#4a6b28] bg-[#0a0e06]">
              <canvas ref={minimapRef} width={140} height={100} className="block h-[72px] w-[100px] touch-none sm:h-[100px] sm:w-[140px]" aria-label="Minimapa — tocá para saltar la cámara" />
            </div>
            <div className="flex gap-0.5">
              <button type="button" onClick={() => onZoom("out")} className="sc-btn flex-1" aria-label="Alejar">−</button>
              <button type="button" onClick={() => onZoom("reset")} className="sc-btn flex-1" aria-label="Centrar">⌖</button>
              <button type="button" onClick={() => onZoom("in")} className="sc-btn flex-1" aria-label="Acercar">+</button>
            </div>
          </div>
          {selected ? (
            <div className="min-w-0 rounded border border-[#3d5a1e]/70 bg-[#0a0e06] p-1.5">
              <p className="text-[8px] font-bold tracking-widest text-[#9fbf5a]">ÓRDENES</p>
              <p className="line-clamp-4 text-[11px] font-semibold leading-snug text-white">Elegí una orden o tocá otro personaje.</p>
            </div>
          ) : (
            <button type="button" onClick={() => onGeneral("missions")} aria-label="Ver misiones del capítulo"
              className="min-w-0 rounded border border-[#3d5a1e]/70 bg-[#0a0e06] p-1.5 text-left active:bg-[#16200c]">
              <p className="text-[8px] font-bold tracking-widest text-[#9fbf5a]">MISIONES {hud.chapterIndex ? `· CAP. ${hud.chapterIndex}/${hud.chapterCount}` : ""}</p>
              {(hud.missions ?? []).filter((m) => m.required).slice(0, 3).map((m) => (
                <div key={m.id} className="mt-0.5">
                  <p className="flex justify-between gap-1 text-[10px] leading-tight text-white"><span className="truncate">{m.done ? "✓ " : ""}{m.label}</span><span className="shrink-0 text-[#e2b340]">{m.progress}/{m.target}</span></p>
                  <div className="h-1 overflow-hidden rounded bg-[#1c2a10]"><i className="block h-full bg-[#9fbf5a]" style={{ width: `${(m.progress / m.target) * 100}%` }} /></div>
                </div>
              ))}
              {(hud.missions ?? []).length === 0 && <p className="text-[11px] font-semibold text-white">{hud.objective}</p>}
            </button>
          )}
          <div className="grid grid-cols-3 gap-0.5" aria-label={selected ? `Órdenes de ${selected.name}` : "Comandos"}>
            {slots.map((s, i) =>
              s ? (
                <button key={i} type="button" disabled={s.disabled} onClick={s.onClick}
                  className={`sc-cmd !min-h-[44px] !min-w-[52px] ${s.hot ? "sc-cmd-on" : ""} ${s.disabled ? "opacity-40" : ""}`}>
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="text-[8px] leading-none sm:text-[9px]">{s.label}</span>
                </button>
              ) : <span key={i} className="rounded border border-[#2a3a18]/60 bg-[#0a0e06]/60" />,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
