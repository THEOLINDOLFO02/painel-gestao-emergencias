import type { Frame } from "./context";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const DEFAULT_FRAME: Frame = { zoom: 1, x: 0, y: 0 };

// Deslocamento máximo (em % da imagem) para a foto nunca deixar bordas vazias.
export const maxPan = (zoom: number) => ((zoom - 1) / 2) * 100;

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

export function clampFrame(frame: Frame): Frame {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, frame.zoom));
  const limit = maxPan(zoom);
  return {
    zoom,
    x: Math.round(clamp(frame.x, limit) * 10) / 10,
    y: Math.round(clamp(frame.y, limit) * 10) / 10,
  };
}

export const isDefaultFrame = (frame: Frame) =>
  frame.zoom === 1 && frame.x === 0 && frame.y === 0;

export const frameTransform = (frame?: Frame) =>
  frame
    ? `translate(${frame.x}%, ${frame.y}%) scale(${frame.zoom})`
    : undefined;
