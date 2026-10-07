import { describe, expect, it } from "vitest";
import { orientedSize } from "./orient";
import { contrastRatio, contrastWarnings, formatRatio } from "./contrast";
import {
  clampFrame,
  copyFrame,
  frameTransform,
  isDefaultFrame,
  maxPan,
  normalizeRotation,
  turn,
} from "./frame";

describe("contraste", () => {
  it("calcula a razão pela fórmula da WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });

  it("não depende da ordem texto/fundo", () => {
    expect(contrastRatio("#123456", "#fedcba")).toBeCloseTo(
      contrastRatio("#fedcba", "#123456")!,
      5,
    );
  });

  it("ignora cores inválidas", () => {
    expect(contrastRatio("vermelho", "#fff")).toBeNull();
  });

  it("avisa só os pares abaixo de 4,5:1", () => {
    const warnings = contrastWarnings([
      { label: "bom", foreground: "#eef4f8", background: "#070d14" },
      { label: "ruim", foreground: "#1b2a39", background: "#070d14" },
    ]);
    expect(warnings.map((w) => w.label)).toEqual(["ruim"]);
    expect(formatRatio(warnings[0].ratio)).toMatch(/^\d,\d:1$/);
  });
});

describe("enquadramento de foto", () => {
  it("o deslocamento máximo cresce com o zoom e é zero sem zoom", () => {
    expect(maxPan(1)).toBe(0);
    expect(maxPan(3)).toBe(100);
  });

  it("limita zoom e deslocamento para não deixar bordas vazias", () => {
    expect(clampFrame({ zoom: 10, x: 0, y: 0 }).zoom).toBe(4);
    expect(clampFrame({ zoom: 0.2, x: 50, y: 50 })).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(clampFrame({ zoom: 2, x: 99, y: -99 })).toEqual({ zoom: 2, x: 50, y: -50 });
  });

  it("reconhece o enquadramento padrão e gera o transform", () => {
    expect(isDefaultFrame({ zoom: 1, x: 0, y: 0 })).toBe(true);
    expect(isDefaultFrame({ zoom: 1.5, x: 0, y: 0 })).toBe(false);
    expect(frameTransform(undefined)).toBeUndefined();
    expect(frameTransform({ zoom: 2, x: 10, y: -5 })).toBe(
      "translate(10%, -5%) scale(2)",
    );
  });
});

describe("giro, espelhamento e cópia de ajustes de fotos", () => {
  it("gira de 90° em 90° nos dois sentidos", () => {
    expect(turn(undefined, 1)).toBe(90);
    expect(turn(270, 1)).toBe(0);
    expect(turn(0, -1)).toBe(270);
    expect(turn(90, -1)).toBe(0);
  });

  it("normaliza o giro para múltiplos de 90°", () => {
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(100)).toBe(90);
    expect(normalizeRotation(0)).toBe(0);
  });

  it("calcula o tamanho da foto depois do giro", () => {
    expect(orientedSize(400, 200, 0)).toEqual({ width: 400, height: 200 });
    expect(orientedSize(400, 200, 90)).toEqual({ width: 200, height: 400 });
    expect(orientedSize(400, 200, 180)).toEqual({ width: 400, height: 200 });
    expect(orientedSize(400, 200, 270)).toEqual({ width: 200, height: 400 });
  });

  it("clampFrame guarda giro e espelhamento só quando há", () => {
    expect(clampFrame({ zoom: 1, x: 0, y: 0, rotate: 450, flipX: true })).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
      rotate: 90,
      flipX: true,
    });
    expect(clampFrame({ zoom: 1, x: 0, y: 0, rotate: 0, flipX: false })).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
  });

  it("giro e espelhamento contam como ajuste (não é o padrão)", () => {
    expect(isDefaultFrame({ zoom: 1, x: 0, y: 0 })).toBe(true);
    expect(isDefaultFrame({ zoom: 1, x: 0, y: 0, rotate: 90 })).toBe(false);
    expect(isDefaultFrame({ zoom: 1, x: 0, y: 0, flipY: true })).toBe(false);
  });

  it("copia os ajustes; sem posição, o destino mantém a própria posição", () => {
    const source = { zoom: 2, x: 30, y: -20, opacity: 0.5, rotate: 90, flipX: true };
    const target = { zoom: 1, x: 0, y: 0 };
    expect(copyFrame(source, target, true)).toEqual(source);

    const own = { zoom: 3, x: 10, y: 5 };
    expect(copyFrame(source, own, false)).toEqual({ ...source, x: 10, y: 5 });
    // O destino sem ajustes anteriores começa centralizado.
    expect(copyFrame(source, undefined, false)).toEqual({ ...source, x: 0, y: 0 });
  });

  it("ao copiar sem posição, ajusta a posição do destino ao novo zoom", () => {
    const result = copyFrame({ zoom: 1, x: 0, y: 0 }, { zoom: 3, x: 80, y: 0 }, false);
    expect(result.x).toBe(0); // sem zoom não há deslocamento possível
  });
});
