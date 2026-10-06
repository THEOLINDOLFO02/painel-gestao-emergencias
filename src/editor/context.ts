import { createContext, useContext } from "react";
import type { BlockStyle } from "./theme";

export type Position = {
  x: number;
  y: number;
};

// Tamanho manual de um bloco, em px (ausente = tamanho automático).
export type Size = {
  w?: number;
  h?: number;
};

// Enquadramento de uma foto: zoom (1 = ajustada), deslocamento em % da imagem
// e opacidade (1 = opaca; ausente = opaca).
export type Frame = {
  zoom: number;
  x: number;
  y: number;
  opacity?: number;
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
  sizes: Record<string, Size>;
  setSize: (id: string, size?: Size) => void;
  frames: Record<string, Frame>;
  setFrame: (id: string, frame?: Frame) => void;
  stacks: Record<string, number>;
  setStack: (id: string, stack?: number) => void;
  selectedImage: string | null;
  selectImage: (id: string | null) => void;
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
  sizes: {},
  setSize: () => {},
  frames: {},
  setFrame: () => {},
  stacks: {},
  setStack: () => {},
  selectedImage: null,
  selectImage: () => {},
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
