import { useState, type ReactNode } from "react";
import { PROPS, TIMES, WEATHERS, locationsFor, type Genre, type TimeOfDay, type Weather } from "@/game/scenery";
import type { SetDirector, SetSnapshot } from "@/game/set-director";
import { StoryDirector } from "@/components/story-director";
import { AdvisorPanel } from "@/components/advisor-panel";
import type { StoryChoice } from "@/game/story-engine";

type Nav = { back: () => void; forward: () => void; push: (r: string[]) => void };
type Props = {
  path: string[]; // ruta dentro del juego, p. ej. ["scene","place"]
  snap: SetSnapshot | null;
  director: SetDirector | null;
  nav: Nav;
  onClose: () => void;
  onMainMenu: () => void;
  onStoryDecision: (c: StoryChoice) => void;
};

const TITLES: Record<string, string> = {
  opts: "Opciones", scene: "Dirigir escena", genre: "Género", place: "Lugar", time: "Hora del día", weather: "Clima",
  dress: "Decorado", plan: "Plan de 15 escenas", script: "Escribir guion", continuity: "Continuidad", story: "Historia", studio: "Estudio y asesores", help: "Cómo jugar",
};

const tile = "flex min-h-14 w-full items-center gap-3 rounded-lg border border-[#3d5a1e] bg-[#0f140a] px-3 py-2 text-left text-white active:bg-[#1c2a10]";
const big = (on: boolean) => `min-h-14 rounded-lg border-2 px-3 py-2 text-sm font-bold ${on ? "border-[#e2b340] bg-[#2a2410] text-[#e2b340]" : "border-[#3d5a1e] bg-[#0f140a] text-white"}`;

function Tile({ icon, title, value, onClick }: { icon: string; title: string; value?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={tile}>
      <span className="text-2xl">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{title}</span>
        {value && <span className="block truncate text-xs text-[#a8b88a]">{value}</span>}
      </span>
      <span aria-hidden className="text-[#9fbf5a]">›</span>
    </button>
  );
}

