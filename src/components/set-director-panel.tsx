import { useState } from "react";
import { Shuffle, SkipForward, Wand2 } from "lucide-react";
import { LOCATIONS, PROPS, TIMES, WEATHERS, locationsFor, type Genre, type TimeOfDay, type Weather } from "@/game/scenery";
import type { SetDirector, SetSnapshot } from "@/game/set-director";

const sel = "min-h-11 w-full rounded-md border border-border bg-bg px-2 text-sm text-fg";
const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-fg hover:border-primary hover:text-primary";

export function SetDirectorPanel({ snap, director }: { snap: SetSnapshot; director: SetDirector }) {
  const [script, setScript] = useState("");
  const locs = locationsFor(snap.genre);
  const options = locs.some((l) => l.id === snap.location.id) ? locs : [...locs, snap.location];
  return (
    <section className="grid gap-3 rounded-md border border-border bg-surface p-3" aria-label="Puesta en escena">
      <div>
        <p className="text-xs font-bold tracking-[0.16em] text-primary">PUESTA EN ESCENA · ESCENA {snap.scene.n}/{snap.plan.length}</p>
        <p className="mt-1 text-sm font-semibold text-fg">{snap.scene.title} — <span className="font-normal text-muted">{snap.scene.text}</span></p>
        <p className="mt-1 text-xs text-muted">{snap.location.name} · {snap.time} · {snap.weather} · {snap.lighting.label}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs text-muted">Género
          <select className={sel} value={snap.genre} onChange={(e) => director.setGenre(e.target.value as Genre)}>
            {director.genres.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted">Localización
          <select className={sel} value={snap.location.id} onChange={(e) => director.setLocation(e.target.value)}>
            {options.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted">Hora del día
          <select className={sel} value={snap.time} onChange={(e) => director.setTime(e.target.value as TimeOfDay)}>
            {TIMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="text-xs text-muted">Clima
          <select className={sel} value={snap.weather} onChange={(e) => director.setWeather(e.target.value as Weather)}>
            {WEATHERS.map((w) => <option key={w}>{w}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => director.autoPick()}><Wand2 className="size-4" /> Elegir set según guion</button>
        <button type="button" className={btn} onClick={() => director.reshuffle()}><Shuffle className="size-4" /> Reordenar muebles</button>
        <button type="button" className={btn} onClick={() => director.nextScene()}><SkipForward className="size-4" /> Escena siguiente</button>
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-fg">
          <input type="checkbox" checked={snap.autoAdvance} onChange={(e) => director.setAutoAdvance(e.target.checked)} /> Avanzar escena tras cada toma
        </label>
      </div>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (script.trim()) { director.applyScript(script.trim()); setScript(""); } }}>
        <input className={`${sel} flex-1`} value={script} onChange={(e) => setScript(e.target.value)} placeholder="Escribí una línea de guion: «Llueve de noche en la estación…»" />
        <button type="submit" className={btn}>Montar</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold tracking-widest text-muted">CONTINUIDAD</p>
          <p className="mt-1 text-sm text-fg">
            {snap.continuity.props.length === 0 ? "Sin utilería." : snap.continuity.props.map((p) => {
              const d = PROPS.find((x) => x.id === p.id); return `${d?.icon ?? ""} ${d?.label ?? p.id} (desde esc. ${p.since})`;
            }).join(" · ")}
          </p>
          <p className="mt-1 text-sm text-fg">
            {snap.continuity.cast.map((c) => `${c.name}: ${c.costume}${c.wet ? " 💧" : ""}`).join(" · ")}
          </p>
          {snap.continuity.warnings.slice(0, 3).map((w) => <p key={w} className="mt-1 text-xs text-danger">⚠ {w}</p>)}
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest text-muted">PLAN DE 15 ESCENAS · {LOCATIONS.length} SETS</p>
          <ol className="mt-1 grid max-h-40 gap-1 overflow-y-auto text-xs">
            {snap.plan.map((sc, i) => (
              <li key={sc.n}>
                <button type="button" onClick={() => director.goScene(i)}
                  className={`w-full rounded px-2 py-1 text-left ${i === snap.sceneIndex ? "bg-primary/20 text-primary" : "text-muted hover:text-fg"}`}>
                  {sc.n}. {sc.title} · {LOCATIONS.find((l) => l.id === sc.locationId)?.name} · {sc.time}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
