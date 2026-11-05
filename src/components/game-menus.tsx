import { useState, type ReactNode } from "react";
import { PROPS, TIMES, WEATHERS, locationsFor, type Genre, type TimeOfDay, type Weather } from "@/game/scenery";
import type { SetDirector, SetSnapshot } from "@/game/set-director";
import { StoryDirector } from "@/components/story-director";
import { AdvisorPanel } from "@/components/advisor-panel";
import type { StoryChoice } from "@/game/story-engine";
import type { Hud } from "@/game/sim";
import type { CrewId } from "@/game/crew";

type Nav = { back: () => void; forward: () => void; push: (r: string[]) => void };
type Props = {
  hud: Hud;
  path: string[]; // ruta dentro del juego, p. ej. ["scene","place"]
  snap: SetSnapshot | null;
  director: SetDirector | null;
  nav: Nav;
  onClose: () => void;
  onMainMenu: () => void;
  onStoryDecision: (c: StoryChoice) => void;
  onOrder: (crewId: CrewId, orderId: string) => void;
  onStaff: (action: "hire1" | "hire2" | "upgrade" | "fire", crewId: CrewId) => void;
};

const TITLES: Record<string, string> = {
  opts: "Opciones", missions: "Misiones", departments: "Departamentos", production: "Producción y presupuesto", staff: "Contratación", scene: "Dirigir escena", genre: "Género", place: "Lugar", time: "Hora del día", weather: "Clima",
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
export function GameMenus({ hud, path, snap, director, nav, onClose, onMainMenu, onStoryDecision, onOrder, onStaff }: Props) {
  const [script, setScript] = useState("");
  const [confirmFire, setConfirmFire] = useState<string | null>(null);
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
        <Tile icon="💰" title="Producción y presupuesto" value={`${(hud.budget ?? 0) < 0 ? "-" : ""}$${Math.abs(hud.budget ?? 0).toLocaleString("es-AR")} · sueldos $${hud.payroll ?? 0} por toma`} onClick={() => go("production")} />
        <Tile icon="👥" title="Contratación" value="Contratar, ascender o despedir" onClick={() => go("staff")} />
        <Tile icon="🏭" title="Departamentos" value={(hud.alerts?.length ?? 0) > 0 ? `⚠ ${hud.alerts![0]}` : "Estado y órdenes de cada área"} onClick={() => go("departments")} />
        <Tile icon="🎯" title="Misiones" value={`Capítulo ${hud.chapterIndex ?? 1}/${hud.chapterCount ?? 1}`} onClick={() => go("missions")} />
        <Tile icon="📍" title="Dirigir escena" value="Lugar, hora, clima y decorado" onClick={() => go("scene")} />
        <Tile icon="📜" title="Historia" value="Decisiones del guion" onClick={() => go("story")} />
        <Tile icon="🏢" title="Estudio y asesores" value="Presupuesto y reuniones" onClick={() => go("studio")} />
        <Tile icon="❓" title="Cómo jugar" onClick={() => go("help")} />
        <Tile icon="🏠" title="Menú principal" value="Elegir otra historia" onClick={onMainMenu} />
      </div>
    );
  } else if (key === "missions") {
    const ms = hud.missions ?? [];
    const row = (m: (typeof ms)[number]) => (
      <li key={m.id} className="rounded-lg border border-[#3d5a1e] bg-[#0f140a] p-3">
        <p className="flex items-center justify-between gap-2 text-sm font-bold text-white"><span>{m.done ? "✓ " : ""}{m.label}</span><span className="text-[#e2b340]">{m.progress}/{m.target}</span></p>
        <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#1c2a10]"><i className="block h-full bg-[#9fbf5a]" style={{ width: `${(m.progress / m.target) * 100}%` }} /></div>
        <p className="mt-1 text-xs text-[#a8b88a]">{m.hint}</p>
        {m.reward && <p className="mt-1 text-xs text-[#e2b340]">Recompensa: {m.reward.label}{m.claimed ? " (cobrada)" : ""}</p>}
      </li>
    );
    body = (
      <div className="grid gap-3">
        <div className="rounded-lg border border-[#3d5a1e]/70 bg-[#0a0e06] p-3 text-sm">
          <p className="text-[10px] font-bold tracking-widest text-[#9fbf5a]">{(hud.storyTitle ?? "").toUpperCase()} · CAPÍTULO {hud.chapterIndex}/{hud.chapterCount}</p>
          <p className="font-bold text-white">{hud.chapterTitle}</p>
          <p className="text-xs text-[#a8b88a]">{hud.chapterBriefing}</p>
          <p className="mt-1 text-xs text-[#e2b340]">Intentos: {"♥".repeat(hud.lives ?? 0)}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-[#9fbf5a]">OBLIGATORIAS · para pasar de capítulo</p>
          <ul className="grid gap-2">{ms.filter((m) => m.required).map(row)}</ul>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-[#9fbf5a]">OPCIONALES · con recompensa en el set</p>
          <ul className="grid gap-2">{ms.filter((m) => !m.required).map(row)}</ul>
        </div>
      </div>
    );
  } else if (key === "production") {
    const m = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString("es-AR")}`;
    const budget = hud.budget ?? 0;
    const ledger = hud.ledger ?? [];
    body = (
      <div className="grid gap-3">
        <div className="rounded-lg border border-[#3d5a1e]/70 bg-[#0a0e06] p-3 text-center">
          <p className="text-[10px] font-bold tracking-widest text-[#9fbf5a]">PRESUPUESTO</p>
          <p className={`font-display text-3xl ${budget < 0 ? "text-[#f0a090]" : "text-[#e2b340]"}`}>{m(budget)}</p>
          <p className="text-xs text-[#a8b88a]">Sueldos: {m(hud.payroll ?? 0)} por toma · Hype: {hud.hype ?? 0}%</p>
          {budget < 0 && <p className="mt-1 text-xs text-[#f0a090]">En números rojos: no se puede contratar. Con -$3.000 el estudio quiebra.</p>}
        </div>
        <div className="rounded-lg border border-[#3d5a1e] bg-[#0f140a] p-3 text-xs text-[#c8d4a8]">
          <p className="font-bold text-white">¿Cómo se gana dinero?</p>
          <p>Cada toma paga $900 por estrella y $600 más si es buena. Cada capítulo cerrado da $2.000. Después se descuentan los sueldos de todo el equipo.</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold tracking-widest text-[#9fbf5a]">ÚLTIMOS MOVIMIENTOS</p>
          {ledger.length === 0 ? <p className="text-sm text-[#a8b88a]">Todavía no hay movimientos.</p> : (
            <ul className="grid gap-1">
              {ledger.map((l) => <li key={l.id} className="flex justify-between gap-2 rounded border border-[#2a3a18] bg-[#0f140a] px-2 py-1.5 text-sm text-white"><span className="truncate">{l.label}</span><span className={l.amount < 0 ? "text-[#f0a090]" : "text-[#9fbf5a]"}>{l.amount < 0 ? "" : "+"}{m(l.amount)}</span></li>)}
            </ul>
          )}
        </div>
        <button type="button" className={big(false)} onClick={() => go("staff")}>👥 Ir a Contratación</button>
      </div>
    );
  } else if (key === "staff") {
    const m = (n: number) => `$${n.toLocaleString("es-AR")}`;
    const budget = hud.budget ?? 0;
    const names = Object.fromEntries((hud.people ?? []).map((p) => [p.id, `${p.name} · ${p.role}`]));
    const color = { 0: "#7a8f4a", 1: "#9fbf5a", 2: "#e2b340" } as const;
    body = (
      <div className="grid gap-2">
        <p className="text-xs text-[#a8b88a]">Presupuesto: <strong className="text-white">{budget < 0 ? "-" : ""}{m(Math.abs(budget))}</strong>. Un puesto vacante saca a la persona del mapa y su área deja de funcionar. Los senior dan órdenes más fuertes y con menos espera.</p>
        {(hud.staff ?? []).map((st) => (
          <div key={st.id} className="rounded-lg border border-[#3d5a1e] bg-[#0f140a] p-3">
            <p className="flex items-center justify-between gap-2 text-sm font-bold text-white"><span className="min-w-0 truncate">{names[st.id] ?? st.id}</span><span className="shrink-0 text-xs" style={{ color: color[st.level] }}>{st.levelName}{st.salary ? ` · ${m(st.salary)}/toma` : ""}</span></p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {st.hireJunior !== null && <button type="button" className={big(false) + " !min-h-11 text-xs"} onClick={() => onStaff("hire1", st.id)}>🤝 Contratar junior<span className="block text-[10px] font-normal text-[#a8b88a]">{m(st.hireJunior)}</span></button>}
              {st.hireSenior !== null && <button type="button" className={big(false) + " !min-h-11 text-xs"} onClick={() => onStaff("hire2", st.id)}>⭐ Contratar senior<span className="block text-[10px] font-normal text-[#a8b88a]">{m(st.hireSenior)}</span></button>}
              {st.upgrade !== null && <button type="button" className={big(false) + " !min-h-11 text-xs"} onClick={() => onStaff("upgrade", st.id)}>⭐ Ascender a senior<span className="block text-[10px] font-normal text-[#a8b88a]">{m(st.upgrade)}</span></button>}
              {st.canFire && (
                <button type="button" className={`min-h-11 rounded-lg border-2 px-2 py-1 text-xs font-bold ${confirmFire === st.id ? "border-[#d4533c] bg-[#3a1814] text-[#f0a090]" : "border-[#3d5a1e] bg-[#0f140a] text-white"}`}
                  onClick={() => { if (confirmFire === st.id) { onStaff("fire", st.id); setConfirmFire(null); } else setConfirmFire(st.id); }}>
                  {confirmFire === st.id ? "Tocá otra vez: despedir" : "👋 Despedir"}<span className="block text-[10px] font-normal text-[#a8b88a]">Indemnización {m(st.severance)}</span>
                </button>
              )}
              {st.id === "director" && <p className="col-span-2 text-xs text-[#7a8f4a]">La dirección no se puede despedir.</p>}
            </div>
          </div>
        ))}
      </div>
    );
  } else if (key === "departments") {
    const ds = hud.departments ?? [];
    const color = { ok: "#9fbf5a", weak: "#e2b340", out: "#d4533c", boost: "#6ac8e8" } as const;
    const label = { ok: "OK", weak: "Débil", out: "Fuera", boost: "Reforzado" } as const;
    body = (
      <div className="grid gap-2">
        <p className="text-xs text-[#a8b88a]">Cada área afecta la toma de forma distinta. Si alguien no está en su puesto, sufre su efecto. Tocá una orden para darla.</p>
        {ds.map((d) => (
          <div key={d.id} className="rounded-lg border bg-[#0f140a] p-3" style={{ borderColor: color[d.status] + "88" }}>
            <p className="flex items-center justify-between gap-2 text-sm font-bold text-white"><span>{d.name} <span className="text-[10px] font-normal text-[#7a8f4a]">· {d.channel}</span></span><span className="text-xs" style={{ color: color[d.status] }}>{label[d.status]} {d.efficiency}%</span></p>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-[#1c2a10]"><i className="block h-full" style={{ width: `${d.efficiency}%`, background: color[d.status] }} /></div>
            <p className="mt-1 text-xs text-[#c8d4a8]">{d.effect}</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {d.orders.map((o) => (
                <button key={o.id} type="button" disabled={!o.ready} onClick={() => onOrder(d.id, o.id)}
                  className={`min-h-11 rounded-lg border px-2 py-1 text-left text-xs font-bold ${o.ready ? "border-[#e2b340] bg-[#2a2410] text-[#e2b340]" : "border-[#3d5a1e] bg-[#0a0e06] text-[#7a8f4a] opacity-70"}`}>
                  {o.ready ? o.icon : `${o.cooldownLeft}s`} {o.label}<span className="block text-[10px] font-normal text-[#a8b88a]">{o.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-[#e2b340]">Hype del estudio: {hud.hype ?? 0}% (con 50% o más una buena toma gana una estrella extra).</p>
      </div>
    );
  } else if (key === "help") {
    body = (
      <ol className="grid gap-3 text-sm text-[#c8d4a8]">
        <li><strong className="text-white">1. Tocá un personaje</strong> (en el mapa o en los iconos de la derecha) para ver sus órdenes abajo.</li>
        <li><strong className="text-white">2. Mantené el equipo en su puesto.</strong> Si alguien se duerme o se va al café, mandalo "A su puesto" o arrastralo.</li>
        <li><strong className="text-white">3. ¡Acción!</strong> pasa de guion a preparación y a rodaje. <strong className="text-white">¡Corten!</strong> termina la toma.</li>
        <li><strong className="text-white">4. Cada rol tiene 2 órdenes propias</strong> (botones verdes al tocarlo). Si un área no está en su puesto, la toma lo sufre: mirá 🏭 Departamentos.</li>
        <li><strong className="text-white">5. 📍 Escena</strong> cambia el lugar, la hora y el clima de la película.</li>
        <li><strong className="text-white">6.</strong> Con el botón Atrás del celular volvés al menú anterior.</li>
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
