import { useEffect, useState } from "react";
import {
  ADVISORS_FOR_HIRE,
  advisorOffers,
  applyAdvisorOption,
  developmentSummary,
  hireAdvisor,
  loadDevelopment,
  resetDevelopment,
  saveDevelopment,
  skipDay,
  type DevelopmentState,
} from "@/game/development";
import { REUNION_ROOM_URL } from "@/game/reunion-asset";

const statusLabel = {
  borrador: "Borrador",
  "en-revision": "En revisión",
  aprobada: "Aprobada",
} as const;

export function AdvisorPanel({ onScriptApproved }: { onScriptApproved?: () => void }) {
  const [dev, setDev] = useState<DevelopmentState>(loadDevelopment);
  const [selectedAdvisor, setSelectedAdvisor] = useState<string | null>(null);

  useEffect(() => {
    saveDevelopment(dev);
    if (dev.approved) onScriptApproved?.();
  }, [dev, onScriptApproved]);

  const offers = advisorOffers(dev);
  const summary = developmentSummary(dev);
  const active = offers.find((a) => a.id === selectedAdvisor) ?? offers[0] ?? null;

  const update = (next: DevelopmentState) => {
    setDev(next);
    if (next.hired.length && !selectedAdvisor) setSelectedAdvisor(next.hired[0]!);
  };

  return (
    <section className="mt-3 overflow-hidden rounded-lg border border-primary/40 bg-surface">
      <div className="relative aspect-[16/7] w-full bg-bg">
        <img
          src={REUNION_ROOM_URL}
          alt="Sala de reunión"
          className="h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xs font-bold tracking-[0.18em] text-primary">SALA DE REUNIÓN · DESARROLLO DE GUION</p>
          <h2 className="font-display text-2xl text-fg">{dev.projectTitle}</h2>
          <p className="text-sm text-muted">
            Sol y Rey discuten el guion. Los asesores cobran por sesión; cada nota cuesta días y plata hasta aprobar.
          </p>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-4">
        <div className="rounded-md bg-bg p-3">
          <p className="text-[10px] font-bold tracking-widest text-muted">PRESUPUESTO</p>
          <p className="font-display text-2xl text-primary">${dev.budget.toLocaleString("es-AR")}</p>
        </div>
        <div className="rounded-md bg-bg p-3">
          <p className="text-[10px] font-bold tracking-widest text-muted">DÍA DE DESARROLLO</p>
          <p className="font-display text-2xl text-fg">{dev.day}</p>
        </div>
        <div className="rounded-md bg-bg p-3">
          <p className="text-[10px] font-bold tracking-widest text-muted">APROBACIÓN GUION</p>
          <p className="font-display text-2xl text-fg">{dev.approval}%</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-primary" style={{ width: `${dev.approval}%` }} />
          </div>
        </div>
        <div className="rounded-md bg-bg p-3">
          <p className="text-[10px] font-bold tracking-widest text-muted">ESCENAS</p>
          <p className="font-display text-2xl text-fg">
            {summary.approvedScenes}/{summary.sceneCount}
          </p>
          <p className="text-xs text-muted">{summary.totalMinutes} min · ${summary.totalSceneCost.toLocaleString("es-AR")}</p>
        </div>
      </div>

      {dev.approved ? (
        <div className="mx-4 mb-4 rounded-md border border-primary bg-primary/10 p-4">
          <p className="text-sm font-semibold text-fg">Guion aprobado. Rey puede bajar al set.</p>
          <p className="mt-1 text-xs text-muted">
            Desarrollo: {dev.day} días · Presupuesto restante ${dev.budget.toLocaleString("es-AR")}.
          </p>
          <button
            type="button"
            className="mt-3 min-h-10 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-fg"
            onClick={() => update(resetDevelopment(dev.projectTitle))}
          >
            Reiniciar desarrollo
          </button>
        </div>
      ) : (
        <>
          <div className="px-4">
            <h3 className="text-xs font-bold tracking-widest text-muted">CONTRATAR ASESORES (cobran por entrar a la sala)</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ADVISORS_FOR_HIRE.map((a) => {
                const hired = dev.hired.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    disabled={hired || dev.budget < a.fee}
                    onClick={() => {
                      const next = hireAdvisor(dev, a.id);
                      update(next);
                      setSelectedAdvisor(a.id);
                    }}
                    className={`rounded-md border p-3 text-left ${hired ? "border-primary bg-primary/10" : "border-border bg-bg hover:border-primary"} disabled:opacity-40`}
                  >
                    <span className="block text-sm font-bold text-fg">{a.name}</span>
                    <span className="block text-xs text-primary">{a.role} · {a.specialty}</span>
                    <span className="mt-1 block text-xs text-muted">
                      {hired ? "En la mesa" : `Honorarios $${a.fee.toLocaleString("es-AR")} · +1 día`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 px-4">
            <h3 className="text-xs font-bold tracking-widest text-muted">DESGLOSE POR ESCENAS</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="py-1 pr-2 font-semibold">Escena</th>
                    <th className="py-1 pr-2 font-semibold">Propósito</th>
                    <th className="py-1 pr-2 font-semibold">Min</th>
                    <th className="py-1 pr-2 font-semibold">Estado</th>
                    <th className="py-1 pr-2 font-semibold">Días</th>
                    <th className="py-1 font-semibold">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {dev.scenes.map((s) => (
                    <tr key={s.id} className="border-t border-border/60">
                      <td className="py-1.5 pr-2 font-semibold text-fg">{s.title}</td>
                      <td className="py-1.5 pr-2 text-muted">{s.purpose}</td>
                      <td className="py-1.5 pr-2 text-fg">{s.minutes}</td>
                      <td className="py-1.5 pr-2 text-fg">{statusLabel[s.status]}</td>
                      <td className="py-1.5 pr-2 text-fg">{s.daysSpent}</td>
                      <td className="py-1.5 text-fg">${s.cost.toLocaleString("es-AR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {dev.hired.length === 0 ? (
            <p className="mx-4 mt-4 mb-2 text-sm text-muted">
              Contratá al menos un asesor para que Sol reciba notas y pueda reescribir ida y vuelta con Rey.
            </p>
          ) : (
            <div className="m-4 grid gap-3 md:grid-cols-[12rem_1fr]">
              <div className="flex flex-col gap-1">
                {offers.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAdvisor(a.id)}
                    className={`rounded-md border px-2 py-2 text-left text-sm ${active?.id === a.id ? "border-primary text-primary" : "border-border text-fg"}`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
              <div className="rounded-md border border-border bg-bg p-3">
                {active ? (
                  <>
                    <p className="text-xs font-bold tracking-widest text-primary">{active.role.toUpperCase()}</p>
                    <p className="text-sm text-muted">{active.name} — {active.specialty}</p>
                    <p className="mt-2 text-sm text-fg">
                      Sol escucha. Rey discute. Elegí una nota para que la guionista reescriba (cuesta días y plata).
                    </p>
                    <div className="mt-3 grid gap-2">
                      {active.options.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => update(applyAdvisorOption(dev, active.id, opt.id))}
                          className="rounded-md border border-border bg-surface p-3 text-left hover:border-primary"
                        >
                          <span className="block text-sm font-bold text-fg">{opt.label}</span>
                          <span className="mt-1 block text-xs text-muted">{opt.detail}</span>
                          <span className="mt-2 block text-xs text-primary">
                            +{opt.approvalDelta}% aprobación · {opt.daysCost} día(s) · rewrite ${opt.rewriteCost.toLocaleString("es-AR")}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 px-4 pb-4">
            <button
              type="button"
              onClick={() => update(skipDay(dev))}
              className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-fg"
            >
              Pasar el día sin acuerdo (−$1.500)
            </button>
            <button
              type="button"
              onClick={() => update(resetDevelopment(dev.projectTitle))}
              className="min-h-10 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-muted"
            >
              Reiniciar desarrollo
            </button>
          </div>
        </>
      )}

      <div className="max-h-32 overflow-y-auto border-t border-border bg-bg px-4 py-3 text-xs text-muted">
        {dev.log.map((line, i) => (
          <p key={`${i}-${line.slice(0, 12)}`} className="mb-1">
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
