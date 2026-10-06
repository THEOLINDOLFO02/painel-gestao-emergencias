import { toJpeg, toPng } from "html-to-image";
import {
  createContext,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_THEME,
  DesignPanel,
  isLineShape,
  type BlockStyle,
  type Shape,
  ShapeItem,
  type ShapeType,
  type Theme,
} from "./DesignTools";

type Position = {
  x: number;
  y: number;
};

const POSITIONS_KEY = "defesa-civil-positions";
const TEXTS_KEY = "defesa-civil-texts";
const IMAGES_KEY = "defesa-civil-images";
const THEME_KEY = "defesa-civil-theme";
const SHAPES_KEY = "defesa-civil-shapes";
const BLOCKS_KEY = "defesa-civil-blocks";

const BlockContext = createContext<{
  styles: Record<string, BlockStyle>;
  selected: string | null;
  editMode: boolean;
  select: (id: string) => void;
}>({ styles: {}, selected: null, editMode: false, select: () => {} });

const BLOCK_LABELS: Record<string, string> = {
  header: "Cabeçalho",
  "phase-1": "Fase 1 — Monitoramento",
  "phase-2": "Fase 2 — Triagem",
  "phase-3": "Fase 3 — Comando",
  "phase-4": "Fase 4 — Intervenção",
  "phase-5": "Fase 5 — Desmobilização",
  "monitor-map-card": "Mapa de risco",
  "monitor-radar-card": "Radar meteorológico",
  "monitor-indicators-card": "Indicadores",
  "monitor-rain-card": "Precipitação",
  "triage-small-card": "Nível 01",
  "triage-large-card": "Nível 02",
  "command-card": "Posto de comando",
};

const blockLabel = (id: string) => {
  if (BLOCK_LABELS[id]) return BLOCK_LABELS[id];
  const code = id.split("-").pop();
  if (id.startsWith("intervention-card")) return `Intervenção ${code}`;
  if (id.startsWith("demobilization-card")) return `Desmobilização ${code}`;
  return id;
};

function loadStored<T>(key: string): Record<string, T> {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}");
  } catch {
    return {};
  }
}

function saveStored(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("painel-defesa-civil", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("kv");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("kv").objectStore("kv").get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// Reduz a imagem enviada para caber no armazenamento local.
function compressImage(file: File, maxSize = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagem inválida"));
    };
    img.src = url;
  });
}

const TextStore = createContext<{
  texts: Record<string, string>;
  setText: (key: string, value: string) => void;
  resetText: (key: string) => void;
}>({ texts: {}, setText: () => {}, resetText: () => {} });

