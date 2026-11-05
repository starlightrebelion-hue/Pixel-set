import type { Hud, LogLine } from "@/game/sim";
import type { CrewId } from "@/game/crew";

type Props = {
  hud: Hud;
  log: LogLine[];
  selectedId: CrewId | null;
  onSelectPanel: (panel: "director" | "story" | "advisors" | null) => void;
  activePanel: "director" | "story" | "advisors" | null;
  onAction: (action: "pause" | "coffee" | "resetCam" | "zoomIn" | "zoomOut") => void;
  minimapRef: { current: HTMLCanvasElement | null };
};

/** Barra inferior estilo RTS / StarCraft: minimapa + recursos + comandos. */
export function CommandBar({
  hud,
  log,
  selectedId,
  onSelectPanel,
  activePanel,
  onAction,
  minimapRef,
}: Props) {
  const selected = hud.people.find((p) => p.id === selectedId) ?? null;
  const lastLog = log[0];

  return (
    <div className="sc-command-bar pointer-events-auto absolute inset-x-0 bottom-0 z-20">
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-stretch gap-1 border-t-2 border-[#3d5a1e] bg-gradient-to-b from-[#1a2410] to-[#0d1208] p-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.55)] sm:gap-2 sm:p-2">
        <div className="flex flex-col gap-1">
          <div className="relative overflow-hidden rounded border-2 border-[#4a6b28] bg-[#0a0e06]">
            <canvas
              ref={minimapRef}
              width={140}
              height={100}
              className="block h-[72px] w-[100px] touch-none sm:h-[100px] sm:w-[140px]"
              aria-label="Minimapa del set — tocá para saltar la cámara"
            />
            <span className="pointer-events-none absolute left-1 top-0.5 text-[8px] font-bold tracking-wider text-[#9fbf5a]">
              MAPA
            </span>
          </div>
          <div className="flex gap-0.5">
            <button type="button" onClick={() => onAction("zoomOut")} className="sc-btn flex-1 text-[10px]" title="Alejar">
              −
            </button>
            <button type="button" onClick={() => onAction("resetCam")} className="sc-btn flex-1 text-[10px]" title="Centrar">
              ⌖
            </button>
            <button type="button" onClick={() => onAction("zoomIn")} className="sc-btn flex-1 text-[10px]" title="Acercar">
              +
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 rounded border border-[#3d5a1e]/80 bg-[#12180c]/90 px-2 py-1 text-[10px] sm:text-xs">
            <span className="text-[#9fbf5a]">
              ★ <strong className="text-[#e2b340]">{hud.totalStars ?? 0}</strong>
            </span>
            <span className="text-[#9fbf5a]">
              TOMA <strong className="text-white">{hud.take}</strong>
            </span>
            <span className="text-[#9fbf5a]">
              TIEMPO <strong className="text-white">{hud.timeLeft}s</strong>
            </span>
            <span className="hidden text-[#9fbf5a] sm:inline">
              ESTRÉS <strong className="text-[#d4533c]">{Math.round(hud.stress)}</strong>
            </span>
            <span className="truncate text-[#c8d4a8]">{hud.mapLabel}</span>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto] gap-1">
            <div className="overflow-hidden rounded border border-[#3d5a1e]/70 bg-[#0f140a] px-2 py-1">
              {selected ? (
                <>
                  <p className="text-[9px] font-bold tracking-widest text-[#9fbf5a]">UNIDAD SELECCIONADA</p>
                  <p className="text-sm font-semibold text-white">
                    {selected.name} · {selected.role}
                  </p>
                  <p className="text-[10px] text-[#a8b88a]">{stateLabelSafe(selected.state)}</p>
                </>
              ) : (
                <>
                  <p className="text-[9px] font-bold tracking-widest text-[#9fbf5a]">COMUNICACIONES</p>
                  <p className="truncate text-[11px] text-[#c8d4a8]">
                    {lastLog ? (
                      <>
                        <strong className="text-white">{lastLog.who}:</strong> {lastLog.text}
                      </>
                    ) : (
                      "Sin mensajes."
                    )}
                  </p>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-6">
              {(
                [
                  ["director", "🎬", "Escena"],
                  ["story", "📜", "Guion"],
                  ["advisors", "🏢", "Estudio"],
                ] as const
              ).map(([id, icon, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectPanel(activePanel === id ? null : id)}
                  className={`sc-cmd ${activePanel === id ? "sc-cmd-on" : ""}`}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-[8px] sm:text-[9px]">{label}</span>
                </button>
              ))}
              <button type="button" onClick={() => onAction("pause")} className="sc-cmd">
                <span className="text-base leading-none">{hud.paused ? "▶" : "⏸"}</span>
                <span className="text-[8px] sm:text-[9px]">{hud.paused ? "Play" : "Pausa"}</span>
              </button>
              <button type="button" onClick={() => onAction("coffee")} className="sc-cmd">
                <span className="text-base leading-none">☕</span>
                <span className="text-[8px] sm:text-[9px]">Café</span>
              </button>
              <button type="button" onClick={() => onAction("resetCam")} className="sc-cmd">
                <span className="text-base leading-none">🗺</span>
                <span className="text-[8px] sm:text-[9px]">Vista</span>
              </button>
            </div>
          </div>

          <p className="truncate px-1 text-[9px] text-[#7a8f4a]">
            Pinch: zoom · Arrastrar: pan · Tocar: seleccionar · Minimapa: saltar vista
          </p>
        </div>

        <div className="hidden w-[140px] flex-col rounded border-2 border-[#4a6b28] bg-[#0a0e06] p-2 sm:flex">
          <p className="text-[8px] font-bold tracking-widest text-[#9fbf5a]">MISIÓN</p>
          <p className="mt-1 text-[11px] font-semibold leading-snug text-white">{hud.objective}</p>
          <p className="mt-auto pt-2 text-[9px] text-[#7a8f4a]">
            Fase: <span className="text-[#c8d4a8]">{hud.phase}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function stateLabelSafe(state: string) {
  if (state === "seated") return "Trabaja sentado";
  if (state === "work") return "En tarea";
  if (state === "angry") return "Enojado";
  if (state === "sleep") return "Dormido";
  if (state === "coffee") return "Café";
  return state;
}
