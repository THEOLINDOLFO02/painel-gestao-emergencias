import { useEffect, useRef, useState } from "react";

const MAX_STEPS = 50;
const GROUP_DELAY_MS = 400;

type Store<S> = {
  committed: S;
  past: S[];
  future: S[];
  timer?: number;
};

/**
 * Desfazer e refazer sobre um "snapshot" do projeto. Cada campo do snapshot é
 * imutável, então basta comparar referências. Alterações seguidas (arrastar,
 * digitar) viram um único passo.
 */
export function useHistory<S extends object>(
  snapshot: S,
  apply: (snapshot: S) => void,
) {
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const store = useRef<Store<S>>({ committed: snapshot, past: [], future: [] });
  const [flags, setFlags] = useState({ undo: false, redo: false });

  const differs = (a: S, b: S) =>
    (Object.keys(a) as (keyof S)[]).some((key) => a[key] !== b[key]);

  const syncFlags = () =>
    setFlags({
      undo: store.current.past.length > 0,
      redo: store.current.future.length > 0,
    });

  const commit = () => {
    const h = store.current;
    window.clearTimeout(h.timer);
    h.timer = undefined;
    if (!differs(h.committed, latest.current)) return;
    h.past = [...h.past.slice(-(MAX_STEPS - 1)), h.committed];
    h.committed = latest.current;
    h.future = [];
    syncFlags();
  };

  useEffect(() => {
    const h = store.current;
    window.clearTimeout(h.timer);
    h.timer = undefined;
    if (!differs(h.committed, snapshot)) {
      const canUndo = h.past.length > 0;
      setFlags((state) =>
        state.undo === canUndo ? state : { ...state, undo: canUndo },
      );
      return;
    }
    h.timer = window.setTimeout(commit, GROUP_DELAY_MS);
    // Já há algo para desfazer, mesmo antes do passo ser confirmado.
    setFlags((state) => (state.undo ? state : { ...state, undo: true }));
  });

  const undo = () => {
    commit();
    const h = store.current;
    const previous = h.past[h.past.length - 1];
    if (!previous) return;
    h.past = h.past.slice(0, -1);
    h.future = [...h.future, h.committed];
    h.committed = previous;
    apply(previous);
    syncFlags();
  };

  const redo = () => {
    commit();
    const h = store.current;
    const next = h.future[h.future.length - 1];
    if (!next) return;
    h.future = h.future.slice(0, -1);
    h.past = [...h.past, h.committed];
    h.committed = next;
    apply(next);
    syncFlags();
  };

  // Ajusta o ponto de partida sem criar um passo (ex.: imagens carregadas).
  const rebase = (patch: Partial<S>) => {
    store.current.committed = { ...store.current.committed, ...patch };
  };

  const actions = useRef({ undo, redo });
  actions.current = { undo, redo };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement;
      // Dentro de um campo de texto vale o desfazer nativo do navegador.
      if (target.isContentEditable || target.tagName === "INPUT") return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        actions.current.undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        actions.current.redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return { undo, redo, canUndo: flags.undo, canRedo: flags.redo, rebase };
}
