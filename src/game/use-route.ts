import { useCallback, useEffect, useRef, useState } from "react";

/** Ruta de menús como pila de textos, sincronizada con el historial del navegador:
 *  el botón Atrás/Adelante del celular recorre los menús. */
export function useRoute(initial: string[]) {
  const [route, setRoute] = useState<string[]>(initial);
  const initialRef = useRef(initial);

  useEffect(() => {
    try { window.history.replaceState({ ...(window.history.state ?? {}), px: initialRef.current }, ""); } catch { /* sin historial */ }
    const onPop = (e: PopStateEvent) => {
      const r = (e.state as { px?: unknown } | null)?.px;
      setRoute(Array.isArray(r) && r.every((x) => typeof x === "string") ? (r as string[]) : initialRef.current);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const push = useCallback((next: string[]) => {
    try { window.history.pushState({ ...(window.history.state ?? {}), px: next }, ""); } catch { /* sin historial */ }
    setRoute(next);
  }, []);
  const back = useCallback(() => {
    try { window.history.back(); } catch { setRoute(initialRef.current); }
  }, []);
  const forward = useCallback(() => {
    try { window.history.forward(); } catch { /* nada */ }
  }, []);
  return { route, push, back, forward };
}
