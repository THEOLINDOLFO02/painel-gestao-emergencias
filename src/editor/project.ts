import type { Shape } from "./shapes";
import { type BlockStyle, DEFAULT_THEME, type Theme } from "./theme";
import type { Frame, Position, Size } from "./context";

export type ProjectData = {
  texts: Record<string, string>;
  images: Record<string, string>;
  theme: Theme;
  blockStyles: Record<string, BlockStyle>;
  shapes: Shape[];
  positions: Record<string, Position>;
  sizes: Record<string, Size>;
  frames: Record<string, Frame>;
  stacks: Record<string, number>;
};

const APP_ID = "painel-defesa-civil";

const isRecord = (value: unknown): value is Record<string, never> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function downloadProject(data: ProjectData) {
  const project = {
    app: APP_ID,
    version: 1,
    texts: data.texts,
    images: data.images,
    theme: data.theme,
    blocks: data.blockStyles,
    shapes: data.shapes,
    positions: data.positions,
    sizes: data.sizes,
    frames: data.frames,
    stacks: data.stacks,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(project)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "painel-defesa-civil.json";
  link.click();
  URL.revokeObjectURL(url);
}

// Lê um arquivo de projeto; lança erro se não for um projeto deste painel.
export async function readProjectFile(file: File): Promise<ProjectData> {
  const project = JSON.parse(await file.text());
  if (!isRecord(project) || project.app !== APP_ID) {
    throw new Error("Arquivo inválido");
  }
  return {
    texts: isRecord(project.texts) ? project.texts : {},
    images: isRecord(project.images) ? project.images : {},
    theme: {
      ...DEFAULT_THEME,
      ...(isRecord(project.theme) ? project.theme : {}),
    },
    blockStyles: isRecord(project.blocks) ? project.blocks : {},
    shapes: Array.isArray(project.shapes) ? project.shapes : [],
    positions: isRecord(project.positions) ? project.positions : {},
    sizes: isRecord(project.sizes) ? project.sizes : {},
    frames: isRecord(project.frames) ? project.frames : {},
    stacks: isRecord(project.stacks) ? project.stacks : {},
  };
}

// Abre o seletor de arquivos do navegador e entrega o arquivo escolhido.
export function pickFile(accept: string, onPick: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) onPick(file);
  };
  input.click();
}
