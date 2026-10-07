import type { Frame } from "./context";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const MIN_OPACITY = 0.1;
export const DEFAULT_FRAME: Frame = { zoom: 1, x: 0, y: 0 };

// Deslocamento máximo (em % da imagem) para a foto nunca deixar bordas vazias.
export const maxPan = (zoom: number) => ((zoom - 1) / 2) * 100;

const clamp = (value: number, limit: number) =>
  Math.max(-limit, Math.min(limit, value));

/** Arredonda para múltiplos de 90° e leva para 0, 90, 180 ou 270. */
export const normalizeRotation = (degrees: number) =>
  ((Math.round(degrees / 90) * 90) % 360 + 360) % 360;

/** Gira 90° para um lado (1 = horário, -1 = anti-horário). */
export const turn = (rotate: number | undefined, direction: 1 | -1) =>
  normalizeRotation((rotate ?? 0) + direction * 90);

export function clampFrame(frame: Frame): Frame {
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, frame.zoom));
  const limit = maxPan(zoom);
  const result: Frame = {
    zoom,
    x: Math.round(clamp(frame.x, limit) * 10) / 10,
    y: Math.round(clamp(frame.y, limit) * 10) / 10,
  };
  if (frame.opacity !== undefined) {
    result.opacity =
      Math.round(Math.max(MIN_OPACITY, Math.min(1, frame.opacity)) * 100) / 100;
  }
  const rotate = normalizeRotation(frame.rotate ?? 0);
  if (rotate) result.rotate = rotate;
  if (frame.flipX) result.flipX = true;
  if (frame.flipY) result.flipY = true;
  return result;
}

export const isDefaultFrame = (frame: Frame) =>
  frame.zoom === 1 &&
  frame.x === 0 &&
  frame.y === 0 &&
  (frame.opacity ?? 1) === 1 &&
  !frame.rotate &&
  !frame.flipX &&
  !frame.flipY;

/** Zoom e deslocamento: aplicados ao quadro que envolve a foto. */
export const frameTransform = (frame?: Frame) =>
  frame
    ? `translate(${frame.x}%, ${frame.y}%) scale(${frame.zoom})`
    : undefined;

/**
 * Copia os ajustes de uma foto para outra. Sem `includePosition`, a foto de
 * destino mantém a própria posição (ajustada ao novo zoom).
 */
export function copyFrame(
  source: Frame,
  target: Frame | undefined,
  includePosition: boolean,
): Frame {
  const own = target ?? DEFAULT_FRAME;
  return clampFrame({
    ...source,
    x: includePosition ? source.x : own.x,
    y: includePosition ? source.y : own.y,
  });
}
