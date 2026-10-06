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
const MIN_SIZE = 48;

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
  const size = editor.sizes[id];
  const stack = editor.stacks[id];
  const wrapperRef = useRef<HTMLDivElement>(null);
  const resizeStart = useRef({ pointerX: 0, pointerY: 0, w: 0, h: 0 });
  const [resizing, setResizing] = useState(false);
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

  const currentSize = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    return { w: rect?.width ?? 0, h: rect?.height ?? 0 };
  };

  const startResize = (event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const { w, h } = currentSize();
    resizeStart.current = { pointerX: event.clientX, pointerY: event.clientY, w, h };
    setResizing(true);
  };

  const moveResize = (event: PointerEvent<HTMLElement>) => {
    if (!resizing) return;
    const start = resizeStart.current;
    editor.setSize(id, {
      w: Math.max(MIN_SIZE, Math.round(start.w + event.clientX - start.pointerX)),
      h: Math.max(MIN_SIZE, Math.round(start.h + event.clientY - start.pointerY)),
    });
  };

  const resizeWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const distance = event.shiftKey ? 20 : 4;
    const { w, h } = currentSize();
    editor.setSize(id, {
      w: Math.max(MIN_SIZE, Math.round(w + step[0] * distance)),
      h: Math.max(MIN_SIZE, Math.round(h + step[1] * distance)),
    });
  };

  const wrapperStyle: CSSProperties & Record<string, string | number | undefined> = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
    width: size?.w,
    height: size?.h,
    zIndex: stack || undefined,
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
      ref={wrapperRef}
      className={`draggable-wrapper ${dragging || resizing ? "is-dragging" : ""} ${blockStyle?.bg ? "has-block-bg" : ""} ${editor.editMode ? "is-block-selectable" : ""} ${selected ? "is-block-selected" : ""} ${className}`}
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
      {selected && (
        <button
          type="button"
          className="resize-handle"
          aria-label="Redimensionar bloco (setas do teclado, Shift para passos maiores)"
          title="Arraste para redimensionar • Setas para ajuste fino"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={() => setResizing(false)}
          onPointerCancel={() => setResizing(false)}
          onKeyDown={resizeWithKeyboard}
        />
      )}
      {children}
    </div>
  );
}