/** Menús del juego: una decisión por pantalla, con Atrás / Cerrar y ruta visible. */
export function GameMenus({ path, snap, director, nav, onClose, onMainMenu, onStoryDecision }: Props) {
  const [script, setScript] = useState("");
  const key = path[path.length - 1] ?? "opts";
  const go = (...next: string[]) => nav.push(["play", ...next]);
  const crumbs = path.map((p) => TITLES[p] ?? p);
  const canAct = !!snap && !!director;
  const done = (fn: () => void) => () => { fn(); nav.back(); };

  let body: ReactNode = null;
  if (key === "opts") {
    body = (
      <div className="grid gap-2">
        <p className="text-sm text-[#c8d4a8]">¿Qué querés hacer?</p>
        <Tile icon="📍" title="Dirigir escena" value="Lugar, hora, clima y decorado" onClick={() => go("scene")} />
        <Tile icon="📜" title="Historia" value="Decisiones del guion" onClick={() => go("story")} />
        <Tile icon="🏢" title="Estudio y asesores" value="Presupuesto y reuniones" onClick={() => go("studio")} />
        <Tile icon="❓" title="Cómo jugar" onClick={() => go("help")} />
        <Tile icon="🏠" title="Menú principal" value="Elegir otra historia" onClick={onMainMenu} />
      </div>
    );
  } else if (key === "help") {
    body = (
      <ol className="grid gap-3 text-sm text-[#c8d4a8]">
        <li><strong className="text-white">1. Tocá un personaje</strong> (en el mapa o en los iconos de la derecha) para ver sus órdenes abajo.</li>
        <li><strong className="text-white">2. Mantené el equipo en su puesto.</strong> Si alguien se duerme o se va al café, mandalo "A su puesto" o arrastralo.</li>
        <li><strong className="text-white">3. ¡Acción!</strong> pasa de guion a preparación y a rodaje. <strong className="text-white">¡Corten!</strong> termina la toma.</li>
        <li><strong className="text-white">4. 📍 Escena</strong> cambia el lugar, la hora y el clima de la película.</li>
        <li><strong className="text-white">5.</strong> Con el botón Atrás del celular volvés al menú anterior.</li>
      </ol>
    );
  } else if (key === "story") {
    body = <StoryDirector onDecision={onStoryDecision} />;
  } else if (key === "studio") {
    body = <AdvisorPanel />;
  } else if (!canAct) {
    body = <p className="text-sm text-[#c8d4a8]">Preparando el set…</p>;
  } else if (key === "scene" && snap && director) {
    const warn = snap.continuity.warnings.length;
    body = (
      <div className="grid gap-2">
        <div className="rounded-lg border border-[#3d5a1e]/70 bg-[#0a0e06] p-3 text-sm">
          <p className="text-[10px] font-bold tracking-widest text-[#9fbf5a]">ESCENA {snap.scene.n} DE {snap.plan.length}</p>
          <p className="font-bold text-white">{snap.scene.title}</p>
          <p className="text-xs text-[#a8b88a]">{snap.scene.text}</p>
        </div>
        <Tile icon="📍" title="Lugar" value={snap.location.name} onClick={() => go("scene", "place")} />
        <Tile icon="🕐" title="Hora del día" value={snap.time} onClick={() => go("scene", "time")} />
        <Tile icon="🌦" title="Clima" value={snap.weather} onClick={() => go("scene", "weather")} />
        <Tile icon="🪑" title="Decorado" value={snap.autoDress ? "Automático" : "Manual"} onClick={() => go("scene", "dress")} />
        <Tile icon="🎞" title="Plan de 15 escenas" value={`Escena ${snap.scene.n}/${snap.plan.length}`} onClick={() => go("scene", "plan")} />
        <Tile icon="✍" title="Escribir guion" value="El motor elige el set" onClick={() => go("scene", "script")} />
        <Tile icon="🔁" title="Continuidad" value={warn ? `${warn} aviso${warn > 1 ? "s" : ""}` : "Todo en orden"} onClick={() => go("scene", "continuity")} />
        <Tile icon="🎭" title="Género" value={snap.genre} onClick={() => go("scene", "genre")} />
      </div>
    );
  } else if (key === "genre" && snap && director) {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {director.genres.map((g) => (
          <button key={g} type="button" className={big(g === snap.genre)} onClick={done(() => director.setGenre(g as Genre))}>{g}</button>
        ))}
      </div>
    );
  } else if (key === "place" && snap && director) {
    const list = locationsFor(snap.genre);
    body = (
      <div className="grid gap-2">
        <p className="text-sm text-[#c8d4a8]">Lugares para {snap.genre}. Tocá uno para usarlo.</p>
        <button type="button" className={`${tile} justify-center font-bold text-[#e2b340]`} onClick={done(() => director.autoPick())}>✨ Elegir según el guion</button>
        {list.map((l) => (
          <button key={l.id} type="button" className={big(l.id === snap.location.id) + " text-left"} onClick={done(() => director.setLocation(l.id))}>
            {l.id === snap.location.id ? "✓ " : ""}{l.name} <span className="text-xs font-normal text-[#a8b88a]">· {l.interior ? "interior" : "exterior"}</span>
          </button>
        ))}
      </div>
    );
  } else if (key === "time" && snap && director) {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {TIMES.map((t) => <button key={t} type="button" className={big(t === snap.time)} onClick={done(() => director.setTime(t as TimeOfDay))}>{{ amanecer: "🌅", día: "☀️", tarde: "🌇", noche: "🌙" }[t]} {t}</button>)}
      </div>
    );
  } else if (key === "weather" && snap && director) {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {WEATHERS.map((w) => <button key={w} type="button" className={big(w === snap.weather)} onClick={done(() => director.setWeather(w as Weather))}>{{ despejado: "☀️", nublado: "☁️", lluvia: "🌧", niebla: "🌫", nieve: "❄️" }[w]} {w}</button>)}
      </div>
    );
  } else if (key === "dress" && snap && director) {
    body = (
      <div className="grid gap-2">
        <button type="button" className={big(false)} onClick={() => director.reshuffle()}>🔀 Reordenar muebles y objetos</button>
        <button type="button" className={big(snap.autoDress)} onClick={() => director.setAutoDress(!snap.autoDress)}>{snap.autoDress ? "✓ " : ""}Decorado automático</button>
        <button type="button" className={big(snap.autoAdvance)} onClick={() => director.setAutoAdvance(!snap.autoAdvance)}>{snap.autoAdvance ? "✓ " : ""}Pasar a la siguiente escena tras cada toma</button>
        <p className="text-xs text-[#a8b88a]">Utilería en escena: {snap.continuity.props.length ? snap.continuity.props.map((p) => PROPS.find((x) => x.id === p.id)?.icon).join(" ") : "ninguna"}</p>
      </div>
    );
  } else if (key === "plan" && snap && director) {
    body = (
      <ol className="grid gap-1.5">
        {snap.plan.map((sc, i) => (
          <li key={sc.n}>
            <button type="button" className={big(i === snap.sceneIndex) + " w-full text-left !min-h-12"} onClick={() => { director.goScene(i); onClose(); }}>
              {sc.n}. {sc.title} <span className="block text-xs font-normal text-[#a8b88a]">{sc.time} · {sc.weather}</span>
            </button>
          </li>
        ))}
      </ol>
    );
  } else if (key === "script" && snap && director) {
    body = (
      <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); if (script.trim()) { director.applyScript(script.trim()); setScript(""); onClose(); } }}>
        <p className="text-sm text-[#c8d4a8]">Escribí una línea de guion y el motor elige lugar, hora y clima.</p>
        <textarea value={script} onChange={(e) => setScript(e.target.value)} rows={3} placeholder="Ej.: Llueve de noche en la estación de tren"
          className="w-full rounded-lg border border-[#3d5a1e] bg-[#0a0e06] p-3 text-sm text-white" />
        <button type="submit" className={`${big(true)} text-center`}>🎬 Montar escena</button>
      </form>
    );
  } else if (key === "continuity" && snap) {
    body = (
      <div className="grid gap-2 text-sm text-[#c8d4a8]">
        <p><strong className="text-white">Utilería:</strong> {snap.continuity.props.length ? snap.continuity.props.map((p) => { const d = PROPS.find((x) => x.id === p.id); return `${d?.icon} ${d?.label} (desde esc. ${p.since})`; }).join(" · ") : "ninguna"}</p>
        <p><strong className="text-white">Personajes:</strong> {snap.continuity.cast.map((c) => `${c.name}: ${c.costume}${c.wet ? " 💧" : ""}`).join(" · ")}</p>
        {snap.continuity.warnings.length === 0 ? <p>✓ Sin avisos.</p> : snap.continuity.warnings.map((w) => <p key={w} className="text-[#e8a090]">⚠ {w}</p>)}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/60 p-2 pb-[var(--bar-h,178px)] sm:items-center sm:pb-3" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#4a6b28] bg-[#12180c]/98 shadow-2xl" role="dialog" aria-label={TITLES[key] ?? key}>
        <div className="flex items-center gap-2 border-b border-[#3d5a1e] px-2 py-2">
          <button type="button" onClick={nav.back} className="sc-btn px-3 !min-h-10 text-sm" aria-label="Atrás">‹ Atrás</button>
          <div className="min-w-0 flex-1 text-center">
            <h2 className="truncate font-display text-base text-white">{TITLES[key] ?? key}</h2>
            {crumbs.length > 1 && <p className="truncate text-[10px] text-[#7a8f4a]">{crumbs.join(" › ")}</p>}
          </div>
          <button type="button" onClick={nav.forward} className="sc-btn px-2 !min-h-10 text-sm" aria-label="Adelante">›</button>
          <button type="button" onClick={onClose} className="sc-btn px-3 !min-h-10 text-sm" aria-label="Cerrar">✕</button>
        </div>
        <div className="min-h-0 overflow-y-auto p-3">{body}</div>
      </section>
    </div>
  );
}
