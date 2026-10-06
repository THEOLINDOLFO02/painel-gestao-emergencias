import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";

export type Theme = {
  bg: string;
  accent: string;
  secondary: string;
  text: string;
  displayFont: string;
  bodyFont: string;
};

export const DEFAULT_THEME: Theme = {
  bg: "#070d14",
  accent: "#ff8a24",
  secondary: "#4bc7e8",
  text: "#eef4f8",
  displayFont: "Barlow Condensed",
  bodyFont: "Inter",
};

const FONT_OPTIONS = [
  "Barlow Condensed",
  "Bebas Neue",
  "Inter",
  "Montserrat",
  "Oswald",
  "Poppins",
  "Roboto",
  "Roboto Condensed",
  "Space Grotesk",
];

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
};

export type BlockStyle = {
  bg?: string;
  accent?: string;
  text?: string;
};

export const isLineShape = (type: ShapeType) =>
  type === "line" || type === "arrow";

export function ShapeItem({
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
  const drag = useRef<{
    mode: "move" | "resize";
    pointerX: number;
    pointerY: number;
    shape: Shape;
  } | null>(null);

  const start =
    (mode: "move" | "resize") => (event: PointerEvent<HTMLElement>) => {
      if (!editMode) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      onSelect(shape.id);
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
    const dx = event.clientX - d.pointerX;
    const dy = event.clientY - d.pointerY;
    if (d.mode === "move") {
      onChange(shape.id, { x: d.shape.x + dx, y: d.shape.y + dy });
    } else {
      onChange(shape.id, {
        w: Math.max(16, d.shape.w + dx),
        ...(isLineShape(shape.type) ? {} : { h: Math.max(16, d.shape.h + dy) }),
      });
    }
  };

  const end = () => {
    drag.current = null;
  };

  const SHAPE_NAMES: Record<ShapeType, string> = {
    rect: "retângulo",
    circle: "círculo",
    line: "linha",
    arrow: "seta",
  };

  const moveWithKeyboard = (event: KeyboardEvent<HTMLElement>) => {
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
    onChange(shape.id, {
      x: shape.x + step[0] * distance,
      y: shape.y + step[1] * distance,
    });
  };

  const style: CSSProperties = {
    left: shape.x,
    top: shape.y,
    width: shape.w,
    height: shape.h,
    opacity: shape.opacity,
    pointerEvents: editMode ? "auto" : "none",
  };

  const headSize = Math.max(10, shape.strokeWidth * 4);
  const lineEnd = shape.type === "arrow" ? shape.w - headSize + 1 : shape.w;

  return (
    <div
      className={`shape-item ${editMode ? "shape-item--editable" : ""} ${editMode && selected ? "shape-item--selected" : ""}`}
      style={style}
      role={editMode ? "button" : undefined}
      tabIndex={editMode ? 0 : undefined}
      aria-hidden={editMode ? undefined : true}
      aria-label={
        editMode
          ? `Forma: ${SHAPE_NAMES[shape.type]}. Setas movem, Delete exclui.`
          : undefined
      }
      onFocus={() => editMode && onSelect(shape.id)}
      onKeyDown={moveWithKeyboard}
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
      {editMode && selected && (
        <div
          className="shape-resize"
          onPointerDown={start("resize")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      )}
    </div>
  );
}

export function DesignPanel({
  theme,
  onThemeChange,
  onThemeReset,
  onAddShape,
  selected,
  onShapeChange,
  onShapeDelete,
  blockLabel,
  blockStyle,
  onBlockChange,
  onBlockReset,
}: {
  theme: Theme;
  onThemeChange: (patch: Partial<Theme>) => void;
  onThemeReset: () => void;
  onAddShape: (type: ShapeType) => void;
  selected?: Shape;
  onShapeChange: (patch: Partial<Shape>) => void;
  onShapeDelete: () => void;
  blockLabel?: string;
  blockStyle?: BlockStyle;
  onBlockChange: (patch: BlockStyle) => void;
  onBlockReset: () => void;
}) {
  const colors: { key: "bg" | "accent" | "secondary" | "text"; label: string }[] =
    [
      { key: "bg", label: "Fundo" },
      { key: "accent", label: "Destaque" },
      { key: "secondary", label: "Secundária" },
      { key: "text", label: "Texto" },
    ];
  const fonts: { key: "displayFont" | "bodyFont"; label: string }[] = [
    { key: "displayFont", label: "Títulos" },
    { key: "bodyFont", label: "Texto" },
  ];
  const shapes: { type: ShapeType; label: string }[] = [
    { type: "rect", label: "Retângulo" },
    { type: "circle", label: "Círculo" },
    { type: "line", label: "Linha" },
    { type: "arrow", label: "Seta" },
  ];

  // Em telas estreitas o painel começa recolhido para não cobrir o conteúdo.
  const [collapsed, setCollapsed] = useState(
    () => window.matchMedia?.("(max-width: 768px)").matches ?? false,
  );

  return (
    <aside
      className={`design-panel ${collapsed ? "design-panel--collapsed" : ""}`}
      aria-label="Cores, fontes e formas"
    >
      <button
        type="button"
        className="panel-toggle"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((current) => !current)}
      >
        {collapsed ? "▲ Cores, fontes e formas" : "▼ Recolher painel"}
      </button>
      {!collapsed && (
        <>
      <section>
        <h3>CORES</h3>
        {colors.map(({ key, label }) => (
          <label key={key}>
            {label}
            <input
              type="color"
              value={theme[key]}
              onChange={(event) => onThemeChange({ [key]: event.target.value })}
            />
          </label>
        ))}
      </section>
      <section>
        <h3>FONTES</h3>
        {fonts.map(({ key, label }) => (
          <label key={key}>
            {label}
            <select
              value={theme[key]}
              style={{ fontFamily: `"${theme[key]}"` }}
              onChange={(event) => onThemeChange({ [key]: event.target.value })}
            >
              {FONT_OPTIONS.map((font) => (
                <option
                  key={font}
                  value={font}
                  style={{ fontFamily: `"${font}"` }}
                >
                  {font}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className="panel-button" onClick={onThemeReset}>
          Restaurar tema
        </button>
      </section>
      <section>
        <h3>BLOCO SELECIONADO</h3>
        {blockLabel ? (
          <>
            <span style={{ color: "var(--text)" }}>{blockLabel}</span>
            {(
              [
                ["bg", "Fundo", theme.bg],
                ["accent", "Destaque", theme.accent],
                ["text", "Texto", theme.text],
              ] as const
            ).map(([key, label, fallback]) => (
              <label key={key}>
                {label}
                <input
                  type="color"
                  value={blockStyle?.[key] ?? fallback}
                  onChange={(event) =>
                    onBlockChange({ [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <button className="panel-button" onClick={onBlockReset}>
              Remover personalização
            </button>
          </>
        ) : (
          <span style={{ color: "var(--muted)" }}>
            Clique em um bloco do painel (fase, cartão ou cabeçalho) para mudar
            as cores só dele.
          </span>
        )}
      </section>
      <section>
        <h3>FORMAS</h3>
        <div className="panel-buttons">
          {shapes.map(({ type, label }) => (
            <button
              key={type}
              className="panel-button"
              onClick={() => onAddShape(type)}
            >
              + {label}
            </button>
          ))}
        </div>
        {selected ? (
          <>
            <label>
              Cor
              <input
                type="color"
                value={selected.color}
                onChange={(event) => onShapeChange({ color: event.target.value })}
              />
            </label>
            {!isLineShape(selected.type) && (
              <label>
                Preenchida
                <input
                  type="checkbox"
                  checked={selected.filled}
                  onChange={(event) =>
                    onShapeChange({ filled: event.target.checked })
                  }
                />
              </label>
            )}
            <label>
              Espessura
              <input
                type="range"
                min={1}
                max={16}
                value={selected.strokeWidth}
                onChange={(event) =>
                  onShapeChange({ strokeWidth: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Opacidade
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(selected.opacity * 100)}
                onChange={(event) =>
                  onShapeChange({ opacity: Number(event.target.value) / 100 })
                }
              />
            </label>
            <button
              className="panel-button panel-button--danger"
              onClick={onShapeDelete}
            >
              Excluir forma
            </button>
          </>
        ) : (
          <span style={{ color: "var(--muted)" }}>
            Clique em uma forma para editá-la. Arraste para mover e use o canto
            para redimensionar.
          </span>
        )}
      </section>
        </>
      )}
    </aside>
  );
}
