import { type ReactNode, useState } from "react";
import { contrastWarnings, formatRatio, MIN_CONTRAST } from "../editor/contrast";
import type { Frame, Size } from "../editor/context";
import {
  clampFrame,
  DEFAULT_FRAME,
  isDefaultFrame,
  MAX_ZOOM,
  maxPan,
  turn,
} from "../editor/frame";
import {
  isLineShape,
  layerGroups,
  MIN_SHAPE_SIZE,
  normalizeAngle,
  type Shape,
  shapeLabels,
  type ShapeType,
  type StackOp,
} from "../editor/shapes";
import { type BlockStyle, FONT_OPTIONS, type Theme } from "../editor/theme";
import { formatClock, type LiveSettings } from "../data/live";
import type { Live } from "../data/useLiveData";

const hint = { color: "var(--muted)" } as const;

function ContrastNotice({
  warnings,
}: {
  warnings: { label: string; ratio: number }[];
}) {
  return (
    <div aria-live="polite">
      {warnings.map(({ label, ratio }) => (
        <p key={label} className="contrast-warning">
          ⚠ {label}: contraste {formatRatio(ratio)} (mínimo {formatRatio(MIN_CONTRAST)}).
          Pode ficar difícil de ler.
        </p>
      ))}
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <span className="range-field">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={label}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <output>
          {value}
          {suffix}
        </output>
      </span>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="number-field">
      {label}
      <input
        type="number"
        value={Math.round(value)}
        min={min}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (event.target.value !== "" && Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export type DesignPanelProps = {
  theme: Theme;
  onThemeChange: (patch: Partial<Theme>) => void;
  onThemeReset: () => void;

  shapes: Shape[];
  selectedShapeId: string | null;
  onAddShape: (type: ShapeType) => void;
  onSelectShape: (id: string) => void;
  onShapePatch: (id: string, patch: Partial<Shape>) => void;
  onShapeStack: (id: string, op: StackOp) => void;
  onShapeDelete: (id: string) => void;

  blockLabel?: string;
  blockStyle?: BlockStyle;
  onBlockChange: (patch: BlockStyle) => void;
  onBlockReset: () => void;
  blockSize?: Size;
  onBlockSizeReset: () => void;
  blockStack: number;
  onBlockStack: (delta: number) => void;

  imageSelected: boolean;
  imageFrame?: Frame;
  onFrameChange: (frame: Frame) => void;
  onFrameReset: () => void;
  /** Há ajustes copiados esperando para serem colados. */
  canPaste: boolean;
  /** Quantas fotos já foram inseridas no painel. */
  photoCount: number;
  onFrameCopy: () => void;
  onFramePaste: (includePosition: boolean) => void;
  onFrameApplyAll: (includePosition: boolean) => void;

  live: Live;
  onLiveSettings: (patch: Partial<LiveSettings>) => void;
};

const COLOR_FIELDS = [
  { key: "bg", label: "Fundo" },
  { key: "accent", label: "Destaque" },
  { key: "secondary", label: "Secundária" },
  { key: "text", label: "Texto" },
] as const;

const FONT_FIELDS = [
  { key: "displayFont", label: "Títulos" },
  { key: "bodyFont", label: "Texto" },
] as const;

const SHAPE_BUTTONS: { type: ShapeType; label: string }[] = [
  { type: "rect", label: "Retângulo" },
  { type: "circle", label: "Círculo" },
  { type: "line", label: "Linha" },
  { type: "arrow", label: "Seta" },
];

export default function DesignPanel(props: DesignPanelProps) {
  const { theme, shapes, selectedShapeId, blockStyle, imageFrame } = props;
  const selected = shapes.find((shape) => shape.id === selectedShapeId);
  const labels = shapeLabels(shapes);
  const groups = layerGroups(shapes);
  const frame = imageFrame ?? DEFAULT_FRAME;

  const themeWarnings = contrastWarnings([
    { label: "Texto sobre o fundo", foreground: theme.text, background: theme.bg },
    { label: "Destaque sobre o fundo", foreground: theme.accent, background: theme.bg },
    { label: "Secundária sobre o fundo", foreground: theme.secondary, background: theme.bg },
  ]);
  const blockBackground = blockStyle?.bg ?? theme.bg;
  const blockWarnings = contrastWarnings([
    {
      label: "Texto sobre o fundo do bloco",
      foreground: blockStyle?.text ?? theme.text,
      background: blockBackground,
    },
    {
      label: "Destaque sobre o fundo do bloco",
      foreground: blockStyle?.accent ?? theme.accent,
      background: blockBackground,
    },
  ]);

  // Em telas estreitas o painel começa recolhido para não cobrir o conteúdo.
  const [includePosition, setIncludePosition] = useState(true);
  const [collapsed, setCollapsed] = useState(
    () => window.matchMedia?.("(max-width: 768px)").matches ?? false,
  );

  const layerRow = (shape: Shape) => {
    const name = labels[shape.id];
    return (
      <li
        key={shape.id}
        className={`layer-row ${shape.id === selectedShapeId ? "layer-row--selected" : ""} ${shape.hidden ? "layer-row--hidden" : ""}`}
      >
        <button
          type="button"
          className="layer-name"
          aria-pressed={shape.id === selectedShapeId}
          onClick={() => props.onSelectShape(shape.id)}
        >
          {name}
        </button>
        <button
          type="button"
          className="layer-icon"
          aria-label={`${shape.hidden ? "Mostrar" : "Ocultar"} ${name}`}
          title={shape.hidden ? "Mostrar" : "Ocultar"}
          onClick={() => props.onShapePatch(shape.id, { hidden: !shape.hidden })}
        >
          {shape.hidden ? "○" : "●"}
        </button>
        <button
          type="button"
          className="layer-icon"
          aria-label={`${shape.locked ? "Desbloquear" : "Bloquear"} ${name}`}
          title={shape.locked ? "Desbloquear" : "Bloquear"}
          onClick={() => props.onShapePatch(shape.id, { locked: !shape.locked })}
        >
          {shape.locked ? "🔒" : "🔓"}
        </button>
        <button
          type="button"
          className="layer-icon"
          aria-label={`Subir ${name}`}
          title="Subir (para a frente)"
          onClick={() => props.onShapeStack(shape.id, "forward")}
        >
          ▲
        </button>
        <button
          type="button"
          className="layer-icon"
          aria-label={`Descer ${name}`}
          title="Descer (para trás)"
          onClick={() => props.onShapeStack(shape.id, "backward")}
        >
          ▼
        </button>
      </li>
    );
  };

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
          <Section title="CORES">
            {COLOR_FIELDS.map(({ key, label }) => (
              <label key={key}>
                {label}
                <input
                  type="color"
                  value={theme[key]}
                  onChange={(event) =>
                    props.onThemeChange({ [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <ContrastNotice warnings={themeWarnings} />
          </Section>

          <Section title="FONTES">
            {FONT_FIELDS.map(({ key, label }) => (
              <label key={key}>
                {label}
                <select
                  value={theme[key]}
                  style={{ fontFamily: `"${theme[key]}"` }}
                  onChange={(event) =>
                    props.onThemeChange({ [key]: event.target.value })
                  }
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font} style={{ fontFamily: `"${font}"` }}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button className="panel-button" onClick={props.onThemeReset}>
              Restaurar tema
            </button>
          </Section>

          <LiveSection live={props.live} onChange={props.onLiveSettings} />

          <Section title="BLOCO SELECIONADO">
            {props.blockLabel ? (
              <>
                <span style={{ color: "var(--text)" }}>{props.blockLabel}</span>
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
                        props.onBlockChange({ [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <ContrastNotice warnings={blockWarnings} />
                <label>
                  Camada
                  <span className="stack-field">
                    <button
                      type="button"
                      className="panel-button"
                      aria-label="Enviar bloco para trás"
                      onClick={() => props.onBlockStack(-1)}
                    >
                      ◀ Trás
                    </button>
                    <output aria-label="Camada do bloco">{props.blockStack}</output>
                    <button
                      type="button"
                      className="panel-button"
                      aria-label="Trazer bloco para a frente"
                      onClick={() => props.onBlockStack(1)}
                    >
                      Frente ▶
                    </button>
                  </span>
                </label>
                <span style={hint}>
                  Vale entre blocos do mesmo grupo (por exemplo, dois cartões da
                  mesma fase). Para passar por cima de outra fase, selecione a fase.
                </span>
                {props.blockSize && (
                  <label>
                    Tamanho
                    <span>
                      {props.blockSize.w ? `${props.blockSize.w}` : "auto"} ×{" "}
                      {props.blockSize.h ? `${props.blockSize.h}` : "auto"} px
                    </span>
                  </label>
                )}
                <span style={hint}>
                  Arraste o quadrado ciano no canto do bloco para redimensionar.
                </span>
                {props.blockSize && (
                  <button className="panel-button" onClick={props.onBlockSizeReset}>
                    Restaurar tamanho
                  </button>
                )}
                <button className="panel-button" onClick={props.onBlockReset}>
                  Remover personalização
                </button>
              </>
            ) : (
              <span style={hint}>
                Clique em um bloco do painel (fase, cartão ou cabeçalho) para
                mudar as cores só dele.
              </span>
            )}
          </Section>

          <Section title="FOTO SELECIONADA">
            {props.imageSelected ? (
              <>
                <Range
                  label="Zoom da foto"
                  min={100}
                  max={MAX_ZOOM * 100}
                  step={5}
                  suffix="%"
                  value={Math.round(frame.zoom * 100)}
                  onChange={(value) =>
                    props.onFrameChange(clampFrame({ ...frame, zoom: value / 100 }))
                  }
                />
                <Range
                  label="Posição horizontal da foto"
                  min={-50}
                  max={50}
                  disabled={frame.zoom === 1}
                  value={Math.round((frame.x / Math.max(1, maxPan(frame.zoom))) * 50)}
                  onChange={(value) =>
                    props.onFrameChange(
                      clampFrame({ ...frame, x: (value / 50) * maxPan(frame.zoom) }),
                    )
                  }
                />
                <Range
                  label="Posição vertical da foto"
                  min={-50}
                  max={50}
                  disabled={frame.zoom === 1}
                  value={Math.round((frame.y / Math.max(1, maxPan(frame.zoom))) * 50)}
                  onChange={(value) =>
                    props.onFrameChange(
                      clampFrame({ ...frame, y: (value / 50) * maxPan(frame.zoom) }),
                    )
                  }
                />
                <Range
                  label="Transparência da foto"
                  min={0}
                  max={90}
                  step={5}
                  suffix="%"
                  value={Math.round((1 - (frame.opacity ?? 1)) * 100)}
                  onChange={(value) =>
                    props.onFrameChange(clampFrame({ ...frame, opacity: 1 - value / 100 }))
                  }
                />
                <div className="photo-tools">
                  <button
                    className="panel-button"
                    onClick={() =>
                      props.onFrameChange(clampFrame({ ...frame, rotate: turn(frame.rotate, -1) }))
                    }
                  >
                    ↺ Girar 90°
                  </button>
                  <button
                    className="panel-button"
                    onClick={() =>
                      props.onFrameChange(clampFrame({ ...frame, rotate: turn(frame.rotate, 1) }))
                    }
                  >
                    ↻ Girar 90°
                  </button>
                  <button
                    className="panel-button"
                    aria-pressed={!!frame.flipX}
                    onClick={() =>
                      props.onFrameChange(clampFrame({ ...frame, flipX: !frame.flipX }))
                    }
                  >
                    ⇋ Espelhar
                  </button>
                  <button
                    className="panel-button"
                    aria-pressed={!!frame.flipY}
                    onClick={() =>
                      props.onFrameChange(clampFrame({ ...frame, flipY: !frame.flipY }))
                    }
                  >
                    ⇅ Inverter
                  </button>
                </div>
                <span style={hint}>
                  Você também pode arrastar a foto para reposicionar. Giro atual:{" "}
                  {frame.rotate ?? 0}°.
                </span>
                <button
                  className="panel-button"
                  disabled={isDefaultFrame(frame)}
                  onClick={props.onFrameReset}
                >
                  Restaurar enquadramento
                </button>
                <div className="photo-copy">
                  <label>
                    Incluir posição (arrasto)
                    <input
                      type="checkbox"
                      checked={includePosition}
                      onChange={(event) => setIncludePosition(event.target.checked)}
                    />
                  </label>
                  <div className="photo-tools">
                    <button className="panel-button" onClick={props.onFrameCopy}>
                      Copiar ajustes
                    </button>
                    <button
                      className="panel-button"
                      disabled={!props.canPaste}
                      onClick={() => props.onFramePaste(includePosition)}
                    >
                      Colar nesta foto
                    </button>
                  </div>
                  <button
                    className="panel-button"
                    disabled={props.photoCount < 2}
                    onClick={() => props.onFrameApplyAll(includePosition)}
                  >
                    Aplicar a todas as fotos ({props.photoCount})
                  </button>
                </div>
              </>
            ) : (
              <span style={hint}>
                Em uma foto já inserida, clique em AJUSTAR para mudar zoom,
                posição e transparência.
              </span>
            )}
          </Section>

          <Section title="FORMAS">
            <div className="panel-buttons">
              {SHAPE_BUTTONS.map(({ type, label }) => (
                <button
                  key={type}
                  className="panel-button"
                  onClick={() => props.onAddShape(type)}
                >
                  + {label}
                </button>
              ))}
            </div>
            {selected ? (
              <ShapeControls
                shape={selected}
                label={labels[selected.id]}
                onPatch={(patch) => props.onShapePatch(selected.id, patch)}
                onStack={(op) => props.onShapeStack(selected.id, op)}
                onDelete={() => props.onShapeDelete(selected.id)}
              />
            ) : (
              <span style={hint}>
                Clique em uma forma (ou na lista de camadas) para editá-la.
                Arraste para mover, use o canto para redimensionar e o círculo
                acima dela para girar.
              </span>
            )}
          </Section>

          <Section title="CAMADAS">
            {shapes.length === 0 ? (
              <span style={hint}>
                Nenhuma forma ainda. As formas inseridas aparecem aqui, da
                camada mais alta para a mais baixa.
              </span>
            ) : (
              <ul className="layers-list" aria-label="Camadas das formas">
                {groups.front.length > 0 && (
                  <li className="layer-heading" aria-hidden="true">
                    Na frente dos blocos
                  </li>
                )}
                {groups.front.map(layerRow)}
                <li className="layer-heading layer-heading--blocks">
                  Blocos do painel
                </li>
                {groups.behind.length > 0 && (
                  <li className="layer-heading" aria-hidden="true">
                    Atrás dos blocos
                  </li>
                )}
                {groups.behind.map(layerRow)}
              </ul>
            )}
          </Section>
        </>
      )}
    </aside>
  );
}

function LiveSection({
  live,
  onChange,
}: {
  live: Live;
  onChange: (patch: Partial<LiveSettings>) => void;
}) {
  const { settings } = live;
  const stamp = (fetchedAt: number | null, error: boolean) =>
    fetchedAt
      ? `atualizado às ${formatClock(new Date(fetchedAt).toISOString())}${error ? " (última tentativa falhou)" : ""}`
      : error
        ? "indisponível"
        : "aguardando";
  return (
    <Section title="DADOS AO VIVO">
      <label>
        Mostrar nos cartões
        <input
          type="checkbox"
          aria-label="Mostrar dados ao vivo nos cartões"
          checked={settings.enabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
        />
      </label>
      <span style={hint}>
        Precipitação e Indicadores mostram dados reais quando não há foto neles.
      </span>
      {settings.enabled && (
        <>
          <div className="number-grid">
            <NumberField
              label="Atenção (mm/24 h)"
              value={settings.attention24}
              min={1}
              onChange={(attention24) => onChange({ attention24 })}
            />
            <NumberField
              label="Alerta (mm/24 h)"
              value={settings.alert24}
              min={1}
              onChange={(alert24) => onChange({ alert24 })}
            />
          </div>
          <span style={hint}>
            Faixas de exemplo: ajuste ao protocolo da Defesa Civil.
          </span>
          <label className="url-field">
            Serviço CEMADEN
            <input
              type="text"
              value={settings.cemadenUrl}
              onChange={(event) => onChange({ cemadenUrl: event.target.value })}
            />
          </label>
          <span style={hint}>
            Chuva (Open-Meteo): {stamp(live.rain.fetchedAt, live.rain.error)}.
            <br />
            Estações (CEMADEN): {stamp(live.stations.fetchedAt, live.stations.error)}.
          </span>
          <button className="panel-button" disabled={live.loading} onClick={live.refresh}>
            {live.loading ? "Atualizando…" : "Atualizar agora"}
          </button>
          <span style={hint}>
            Open-Meteo: uso não comercial (CC-BY). Dados do CEMADEN/MCTI.
          </span>
        </>
      )}
    </Section>
  );
}

function ShapeControls({
  shape,
  label,
  onPatch,
  onStack,
  onDelete,
}: {
  shape: Shape;
  label: string;
  onPatch: (patch: Partial<Shape>) => void;
  onStack: (op: StackOp) => void;
  onDelete: () => void;
}) {
  const line = isLineShape(shape.type);
  const locked = !!shape.locked;
  return (
    <>
      <span style={{ color: "var(--text)" }}>{label}</span>
      <label>
        Cor
        <input
          type="color"
          value={shape.color}
          onChange={(event) => onPatch({ color: event.target.value })}
        />
      </label>
      {!line && (
        <label>
          Preenchida
          <input
            type="checkbox"
            checked={shape.filled}
            onChange={(event) => onPatch({ filled: event.target.checked })}
          />
        </label>
      )}
      <Range
        label="Espessura"
        min={1}
        max={16}
        value={shape.strokeWidth}
        onChange={(value) => onPatch({ strokeWidth: value })}
      />
      <Range
        label="Opacidade"
        min={10}
        max={100}
        suffix="%"
        value={Math.round(shape.opacity * 100)}
        onChange={(value) => onPatch({ opacity: value / 100 })}
      />
      <Range
        label="Rotação"
        min={-180}
        max={180}
        suffix="°"
        disabled={locked}
        value={Math.round(shape.rotation ?? 0)}
        onChange={(value) => onPatch({ rotation: normalizeAngle(value) })}
      />
      <div className="number-grid">
        <NumberField label="X" value={shape.x} disabled={locked} onChange={(x) => onPatch({ x })} />
        <NumberField label="Y" value={shape.y} disabled={locked} onChange={(y) => onPatch({ y })} />
        <NumberField
          label="Largura"
          value={shape.w}
          min={MIN_SHAPE_SIZE}
          disabled={locked}
          onChange={(w) => onPatch({ w: Math.max(MIN_SHAPE_SIZE, w) })}
        />
        <NumberField
          label="Altura"
          value={shape.h}
          min={MIN_SHAPE_SIZE}
          disabled={locked || line}
          onChange={(h) => onPatch({ h: Math.max(MIN_SHAPE_SIZE, h) })}
        />
      </div>
      <div className="panel-buttons">
        <button className="panel-button" onClick={() => onStack("front")}>
          Para o topo
        </button>
        <button className="panel-button" onClick={() => onStack("back")}>
          Para o fundo
        </button>
        <button className="panel-button" onClick={() => onStack("forward")}>
          Subir uma
        </button>
        <button className="panel-button" onClick={() => onStack("backward")}>
          Descer uma
        </button>
      </div>
      <label>
        Atrás dos blocos
        <input
          type="checkbox"
          checked={!!shape.behind}
          onChange={(event) => onPatch({ behind: event.target.checked })}
        />
      </label>
      <label>
        Bloqueada
        <input
          type="checkbox"
          checked={locked}
          onChange={(event) => onPatch({ locked: event.target.checked })}
        />
      </label>
      <button className="panel-button panel-button--danger" onClick={onDelete}>
        Excluir forma
      </button>
    </>
  );
}
