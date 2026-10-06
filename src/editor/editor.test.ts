import { describe, expect, it } from "vitest";
import { contrastRatio, contrastWarnings, formatRatio } from "./contrast";
import { clampFrame, frameTransform, isDefaultFrame, maxPan } from "./frame";

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
