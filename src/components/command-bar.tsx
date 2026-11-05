import {
  BookOpen, Clapperboard, Coffee, Crosshair, Film, Maximize2,
  MonitorPlay, Pause, Play, Users, ZoomIn, ZoomOut,
} from "lucide-react";
import type { Hud, LogLine } from "@/game/sim";
import type { CrewId, MapId } from "@/game/crew";

type Props = {
  hud: Hud;
  log: LogLine[];
  selectedId: CrewId | null;
  onSelectPanel: (panel: "director" | "story" | "advisors" | null) => void;
  activePanel: "director" | "story" | "advisors" | null;
  onAction: (action: "pause" | "coffee" | "resetCam" | "zoomIn" | "zoomOut") => void;
  onSelectMap: (map: MapId) => void;
  minimapRef: { current: HTMLCanvasElement | null };
};

const MAPS: { id: MapId; label: string; icon: typeof Clapperboard }[] = [
  { id: "guion", label: "GUION", icon: BookOpen },
  { id: "set", label: "RODAJE", icon: Clapperboard },
  { id: "montaje", label: "MONTAJE", icon: MonitorPlay },
];

const ACTIONS = [
  { id: "director", label: "ESCENA", icon: Clapperboard },
  { id: "story", label: "HISTORIA", icon: BookOpen },
  { id: "advisors", label: "ESTUDIO", icon: Users },
] as const;

/** Consola táctica de estudio: mapa, unidad seleccionada y órdenes. */
export function CommandBar({
  hud,
  log,
  selectedId,
  onSelectPanel,
  activePanel,
  onAction,
  onSelectMap,
  minimapRef,
}: Props) {
  const selected = hud.people.find((p) => p.id === selectedId) ?? null;
  const lastLog = log[0];

  return (
    <section className="sc-hud pointer-events-auto absolute inset-x-0 bottom-0 z-20" aria-label="Consola de mando">
      <div className="sc-hud-topline" />
      <div className="sc-hud-inner">
        <div className="sc-map-module">
          <div className="sc-module-heading">
            <span><Film className="size-3" /> MAPA TÁCTICO</span>
            <span className="sc-live-dot">EN VIVO</span>
          </div>
          <div className="sc-minimap-frame">
            <canvas
              ref={minimapRef}
              width={180}
              height={112}
              className="sc-minimap block h-[76px] w-full touch-none sm:h-[102px]"
              aria-label="Minimapa táctico. Tocá un punto para mover la cámara a esa zona."
            />
            <span className="sc-minimap-crosshair" aria-hidden="true">＋</span>
          </div>
          <div className="sc-camera-tools">
            <button type="button" onClick={() => onAction("zoomOut")} aria-label="Alejar mapa" title="Alejar"><ZoomOut /></button>
            <button type="button" onClick={() => onAction("resetCam")} aria-label="Centrar mapa" title="Centrar"><Crosshair /></button>
            <button type="button" onClick={() => onAction("zoomIn")} aria-label="Acercar mapa" title="Acercar"><ZoomIn /></button>
          </div>
        </div>

        <div className="sc-command-center">
          <div className="sc-map-tabs" aria-label="Cambiar sector">
            {MAPS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelectMap(id)}
                aria-label={`Ir a ${label.toLowerCase()}`}
                aria-pressed={hud.map === id}
                className={hud.map === id ? "sc-map-tab sc-map-tab-active" : "sc-map-tab"}
              >
                <Icon className="size-3.5" />
                <span>{label}</span>
                {hud.map === id && <i />}
              </button>
            ))}
            <span className="sc-sector-name">{hud.mapLabel}</span>
          </div>

          <div className="sc-unit-console">
            <div className="sc-unit-portrait" aria-hidden="true">
              {selected ? selected.name.slice(0, 1).toUpperCase() : <Film className="size-6" />}
              <span />
            </div>
            <div className="sc-unit-copy">
              <p className="sc-eyebrow">{selected ? "UNIDAD / PERSONAL" : "COMUNICACIONES DEL ESTUDIO"}</p>
              <strong>{selected ? selected.name : lastLog?.who ?? "CENTRAL"}</strong>
              <span>{selected ? `${selected.role} · ${stateLabelSafe(selected.state)}` : lastLog?.text ?? "Todos los departamentos operativos."}</span>
            </div>
            <div className="sc-mission-block">
              <p className="sc-eyebrow">OBJETIVO ACTIVO</p>
              <strong>{hud.objective}</strong>
              <div className="sc-progress-track"><i style={{ width: `${Math.max(0, Math.min(100, hud.quality))}%` }} /></div>
              <span>CALIDAD {Math.round(hud.quality)}% · ESTRÉS {Math.round(hud.stress)}%</span>
            </div>
          </div>

          <div className="sc-resource-strip">
            <span>★ <b>{hud.totalStars ?? 0}</b></span>
            <span>TOMA <b>{hud.take}</b></span>
            <span>RELOJ <b>{hud.timeLeft}s</b></span>
            <span>EQUIPO <b>{hud.stationCount}</b></span>
            <span>CAFÉ <b>{hud.coffeeCount}</b></span>
            <span className="sc-phase">{hud.phase.toUpperCase()}</span>
          </div>
        </div>

        <div className="sc-orders-module">
          <div className="sc-module-heading"><span><Crosshair className="size-3" /> ÓRDENES</span><span>F1–F6</span></div>
          <div className="sc-order-grid">
            {ACTIONS.map(({ id, label, icon: Icon }, index) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelectPanel(activePanel === id ? null : id)}
                aria-pressed={activePanel === id}
                className={activePanel === id ? "sc-order sc-order-active" : "sc-order"}
              >
                <kbd>F{index + 1}</kbd><Icon /><span>{label}</span>
              </button>
            ))}
            <button type="button" onClick={() => onAction("pause")} className="sc-order">
              <kbd>F4</kbd>{hud.paused ? <Play /> : <Pause />}<span>{hud.paused ? "SEGUIR" : hud.phase === "rolling" ? "CORTE" : "PAUSA"}</span>
            </button>
            <button type="button" onClick={() => onAction("coffee")} className="sc-order">
              <kbd>F5</kbd><Coffee /><span>COORDINAR</span>
            </button>
            <button type="button" onClick={() => onAction("resetCam")} className="sc-order">
              <kbd>F6</kbd><Maximize2 /><span>ENCUADRAR</span>
            </button>
          </div>
          <p className="sc-controls-hint">ARRASTRAR: CÁMARA · TOCAR: SELECCIONAR · MINIMAPA: SALTAR</p>
        </div>
      </div>
    </section>
  );
}

function stateLabelSafe(state: string) {
  if (state === "seated") return "En estación";
  if (state === "work") return "Trabajando";
  if (state === "angry") return "En conflicto";
  if (state === "sleep") return "Descansando";
  if (state === "coffee") return "Pausa de café";
  return state;
}
