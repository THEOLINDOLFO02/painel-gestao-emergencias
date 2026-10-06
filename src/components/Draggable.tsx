import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { type Position, useEditor } from "../editor/context";

const GRID = 4;

export default function Draggable({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const editor = useEditor();
  const position = editor.positions[id] ?? { x: 0, y: 0 };
  const blockStyle = editor.blockStyles[id];
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });

  const startDrag = (event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: position.x,
      y: position.y,
    };
    setDragging(true);
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    if (!dragging) return;
    const snap = (value: number) => Math.round(value / GRID) * GRID;
    editor.setPosition(id, {
      x: snap(dragStart.current.x + event.clientX - dragStart.current.pointerX),
      y: snap(dragStart.current.y + event.clientY - dragStart.current.pointerY),
    });
  };

  const moveWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    const directions: Record<string, Position> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const distance = event.shiftKey ? 20 : 4;
    editor.setPosition(id, {
      x: position.x + direction.x * distance,
      y: position.y + direction.y * distance,
    });
  };

  const wrapperStyle: CSSProperties & Record<string, string | undefined> = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    "--block-bg": blockStyle?.bg,
    "--orange": blockStyle?.accent,
    "--orange-soft": blockStyle?.accent
      ? `color-mix(in srgb, ${blockStyle.accent} 70%, white)`
      : undefined,
    "--text": blockStyle?.text,
    color: blockStyle?.text,
  };

  const selected = editor.editMode && editor.selectedBlock === id;

  return (
    <div
      className={`draggable-wrapper ${dragging ? "is-dragging" : ""} ${blockStyle?.bg ? "has-block-bg" : ""} ${editor.editMode ? "is-block-selectable" : ""} ${selected ? "is-block-selected" : ""} ${className}`}
      style={wrapperStyle}
      onClick={(event) => {
        // Só o bloco mais interno clicado é selecionado.
        const owner = (event.target as HTMLElement).closest(".draggable-wrapper");
        if (editor.editMode && owner === event.currentTarget) {
          editor.selectBlock(id);
        }
      }}
    >
      {editor.editMode && (
        <button
          type="button"
          className="drag-handle"
          aria-label="Mover item (setas do teclado, Shift para passos maiores)"
          title="Arraste para mover • Setas para ajuste fino"
          onFocus={() => editor.selectBlock(id)}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={moveWithKeyboard}
        >
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </button>
      )}
      {children}
    </div>
  );
}