function Draggable({
  id,
  enabled,
  position = { x: 0, y: 0 },
  onPositionChange,
  children,
  className = "",
}: {
  id: string;
  enabled: boolean;
  position?: Position;
  onPositionChange: (id: string, position: Position) => void;
  children: ReactNode;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const block = useContext(BlockContext);
  const blockStyle = block.styles[id];
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
    const x = Math.round(
      (dragStart.current.x + event.clientX - dragStart.current.pointerX) / 4,
    ) * 4;
    const y = Math.round(
      (dragStart.current.y + event.clientY - dragStart.current.pointerY) / 4,
    ) * 4;
    onPositionChange(id, { x, y });
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
    onPositionChange(id, {
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

  return (
    <div
      className={`draggable-wrapper ${dragging ? "is-dragging" : ""} ${blockStyle?.bg ? "has-block-bg" : ""} ${block.editMode ? "is-block-selectable" : ""} ${block.editMode && block.selected === id ? "is-block-selected" : ""} ${className}`}
      style={wrapperStyle}
      onClick={(event) => {
        // Só o bloco mais interno clicado é selecionado.
        const owner = (event.target as HTMLElement).closest(".draggable-wrapper");
        if (block.editMode && owner === event.currentTarget) block.select(id);
      }}
    >
      {enabled && (
        <button
          type="button"
          className="drag-handle"
          aria-label="Mover item (setas do teclado, Shift para passos maiores)"
          title="Arraste para mover • Setas para ajuste fino"
          onFocus={() => block.select(id)}
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

type ImagePlaceholderProps = {
  id: string;
  label: string;
  compact?: boolean;
  className?: string;
  editMode: boolean;
  image?: string;
  onImageChange: (id: string, image?: string) => void;
};

function ImagePlaceholder({
  id,
  label,
  compact = false,
  className = "",
  editMode,
  image,
  onImageChange,
}: ImagePlaceholderProps) {
  const selectImage = () => {
    if (!editMode) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      compressImage(file)
        .then((dataUrl) => onImageChange(id, dataUrl))
        .catch(() => window.alert("Não foi possível carregar a imagem."));
    };
    input.click();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (editMode && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      selectImage();
    }
  };

  return (
    <div
      className={`image-placeholder ${image ? "image-placeholder--filled" : ""} ${editMode ? "image-placeholder--editable" : ""} ${compact ? "image-placeholder--compact" : ""} ${className}`}
      role={editMode ? "button" : "img"}
      aria-label={`Espaço reservado para ${label}`}
      tabIndex={editMode ? 0 : -1}
      onClick={selectImage}
      onKeyDown={handleKeyDown}
    >
      {image ? (
        <img src={image} alt={label} className="uploaded-image" />
      ) : (
        <>
          <svg
            viewBox="0 0 40 40"
            aria-hidden="true"
            className="placeholder-icon"
          >
            <rect x="5" y="7" width="30" height="26" rx="3" />
            <circle cx="14" cy="16" r="3" />
            <path d="m8 29 8-8 5 5 4-4 7 7" />
          </svg>
          <span>{editMode ? `Clique para inserir • ${label}` : label}</span>
        </>
      )}
      {editMode && image && (
        <div className="image-actions">
          <span>CLIQUE PARA TROCAR</span>
          <span
            className="remove-image"
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onImageChange(id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.stopPropagation();
                onImageChange(id);
              }
            }}
          >
            REMOVER
          </span>
        </div>
      )}
    </div>
  );
}

function EditableText({
  children,
  editMode,
  className = "",
}: {
  children: ReactNode;
  editMode: boolean;
  className?: string;
}) {
  const { texts, setText, resetText } = useContext(TextStore);
  const ref = useRef<HTMLSpanElement>(null);
  // O texto original serve de chave para o texto editado salvo.
  const key = typeof children === "string" ? children : undefined;
  const value = key !== undefined ? (texts[key] ?? key) : undefined;
  const modified = key !== undefined && value !== key;

  useLayoutEffect(() => {
    if (ref.current && value !== undefined && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  return (
    <>
      <span
        ref={ref}
        className={`editable-text ${editMode ? "editable-text--active" : ""} ${className}`}
        contentEditable={editMode}
        role={editMode ? "textbox" : undefined}
        aria-label={editMode ? "Texto editável" : undefined}
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={(event) => {
          if (key === undefined) return;
          const edited = event.currentTarget.textContent ?? "";
          if (edited !== value) setText(key, edited);
        }}
      >
        {value === undefined ? children : null}
      </span>
      {editMode && modified && key !== undefined && (
        <span
          className="text-restore"
          role="button"
          tabIndex={0}
          contentEditable={false}
          title={`Restaurar texto original: ${key}`}
          aria-label="Restaurar texto original"
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            resetText(key);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              resetText(key);
            }
          }}
        >
          ↺
        </span>
      )}
    </>
  );
}

function ToolButton({
  onClick,
  className = "",
  disabled = false,
  pressed,
  children,
}: {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`tool-control ${disabled ? "tool-control--disabled" : ""} ${className}`}
      disabled={disabled}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PhaseLabel({
  number,
  title,
  align = "center",
  editMode,
}: {
  number: string;
  title: string;
  align?: "center" | "left";
  editMode: boolean;
}) {
  return (
    <div className={`phase-label phase-label--${align}`}>
      <span>FASE {number}</span>
      <strong role="heading" aria-level={2}>
        <EditableText editMode={editMode}>{title}</EditableText>
      </strong>
    </div>
  );
}

const triageItems = {
  small: [
    "Ocorrência pontual e área delimitada",
    "Equipe local de resposta mobilizada",
    "Recursos municipais suficientes",
    "Monitoramento preventivo mantido",
  ],
  large: [
    "Múltiplos pontos e risco à população",
    "Reforço técnico especializado",
    "Mobilização integrada de recursos",
    "Escalonamento imediato do comando",
  ],
};

const interventionCards = [
  {
    code: "01",
    title: "RESGATE E SALVAMENTO",
    copy: "Ações de busca, resgate, evacuação e atendimento emergencial às comunidades afetadas.",
  },
  {
    code: "02",
    title: "CONTROLE DE RISCOS",
    copy: "Isolamento de áreas críticas, contenção de danos e estabilização dos cenários de risco.",
  },
  {
    code: "03",
    title: "SUPORTE ESSENCIAL",
    copy: "Restabelecimento prioritário de energia, vias, comunicações e serviços fundamentais.",
  },
];

const demobilizationCards = [
  {
    code: "A",
    title: "ASSISTÊNCIA",
    copy: "Acolhimento e apoio social",
  },
  {
    code: "B",
    title: "SUPRIMENTOS",
    copy: "Organização de donativos",
  },
  {
    code: "C",
    title: "REAVALIAÇÃO",
    copy: "Vistoria das áreas afetadas",
  },
  {
    code: "D",
    title: "RELATÓRIO",
    copy: "Registro e encerramento",
  },
];

export default function App() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
  // As imagens ficam no IndexedDB (sem o limite de ~5 MB do localStorage) e
  // são carregadas de forma assíncrona.
  const [images, setImages] = useState<Record<string, string>>({});
  const [imagesReady, setImagesReady] = useState(false);
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    loadStored<string>(TEXTS_KEY),
  );
  const [exporting, setExporting] = useState(false);
  const [positions, setPositions] = useState<Record<string, Position>>(() =>
    loadStored<Position>(POSITIONS_KEY),
  );

  useEffect(() => {
    saveStored(POSITIONS_KEY, positions);
  }, [positions]);

  useEffect(() => {
    saveStored(TEXTS_KEY, texts);
  }, [texts]);

  useEffect(() => {
    if (!imagesReady) return;
    idbSet(IMAGES_KEY, images)
      .then(() => window.localStorage.removeItem(IMAGES_KEY))
      .catch(() => {
        // Sem IndexedDB: usa o localStorage, que tem limite menor.
        if (!saveStored(IMAGES_KEY, images)) {
          window.alert(
            "Espaço de armazenamento cheio: as imagens não serão mantidas ao recarregar.",
          );
        }
      });
  }, [images, imagesReady]);

  useEffect(() => {
    const legacy = loadStored<string>(IMAGES_KEY);
    idbGet<Record<string, string>>(IMAGES_KEY)
      .catch(() => undefined)
      .then((stored) => {
        const loaded = stored && Object.keys(stored).length ? stored : legacy;
        // Evita que o carregamento conte como uma alteração a desfazer.
        history.current.committed = {
          ...history.current.committed,
          images: loaded,
        };
        setImages(loaded);
        setImagesReady(true);
      });
  }, []);

  const [theme, setTheme] = useState<Theme>(() => ({
    ...DEFAULT_THEME,
    ...loadStored<string>(THEME_KEY),
  }));
  const [shapes, setShapes] = useState<Shape[]>(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SHAPES_KEY) ?? "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [blockStyles, setBlockStyles] = useState<Record<string, BlockStyle>>(
    () => loadStored<BlockStyle>(BLOCKS_KEY),
  );
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  useEffect(() => {
    saveStored(BLOCKS_KEY, blockStyles);
  }, [blockStyles]);

  const patchBlock = (patch: BlockStyle) => {
    if (!selectedBlock) return;
    setBlockStyles((current) => ({
      ...current,
      [selectedBlock]: { ...current[selectedBlock], ...patch },
    }));
  };

  const resetBlock = () => {
    if (!selectedBlock) return;
    setBlockStyles((current) => {
      const next = { ...current };
      delete next[selectedBlock];
      return next;
    });
  };

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--navy-950", theme.bg);
    root.setProperty("--orange", theme.accent);
    root.setProperty("--cyan", theme.secondary);
    root.setProperty("--text", theme.text);
    root.setProperty("--font-display", `"${theme.displayFont}"`);
    root.setProperty("--font-body", `"${theme.bodyFont}"`);
    saveStored(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    saveStored(SHAPES_KEY, shapes);
  }, [shapes]);

  useEffect(() => {
    if (!editMode) {
      setSelectedShape(null);
      setSelectedBlock(null);
    }
  }, [editMode]);

  const updateShape = (id: string, patch: Partial<Shape>) =>
    setShapes((current) =>
      current.map((shape) => (shape.id === id ? { ...shape, ...patch } : shape)),
    );

  const deleteShape = (id: string) => {
    setShapes((current) => current.filter((shape) => shape.id !== id));
    setSelectedShape(null);
  };

  const addShape = (type: ShapeType) => {
    const top = dashboardRef.current?.getBoundingClientRect().top ?? 0;
    const line = isLineShape(type);
    const shape: Shape = {
      id: `shape-${Date.now()}`,
      type,
      x: 60,
      y: Math.max(40, Math.round(160 - top)),
      w: line ? 200 : 160,
      h: line ? 24 : 100,
      color: theme.accent,
      filled: false,
      opacity: 1,
      strokeWidth: line ? 4 : 3,
    };
    setShapes((current) => [...current, shape]);
    setSelectedShape(shape.id);
  };

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Delete" || !selectedShape) return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || target.tagName === "INPUT") return;
      deleteShape(selectedShape);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedShape]);

  const setText = (key: string, value: string) =>
    setTexts((current) => ({ ...current, [key]: value }));

  const resetText = (key: string) =>
    setTexts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

  // ---- Desfazer / refazer ----
  // Cada campo do projeto é imutável, então basta comparar referências.
  type Snapshot = {
    texts: typeof texts;
    images: typeof images;
    theme: Theme;
    blockStyles: typeof blockStyles;
    shapes: Shape[];
    positions: typeof positions;
  };
  const current: Snapshot = {
    texts,
    images,
    theme,
    blockStyles,
    shapes,
    positions,
  };
  const currentRef = useRef(current);
  currentRef.current = current;
  const history = useRef<{
    committed: Snapshot;
    past: Snapshot[];
    future: Snapshot[];
    timer?: number;
  }>({ committed: current, past: [], future: [] });
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });

  const differs = (a: Snapshot, b: Snapshot) =>
    (Object.keys(a) as (keyof Snapshot)[]).some((k) => a[k] !== b[k]);

  const syncHistoryState = () =>
    setHistoryState({
      undo: history.current.past.length > 0,
      redo: history.current.future.length > 0,
    });

  // Agrupa alterações seguidas (arrastar, digitar) em um único passo.
  const commitHistory = () => {
    const h = history.current;
    window.clearTimeout(h.timer);
    h.timer = undefined;
    if (!differs(h.committed, currentRef.current)) return;
    h.past = [...h.past.slice(-49), h.committed];
    h.committed = currentRef.current;
    h.future = [];
    syncHistoryState();
  };

  useEffect(() => {
    const h = history.current;
    if (!differs(h.committed, current)) {
      window.clearTimeout(h.timer);
      h.timer = undefined;
      const canUndo = h.past.length > 0;
      setHistoryState((state) =>
        state.undo === canUndo ? state : { ...state, undo: canUndo },
      );
      return;
    }
    window.clearTimeout(h.timer);
    h.timer = window.setTimeout(commitHistory, 400);
    // Já há algo para desfazer, mesmo antes do passo ser confirmado.
    setHistoryState((state) => (state.undo ? state : { ...state, undo: true }));
  });

  const applySnapshot = (snapshot: Snapshot) => {
    setTexts(snapshot.texts);
    setImages(snapshot.images);
    setTheme(snapshot.theme);
    setBlockStyles(snapshot.blockStyles);
    setShapes(snapshot.shapes);
    setPositions(snapshot.positions);
    setSelectedShape(null);
    setSelectedBlock(null);
  };

  const undo = () => {
    commitHistory();
    const h = history.current;
    const previous = h.past[h.past.length - 1];
    if (!previous) return;
    h.past = h.past.slice(0, -1);
    h.future = [...h.future, h.committed];
    h.committed = previous;
    applySnapshot(previous);
    syncHistoryState();
  };

  const redo = () => {
    commitHistory();
    const h = history.current;
    const next = h.future[h.future.length - 1];
    if (!next) return;
    h.future = h.future.slice(0, -1);
    h.past = [...h.past, h.committed];
    h.committed = next;
    applySnapshot(next);
    syncHistoryState();
  };

  const historyActions = useRef({ undo, redo });
  historyActions.current = { undo, redo };

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target as HTMLElement;
      // Dentro de um campo de texto vale o desfazer nativo do navegador.
      if (target.isContentEditable || target.tagName === "INPUT") return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        historyActions.current.undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        historyActions.current.redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const saveProject = () => {
    const project = {
      app: "painel-defesa-civil",
      version: 1,
      texts,
      images,
      theme,
      blocks: blockStyles,
      shapes,
      positions,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(project)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "painel-defesa-civil.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const openProject = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const isRecord = (value: unknown): value is Record<string, never> =>
        typeof value === "object" && value !== null && !Array.isArray(value);
      try {
        const project = JSON.parse(await file.text());
        if (!isRecord(project) || project.app !== "painel-defesa-civil") {
          throw new Error("Arquivo inválido");
        }
        if (
          !window.confirm("Abrir este projeto? O conteúdo atual será substituído.")
        ) {
          return;
        }
        setTexts(isRecord(project.texts) ? project.texts : {});
        setImages(isRecord(project.images) ? project.images : {});
        setTheme({
          ...DEFAULT_THEME,
          ...(isRecord(project.theme) ? project.theme : {}),
        });
        setBlockStyles(isRecord(project.blocks) ? project.blocks : {});
        setShapes(Array.isArray(project.shapes) ? project.shapes : []);
        setPositions(isRecord(project.positions) ? project.positions : {});
        setSelectedShape(null);
        setSelectedBlock(null);
      } catch {
        window.alert("Não foi possível abrir o arquivo do projeto.");
      }
    };
    input.click();
  };

  const resetContent = () => {
    if (window.confirm("Descartar textos e imagens editados?")) {
      setTexts({});
      setImages({});
    }
  };

  const handleImageChange = (id: string, image?: string) => {
    setImages((current) => {
      const next = { ...current };
      if (image) next[id] = image;
      else delete next[id];
      return next;
    });
  };

  const download = (dataUrl: string, extension: string) => {
    const link = document.createElement("a");
    link.download = `painel-defesa-civil.${extension}`;
    link.href = dataUrl;
    link.click();
  };

  const exportImage = async (format: "png" | "jpeg") => {
    if (!dashboardRef.current || exporting) return;
    setExporting(true);
    const wasEditing = editMode;
    setEditMode(false);

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const options = {
        backgroundColor: theme.bg,
        cacheBust: true,
        pixelRatio: 2,
      };
      const dataUrl =
        format === "png"
          ? await toPng(dashboardRef.current, options)
          : await toJpeg(dashboardRef.current, {
              ...options,
              quality: 0.95,
            });
      download(dataUrl, format === "png" ? "png" : "jpg");
    } catch {
      window.alert(
        "Não foi possível gerar a imagem. Tente novamente ou use a exportação em PDF.",
      );
    } finally {
      setEditMode(wasEditing);
      setExporting(false);
    }
  };

  const imageTools = {
    editMode,
    onImageChange: handleImageChange,
  };

  const handlePositionChange = (id: string, position: Position) => {
    setPositions((current) => ({ ...current, [id]: position }));
  };

  const dragTools = {
    enabled: editMode,
    onPositionChange: handlePositionChange,
  };

  return (
    <TextStore.Provider value={{ texts, setText, resetText }}>
    <BlockContext.Provider
      value={{
        styles: blockStyles,
        selected: selectedBlock,
        editMode,
        select: (id) => {
          setSelectedBlock(id);
          setSelectedShape(null);
        },
      }}
    >
    <main
      className="dashboard-shell"
      onPointerDown={(event) => {
        if (!(event.target as HTMLElement).closest(".shape-item, .design-panel")) {
          setSelectedShape(null);
          setSelectedBlock(null);
        }
      }}
    >
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Ferramentas do painel"
      >
        <div className="toolbar-copy">
          <strong>EDITOR DO PAINEL</strong>
          <span>
            {editMode
              ? "Clique nos textos e imagens para editar"
              : "Ative a edição para personalizar o conteúdo"}
          </span>
        </div>
        <div className="toolbar-actions">
          <ToolButton
            pressed={editMode}
            className={`tool-control--primary ${editMode ? "is-active" : ""}`}
            onClick={() => setEditMode((current) => !current)}
          >
            {editMode ? "CONCLUIR EDIÇÃO" : "EDITAR PAINEL"}
          </ToolButton>
          <ToolButton onClick={undo} disabled={!historyState.undo}>
            DESFAZER
          </ToolButton>
          <ToolButton onClick={redo} disabled={!historyState.redo}>
            REFAZER
          </ToolButton>
          <ToolButton onClick={() => exportImage("png")}>PNG</ToolButton>
          <ToolButton onClick={() => exportImage("jpeg")}>JPEG</ToolButton>
          <ToolButton onClick={() => window.print()}>PDF</ToolButton>
          <ToolButton className="tool-control--reset" onClick={() => setPositions({})}>
            RESTAURAR POSIÇÕES
          </ToolButton>
          <ToolButton onClick={saveProject}>SALVAR PROJETO</ToolButton>
          <ToolButton onClick={openProject}>ABRIR PROJETO</ToolButton>
          <ToolButton className="tool-control--reset" onClick={resetContent}>
            LIMPAR CONTEÚDO
          </ToolButton>
        </div>
        {exporting && <div className="export-status" role="status">
            GERANDO ARQUIVO…
          </div>}
      </div>

      <div className="dashboard" ref={dashboardRef}>
        <Draggable
          id="header"
          position={positions.header}
          {...dragTools}
        >
          <header className="hero-header">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="hero-copy">
            <div className="eyebrow">DEFESA CIVIL • OPERAÇÕES INTEGRADAS</div>
            <div className="main-title" role="heading" aria-level={1}>
              <EditableText editMode={editMode}>
                SISTEMA INTEGRADO DE GESTÃO DE EMERGÊNCIAS
              </EditableText>
            </div>
          </div>
          <div className="status-badge">
            <span className="status-dot" />
            PAINEL OPERACIONAL
          </div>
          </header>
        </Draggable>

        <Draggable
          id="phase-1"
          position={positions["phase-1"]}
          {...dragTools}
        >
          <section className="phase-section monitoring-section">
          <PhaseLabel
            number="1"
            title="MONITORAMENTO"
            editMode={editMode}
          />
          <div className="monitoring-grid">
            <Draggable
              id="monitor-map-card"
              position={positions["monitor-map-card"]}
              {...dragTools}
            >
              <div className="monitor-card monitor-card--wide">
                <div className="card-kicker">
                  <span className="card-number">01</span>
                  <EditableText editMode={editMode}>MAPA DE RISCO</EditableText>
                </div>
                <ImagePlaceholder
                  id="monitor-map"
                  label="Mapa de monitoramento"
                  image={images["monitor-map"]}
                  {...imageTools}
                />
              </div>
            </Draggable>
            <Draggable
              id="monitor-radar-card"
              position={positions["monitor-radar-card"]}
              {...dragTools}
            >
              <div className="monitor-card">
                <div className="card-kicker">
                  <span className="card-number">02</span>
                  <EditableText editMode={editMode}>
                    RADAR METEOROLÓGICO
                  </EditableText>
                </div>
                <ImagePlaceholder
                  id="monitor-radar"
                  label="Mapa climático"
                  image={images["monitor-radar"]}
                  {...imageTools}
                />
              </div>
            </Draggable>
            <Draggable
              id="monitor-indicators-card"
              position={positions["monitor-indicators-card"]}
              {...dragTools}
            >
              <div className="monitor-card">
                <div className="card-kicker">
                  <span className="card-number">03</span>
                  <EditableText editMode={editMode}>INDICADORES</EditableText>
                </div>
                <ImagePlaceholder
                  id="monitor-indicators"
                  label="Gráfico de alertas"
                  image={images["monitor-indicators"]}
                  {...imageTools}
                />
              </div>
            </Draggable>
            <Draggable
              id="monitor-rain-card"
              position={positions["monitor-rain-card"]}
              {...dragTools}
            >
              <div className="monitor-card">
                <div className="card-kicker">
                  <span className="card-number">04</span>
                  <EditableText editMode={editMode}>PRECIPITAÇÃO</EditableText>
                </div>
                <ImagePlaceholder
                  id="monitor-rain"
                  label="Gráfico climático"
                  image={images["monitor-rain"]}
                  {...imageTools}
                />
              </div>
            </Draggable>
          </div>
          </section>
        </Draggable>

        <div className="flow-arrow" aria-hidden="true">
          <span />
        </div>

        <Draggable
          id="phase-2"
          position={positions["phase-2"]}
          {...dragTools}
        >
          <section className="phase-section triage-section">
          <PhaseLabel
            number="2"
            title="TRIAGEM E CLASSIFICAÇÃO"
            editMode={editMode}
          />
          <div className="triage-grid">
            <Draggable
              id="triage-small-card"
              position={positions["triage-small-card"]}
              {...dragTools}
            >
              <article className="triage-card triage-card--small">
                <div className="triage-heading">
                  <span className="severity-tag">NÍVEL 01</span>
                  <div>
                    <EditableText editMode={editMode}>
                      PEQUENA PROPORÇÃO
                    </EditableText>
                  </div>
                  <p>
                    <EditableText editMode={editMode}>
                      Resposta local coordenada
                    </EditableText>
                  </p>
                </div>
                <div className="triage-content">
                  <ImagePlaceholder
                    id="triage-small"
                    label="Foto da ocorrência"
                    image={images["triage-small"]}
                    {...imageTools}
                  />
                  <ul>
                    {triageItems.small.map((item) => (
                      <li key={item}>
                        <EditableText editMode={editMode}>{item}</EditableText>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Draggable>

            <Draggable
              id="triage-large-card"
              position={positions["triage-large-card"]}
              {...dragTools}
            >
              <article className="triage-card triage-card--large">
                <div className="triage-heading">
                  <span className="severity-tag">NÍVEL 02</span>
                  <div>
                    <EditableText editMode={editMode}>
                      MAIOR PROPORÇÃO
                    </EditableText>
                  </div>
                  <p>
                    <EditableText editMode={editMode}>
                      Resposta ampliada e integrada
                    </EditableText>
                  </p>
                </div>
                <div className="triage-content">
                  <ImagePlaceholder
                    id="triage-large"
                    label="Foto da ocorrência"
                    image={images["triage-large"]}
                    {...imageTools}
                  />
                  <ul>
                    {triageItems.large.map((item) => (
                      <li key={item}>
                        <EditableText editMode={editMode}>{item}</EditableText>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Draggable>
          </div>
          </section>
        </Draggable>

        <div className="flow-arrow" aria-hidden="true">
          <span />
        </div>

        <Draggable
          id="phase-3"
          position={positions["phase-3"]}
          {...dragTools}
        >
          <section className="phase-section command-section">
          <PhaseLabel number="3" title="COMANDO" editMode={editMode} />
          <Draggable
            id="command-card"
            position={positions["command-card"]}
            {...dragTools}
          >
            <div className="command-card">
              <div className="command-copy">
                <span className="command-index">PC</span>
                <div>
                  <strong>
                    <EditableText editMode={editMode}>
                      POSTO DE COMANDO INTEGRADO
                    </EditableText>
                  </strong>
                  <p>
                    <EditableText editMode={editMode}>
                      Coordenação estratégica, consolidação de dados e tomada de
                      decisão.
                    </EditableText>
                  </p>
                </div>
              </div>
              <ImagePlaceholder
                id="command-center"
                label="Foto da central de comando"
                className="command-placeholder"
                image={images["command-center"]}
                {...imageTools}
              />
              <div className="command-meta">
                <span>SITUAÇÃO</span>
                <strong>
                  <EditableText editMode={editMode}>EM OPERAÇÃO</EditableText>
                </strong>
              </div>
            </div>
          </Draggable>
          </section>
        </Draggable>

        <div className="flow-arrow" aria-hidden="true">
          <span />
        </div>

        <Draggable
          id="phase-4"
          position={positions["phase-4"]}
          {...dragTools}
        >
          <section className="phase-section intervention-section">
          <PhaseLabel
            number="4"
            title="INTERVENÇÃO"
            editMode={editMode}
          />
          <div className="intervention-grid">
            {interventionCards.map((card) => (
              <Draggable
                id={`intervention-card-${card.code}`}
                key={card.code}
                position={positions[`intervention-card-${card.code}`]}
                {...dragTools}
              >
                <article className="intervention-card">
                  <div className="intervention-heading">
                    <span>{card.code}</span>
                    <strong>
                      <EditableText editMode={editMode}>
                        {card.title}
                      </EditableText>
                    </strong>
                  </div>
                  <ImagePlaceholder
                    id={`intervention-${card.code}`}
                    label={`Foto — ${card.title}`}
                    image={images[`intervention-${card.code}`]}
                    {...imageTools}
                  />
                  <p>
                    <EditableText editMode={editMode}>{card.copy}</EditableText>
                  </p>
                </article>
              </Draggable>
            ))}
          </div>
          </section>
        </Draggable>

        <div className="flow-arrow" aria-hidden="true">
          <span />
        </div>

        <Draggable
          id="phase-5"
          position={positions["phase-5"]}
          {...dragTools}
        >
          <section className="phase-section demobilization-section">
          <PhaseLabel
            number="5"
            title="DESMOBILIZAÇÃO"
            editMode={editMode}
          />
          <div className="demobilization-grid">
            {demobilizationCards.map((card) => (
              <Draggable
                id={`demobilization-card-${card.code}`}
                key={card.code}
                position={positions[`demobilization-card-${card.code}`]}
                {...dragTools}
              >
                <article className="demobilization-card">
                  <div className="mini-code">
                    <EditableText editMode={editMode}>{card.code}</EditableText>
                  </div>
                  <ImagePlaceholder
                    id={`demobilization-${card.code}`}
                    label="Inserir foto"
                    compact
                    image={images[`demobilization-${card.code}`]}
                    {...imageTools}
                  />
                  <div className="mini-copy">
                    <strong>
                      <EditableText editMode={editMode}>
                        {card.title}
                      </EditableText>
                    </strong>
                    <p>
                      <EditableText editMode={editMode}>
                        {card.copy}
                      </EditableText>
                    </p>
                  </div>
                </article>
              </Draggable>
            ))}
          </div>
          </section>
        </Draggable>

        {shapes.map((shape) => (
          <ShapeItem
            key={shape.id}
            shape={shape}
            editMode={editMode}
            selected={selectedShape === shape.id}
            onSelect={(id) => {
              setSelectedShape(id);
              setSelectedBlock(null);
            }}
            onChange={updateShape}
          />
        ))}

        <footer className="dashboard-footer">
          <span>PROTOCOLO INTEGRADO DE RESPOSTA</span>
          <span>MONITORAR • CLASSIFICAR • COORDENAR • INTERVIR • RECUPERAR</span>
        </footer>
      </div>

      {editMode && (
        <DesignPanel
          theme={theme}
          onThemeChange={(patch) =>
            setTheme((current) => ({ ...current, ...patch }))
          }
          onThemeReset={() => setTheme(DEFAULT_THEME)}
          onAddShape={addShape}
          selected={shapes.find((shape) => shape.id === selectedShape)}
          onShapeChange={(patch) =>
            selectedShape && updateShape(selectedShape, patch)
          }
          onShapeDelete={() => selectedShape && deleteShape(selectedShape)}
          blockLabel={selectedBlock ? blockLabel(selectedBlock) : undefined}
          blockStyle={selectedBlock ? blockStyles[selectedBlock] : undefined}
          onBlockChange={patchBlock}
          onBlockReset={resetBlock}
        />
      )}
    </main>
    </BlockContext.Provider>
    </TextStore.Provider>
  );
}
