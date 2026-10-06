// Contraste de cores pela fórmula da WCAG 2 (relação entre luminâncias).

const hexToRgb = (hex: string): [number, number, number] | null => {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const channel = (value: number) => {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export function contrastRatio(foreground: string, background: string) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return null;
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

// Mínimo da WCAG AA para texto comum.
export const MIN_CONTRAST = 4.5;

export type ContrastWarning = { label: string; ratio: number };

// Lista os pares de cores (texto/fundo) abaixo do mínimo.
export function contrastWarnings(
  pairs: { label: string; foreground: string; background: string }[],
): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  for (const { label, foreground, background } of pairs) {
    const ratio = contrastRatio(foreground, background);
    if (ratio !== null && ratio < MIN_CONTRAST) warnings.push({ label, ratio });
  }
  return warnings;
}

export const formatRatio = (ratio: number) =>
  `${ratio.toFixed(1).replace(".", ",")}:1`;
