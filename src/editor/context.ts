import { createContext, useContext } from "react";
import type { BlockStyle } from "../DesignTools";

export type Position = {
  x: number;
  y: number;
};

// Estado de edição compartilhado pelos componentes do painel.
export type EditorState = {
  editMode: boolean;
  texts: Record<string, string>;
  setText: (key: string, value: string) => void;
  resetText: (key: string) => void;
  images: Record<string, string>;
  setImage: (id: string, image?: string) => void;
  positions: Record<string, Position>;
  setPosition: (id: string, position: Position) => void;
  blockStyles: Record<string, BlockStyle>;
  selectedBlock: string | null;
  selectBlock: (id: string) => void;
};

export const EditorContext = createContext<EditorState>({
  editMode: false,
  texts: {},
  setText: () => {},
  resetText: () => {},
  images: {},
  setImage: () => {},
  positions: {},
  setPosition: () => {},
  blockStyles: {},
  selectedBlock: null,
  selectBlock: () => {},
});

export const useEditor = () => useContext(EditorContext);

const BLOCK_LABELS: Record<string, string> = {
  header: "Cabeçalho",
  "phase-1": "Fase 1 — Monitoramento",
  "phase-2": "Fase 2 — Triagem",
  "phase-3": "Fase 3 — Comando",
  "phase-4": "Fase 4 — Intervenção",
  "phase-5": "Fase 5 — Desmobilização",
  "monitor-map-card": "Mapa de risco",
  "monitor-radar-card": "Radar meteorológico",
  "monitor-indicators-card": "Indicadores",
  "monitor-rain-card": "Precipitação",
  "triage-small-card": "Nível 01",
  "triage-large-card": "Nível 02",
  "command-card": "Posto de comando",
};

export const blockLabel = (id: string) => {
  if (BLOCK_LABELS[id]) return BLOCK_LABELS[id];
  const code = id.split("-").pop();
  if (id.startsWith("intervention-card")) return `Intervenção ${code}`;
  if (id.startsWith("demobilization-card")) return `Desmobilização ${code}`;
  return id;
};
