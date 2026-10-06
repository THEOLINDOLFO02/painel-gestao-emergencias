import { type CSSProperties, type KeyboardEvent, type PointerEvent, useRef } from "react";
import {
  angleFromCenter,
  isLineShape,
  MIN_SHAPE_SIZE,
  normalizeAngle,
  resizeKeepingCorner,
  SHAPE_NAMES,
  type Shape,
  toLocalDelta,
} from "../editor/shapes";

type Drag =
  | { mode: "move"; pointerX: number; pointerY: number; shape: Shape }
  | { mode: "resize"; pointerX: number; pointerY: number; shape: Shape }
  | { mode: "rotate"; center: { x: number; y: number } };

export default function ShapeItem({
  shape,
  editMode,
  selected,
  onSelect,
  onChange,
}: {
  shape: Shape;
  editMode: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Shape>) => void;
}) {
  const drag = useRef<Drag | null>(null);
  const rotation = shape.rotation ?? 0;
  const locked = !!shape.locked;

  const start =
    (mode: "move" | "resize" | "rotate") => (event: PointerEvent<HTMLElement>) => {
      if (!editMode) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect(shape.id);
      if (locked) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      if (mode === "rotate") {
        // O centro da caixa girada é o mesmo da caixa sem rotação.
        const box = (
          event.currentTarget.closest(".shape-item") as HTMLElement
        ).getBoundingClientRect();
        drag.current = {
          mode,
          center: { x: box.left + box.width / 2, y: box.top + box.height / 2 },
        };
        return;
      }
      drag.current = {
        mode,
        pointerX: event.clientX,
        pointerY: event.clientY,
        shape,
      };
    };

  const move = (event: PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;

    if (d.mode === "rotate") {
      const raw = angleFromCenter(d.center, { x: event.clientX, y: event.clientY });
      const snapped = event.shiftKey ? Math.round(raw / 15) * 15 : Math.round(raw);
      onChange(shape.id, { rotation: normalizeAngle(snapped) });
      return;
    }

    const dx = event.clientX - d.pointerX;
    const dy = event.clientY - d.pointerY;
    if (d.mode === "move") {
      onChange(shape.id, { x: d.shape.x + dx, y: d.shape.y + dy });
      return;
    }
    const local = toLocalDelta(dx, dy, d.shape.rotation ?? 0);
    const w = Math.max(MIN_SHAPE_SIZE, Math.round(d.shape.w + local.dx));
    const h = isLineShape(shape.type)
      ? d.shape.h
      : Math.max(MIN_SHAPE_SIZE, Math.round(d.shape.h + local.dy));
    onChange(shape.id, resizeKeepingCorner(d.shape, w, h));
  };

  const end = () => {
    drag.current = null;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (locked || event.target !== event.currentTarget) return;
    const distance = event.shiftKey ? 20 : 4;

    // [ e ] giram a forma (Shift gira em passos maiores).
    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      const turn = (event.key === "]" ? 1 : -1) * (event.shiftKey ? 15 : 5);
      onChange(shape.id, { rotation: normalizeAngle(rotation + turn) });
      return;
    }

    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    onChange(shape.id, {
      x: shape.x + step[0] * distance,
      y: shape.y + step[1] * distance,
    });
  };

  if (shape.hidden) return null;

  const style: CSSProperties = {
    left: shape.x,
    top: shape.y,
    width: shape.w,
    height: shape.h,
    opacity: shape.opacity,
    transform: rotation ? `rotate(${rotation}deg)` : undefined,
    zIndex: shape.behind ? -1 : 10,
    pointerEvents: editMode ? "auto" : "none",
  };

  const headSize = Math.max(10, shape.strokeWidth * 4);
  const lineEnd = shape.type === "arrow" ? shape.w - headSize + 1 : shape.w;
  const showHandles = editMode && selected && !locked;

  return (
    <div
      className={`shape-item ${editMode ? "shape-item--editable" : ""} ${locked ? "shape-item--locked" : ""} ${editMode && selected ? "shape-item--selected" : ""}`}
      style={style}
      role={editMode ? "button" : undefined}
      tabIndex={editMode ? 0 : undefined}
      aria-hidden={editMode ? undefined : true}
      aria-label={
        editMode
          ? `Forma: ${SHAPE_NAMES[shape.type].toLowerCase()}${locked ? " (bloqueada)" : ". Setas movem, [ e ] giram, Delete exclui"}.`
          : undefined
      }
      onFocus={() => editMode && onSelect(shape.id)}
      onKeyDown={handleKeyDown}
      onPointerDown={start("move")}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {isLineShape(shape.type) ? (
        <svg width={shape.w} height={shape.h} style={{ display: "block" }}>
          <line
            x1={0}
            y1={shape.h / 2}
            x2={lineEnd}
            y2={shape.h / 2}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth}
            strokeLinecap="round"
          />
          {shape.type === "arrow" && (
            <polygon
              fill={shape.color}
              points={`${shape.w},${shape.h / 2} ${shape.w - headSize},${shape.h / 2 - headSize / 2} ${shape.w - headSize},${shape.h / 2 + headSize / 2}`}
            />
          )}
        </svg>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            borderRadius: shape.type === "circle" ? "50%" : 4,
            border: `${shape.strokeWidth}px solid ${shape.color}`,
            background: shape.filled ? shape.color : "transparent",
          }}
        />
      )}
      {showHandles && (
        <>
          <div
            className="shape-rotate"
            title="Arraste para girar (Shift: passos de 15°)"
            onPointerDown={start("rotate")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
          <div
            className="shape-resize"
            onPointerDown={start("resize")}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
        </>
      )}
    </div>
  );
}
