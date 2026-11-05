import type { Hud } from "@/game/sim";
import type { CrewId } from "@/game/crew";

type Props = {
  people: Hud["people"];
  selectedId: CrewId | null;
  portraits: Partial<Record<CrewId, string>>;
  onSelect: (id: CrewId) => void;
  onOptions: () => void;
};

const DOT: Record<string, string> = { angry: "#d4533c", sleep: "#6a9bd8", coffee: "#e2b340" };

/** Iconos de cada personaje / rol, abajo a la derecha, más el botón de opciones. */
export function CrewRoster({ people, selectedId, portraits, onSelect, onOptions }: Props) {
  return (
    <nav aria-label="Equipo" className="pointer-events-auto absolute right-2 z-20 flex max-h-[calc(100dvh-300px)] flex-col-reverse flex-wrap-reverse items-end gap-1.5" style={{ bottom: "var(--bar-h, 178px)" }}>
      <button type="button" onClick={onOptions} aria-label="Opciones"
        className="grid size-11 place-items-center rounded-lg border-2 border-[#4a6b28] bg-[#12180c]/95 text-xl text-[#e2b340] shadow-lg">⚙</button>
      {people.map((p) => {
        const on = p.id === selectedId;
        const url = portraits[p.id];
        return (
          <button key={p.id} type="button" onClick={() => onSelect(p.id)} aria-label={`${p.name}, ${p.role}`} aria-pressed={on}
            className={`relative size-11 overflow-hidden rounded-lg border-2 bg-[#0a0e06]/95 shadow-lg ${on ? "border-[#e2b340]" : "border-[#4a6b28]"}`}>
            {url ? (
              <span className="block h-full w-full" style={{ backgroundImage: `url(${url})`, backgroundSize: "230%", backgroundPosition: "50% 6%", backgroundRepeat: "no-repeat", imageRendering: "pixelated" }} />
            ) : (
              <span className="grid h-full w-full place-items-center text-base font-bold text-[#9fbf5a]">{p.name[0]}</span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/70 text-center text-[8px] font-bold leading-tight text-white">{p.name}</span>
            {DOT[p.state] && <span className="absolute right-0.5 top-0.5 size-2 rounded-full" style={{ background: DOT[p.state] }} />}
          </button>
        );
      })}
    </nav>
  );
}
