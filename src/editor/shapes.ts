export type ShapeType = "rect" | "circle" | "line" | "arrow";

export type Shape = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  filled: boolean;
  opacity: number;
  strokeWidth: number;
  /** Rotação em graus, em torno do centro (formas antigas não têm). */
  rotation?: number;
  /** Escondida do painel e das exportações. */
  hidden?: boolean;
  /** Não pode ser movida, redimensionada nem girada. */
  locked?: boolean;
  /** Fica atrás dos blocos do painel (por padrão, na frente). */
  behind?: boolean;
};

export const isLineShape = (type: ShapeType) =>
  type === "line" || type === "arrow";

export const SHAPE_NAMES: Record<ShapeType, string> = {
  rect: "Retângulo",
  circle: "Círculo",
  line: "Linha",
  arrow: "Seta",
};

export const MIN_SHAPE_SIZE = 16;

// ---- Ordem de empilhamento ----
// A ordem do array é a ordem de desenho: o último fica por cima. Formas
// "atrás dos blocos" e "na frente" formam dois grupos independentes.

export type StackOp = "forward" | "backward" | "front" | "back";

const sameGroup = (a: Shape, b: Shape) => !!a.behind === !!b.behind;

export function reorderShapes(shapes: Shape[], id: string, op: StackOp): Shape[] {
  const index = shapes.findIndex((shape) => shape.id === id);
  if (index < 0) return shapes;
  const shape = shapes[index];
  const next = [...shapes];

  if (op === "front" || op === "back") {
    next.splice(index, 1);
    if (op === "front") next.push(shape);
    else next.unshift(shape);
    return next;
  }

  const step = op === "forward" ? 1 : -1;
  let target = index + step;
  while (target >= 0 && target < next.length && !sameGroup(next[target], shape)) {
    target += step;
  }
  if (target < 0 || target >= next.length) return shapes;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Nomes estáveis para a lista de camadas: "Retângulo 1", "Retângulo 2", ... */
export function shapeLabels(shapes: Shape[]): Record<string, string> {
  const counts: Partial<Record<ShapeType, number>> = {};
  const labels: Record<string, string> = {};
  for (const shape of shapes) {
    const n = (counts[shape.type] = (counts[shape.type] ?? 0) + 1);
    labels[shape.id] = `${SHAPE_NAMES[shape.type]} ${n}`;
  }
  return labels;
}

/** Camadas de cima para baixo: formas na frente e, depois, as atrás dos blocos. */
export function layerGroups(shapes: Shape[]) {
  return {
    front: shapes.filter((shape) => !shape.behind).reverse(),
    behind: shapes.filter((shape) => shape.behind).reverse(),
  };
}

// ---- Rotação ----

/** Leva qualquer ângulo para o intervalo [-180, 180). */
export const normalizeAngle = (degrees: number) =>
  ((((degrees + 180) % 360) + 360) % 360) - 180;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Converte um deslocamento da tela para os eixos da forma girada. */
export function toLocalDelta(dx: number, dy: number, rotation: number) {
  const cos = Math.cos(radians(rotation));
  const sin = Math.sin(radians(rotation));
  return { dx: dx * cos + dy * sin, dy: -dx * sin + dy * cos };
}

/**
 * Novo tamanho mantendo o canto superior esquerdo (visual) no mesmo lugar:
 * como a rotação é em torno do centro, mudar w/h desloca o centro.
 */
export function resizeKeepingCorner(
  shape: Pick<Shape, "x" | "y" | "w" | "h" | "rotation">,
  w: number,
  h: number,
) {
  const angle = radians(shape.rotation ?? 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dw = w - shape.w;
  const dh = h - shape.h;
  return {
    w,
    h,
    x: Math.round(shape.x + (dw / 2) * (cos - 1) - (dh / 2) * sin),
    y: Math.round(shape.y + (dw / 2) * sin + (dh / 2) * (cos - 1)),
  };
}

/** Ângulo (graus) de um ponto em relação ao centro; 0 = diretamente acima. */
export function angleFromCenter(
  center: { x: number; y: number },
  point: { x: number; y: number },
) {
  return (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI + 90;
}
