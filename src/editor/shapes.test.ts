import { describe, expect, it } from "vitest";
import { clampFrame } from "./frame";
import {
  angleFromCenter,
  layerGroups,
  normalizeAngle,
  reorderShapes,
  resizeKeepingCorner,
  type Shape,
  shapeLabels,
  toLocalDelta,
} from "./shapes";

const shape = (id: string, extra: Partial<Shape> = {}): Shape => ({
  id,
  type: "rect",
  x: 0,
  y: 0,
  w: 100,
  h: 50,
  color: "#fff",
  filled: false,
  opacity: 1,
  strokeWidth: 3,
  ...extra,
});

const ids = (shapes: Shape[]) => shapes.map((s) => s.id).join("");

describe("ordem de empilhamento", () => {
  const list = [shape("a"), shape("b"), shape("c")];

  it("sobe e desce uma posição", () => {
    expect(ids(reorderShapes(list, "a", "forward"))).toBe("bac");
    expect(ids(reorderShapes(list, "c", "backward"))).toBe("acb");
  });

  it("não passa dos limites", () => {
    expect(reorderShapes(list, "c", "forward")).toBe(list);
    expect(reorderShapes(list, "a", "backward")).toBe(list);
  });

  it("leva para o topo e para o fundo", () => {
    expect(ids(reorderShapes(list, "a", "front"))).toBe("bca");
    expect(ids(reorderShapes(list, "c", "back"))).toBe("cab");
  });

  it("ignora id desconhecido e não altera a lista original", () => {
    expect(reorderShapes(list, "x", "front")).toBe(list);
    reorderShapes(list, "a", "front");
    expect(ids(list)).toBe("abc");
  });

  it("subir/descer só troca com formas do mesmo grupo (frente ou atrás dos blocos)", () => {
    const mixed = [shape("a"), shape("b", { behind: true }), shape("c")];
    // "a" pula "b" (outro grupo) e troca de lugar com "c"; "b" não se mexe
    expect(ids(reorderShapes(mixed, "a", "forward"))).toBe("cba");
    // "b" é o único atrás dos blocos: não tem com quem trocar
    expect(reorderShapes(mixed, "b", "forward")).toBe(mixed);
  });

  it("separa as camadas de cima para baixo", () => {
    const mixed = [shape("a"), shape("b", { behind: true }), shape("c"), shape("d", { behind: true })];
    const groups = layerGroups(mixed);
    expect(ids(groups.front)).toBe("ca");
    expect(ids(groups.behind)).toBe("db");
  });

  it("numera os nomes por tipo", () => {
    const labels = shapeLabels([
      shape("a"),
      shape("b", { type: "circle" }),
      shape("c"),
    ]);
    expect(labels).toEqual({ a: "Retângulo 1", b: "Círculo 1", c: "Retângulo 2" });
  });
});

describe("rotação", () => {
  it("normaliza ângulos para [-180, 180)", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(190)).toBe(-170);
    expect(normalizeAngle(-190)).toBe(170);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(540)).toBe(-180);
  });

  it("converte deslocamentos da tela para os eixos da forma", () => {
    const none = toLocalDelta(10, 5, 0);
    expect(none.dx).toBeCloseTo(10);
    expect(none.dy).toBeCloseTo(5);
    // Forma girada 90°: o eixo x dela aponta para baixo na tela.
    const turned = toLocalDelta(0, 10, 90);
    expect(turned.dx).toBeCloseTo(10);
    expect(turned.dy).toBeCloseTo(0);
  });

  it("calcula o ângulo da alça em relação ao centro (0 = acima)", () => {
    const center = { x: 100, y: 100 };
    expect(angleFromCenter(center, { x: 100, y: 0 })).toBeCloseTo(0);
    expect(angleFromCenter(center, { x: 200, y: 100 })).toBeCloseTo(90);
    expect(angleFromCenter(center, { x: 100, y: 200 })).toBeCloseTo(180);
  });

  it("sem rotação, redimensionar mantém o canto e só muda o tamanho", () => {
    expect(resizeKeepingCorner({ x: 10, y: 20, w: 100, h: 50, rotation: 0 }, 150, 80)).toEqual({
      x: 10,
      y: 20,
      w: 150,
      h: 80,
    });
  });

  it("girada, redimensionar mantém o canto superior esquerdo visual no lugar", () => {
    const before = { x: 50, y: 60, w: 100, h: 40, rotation: 90 };
    const after = resizeKeepingCorner(before, 160, 40);
    const corner = (s: { x: number; y: number; w: number; h: number }, deg: number) => {
      const cx = s.x + s.w / 2;
      const cy = s.y + s.h / 2;
      const a = (deg * Math.PI) / 180;
      const lx = -s.w / 2;
      const ly = -s.h / 2;
      return { x: cx + lx * Math.cos(a) - ly * Math.sin(a), y: cy + lx * Math.sin(a) + ly * Math.cos(a) };
    };
    const c0 = corner(before, 90);
    const c1 = corner(after, 90);
    expect(c1.x).toBeCloseTo(c0.x, 0);
    expect(c1.y).toBeCloseTo(c0.y, 0);
  });
});

describe("transparência da foto", () => {
  it("limita a opacidade entre 10% e 100%", () => {
    expect(clampFrame({ zoom: 1, x: 0, y: 0, opacity: 0 }).opacity).toBe(0.1);
    expect(clampFrame({ zoom: 1, x: 0, y: 0, opacity: 3 }).opacity).toBe(1);
    expect(clampFrame({ zoom: 1, x: 0, y: 0 }).opacity).toBeUndefined();
  });
});
