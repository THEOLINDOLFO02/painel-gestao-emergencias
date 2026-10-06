import type { Frame } from "./context";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const DEFAULT_FRAME: Frame = { zoom: 1, x: 0, y: 0 };

// Deslocamento máximo (em % da imagem) para a foto nunca deixar bordas vazias.
export const maxPan = (zoom: number) => ((zoom - 1) / 2) * 100;

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

export const MIN_OPACITY = 0.1;

export function clampFrame(frame: Frame): Frame {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, frame.zoom));
  const limit = maxPan(zoom);
  const result: Frame = {
    zoom,
    x: Math.round(clamp(frame.x, limit) * 10) / 10,
    y: Math.round(clamp(frame.y, limit) * 10) / 10,
  };
  if (frame.opacity !== undefined) {
    result.opacity = Math.round(Math.max(MIN_OPACITY, Math.min(1, frame.opacity)) * 100) / 100;
  }
  return result;
}

export const isDefaultFrame = (frame: Frame) =>
  frame.zoom === 1 &&
  frame.x === 0 &&
  frame.y === 0 &&
  (frame.opacity ?? 1) === 1;

export const frameTransform = (frame?: Frame) =>
  frame
    ? `translate(${frame.x}%, ${frame.y}%) scale(${frame.zoom})`
    : undefined;
