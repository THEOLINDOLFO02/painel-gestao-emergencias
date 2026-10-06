import { toJpeg, toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import ToolButton from "./components/ToolButton";
import VersionsDialog from "./components/VersionsDialog";
import {
  DEFAULT_THEME,
  DesignPanel,
  isLineShape,
  ShapeItem,
  type BlockStyle,
  type Shape,
  type ShapeType,
  type Theme,
} from "./DesignTools";
import {
  blockLabel,
  EditorContext,
  type EditorState,
  type Position,
} from "./editor/context";
import {
  downloadProject,
  pickFile,
  readProjectFile,
  type ProjectData,
} from "./editor/project";
import { loadStored, saveStored, STORAGE_KEYS } from "./editor/storage";
import { useHistory } from "./editor/useHistory";
import { useImages } from "./editor/useImages";
import Command from "./sections/Command";
import Demobilization from "./sections/Demobilization";
import Header from "./sections/Header";
import Intervention from "./sections/Intervention";
import Monitoring from "./sections/Monitoring";
import Triage from "./sections/Triage";

// Salva o valor no localStorage sempre que ele muda.
function usePersist(key: string, value: unknown) {
  useEffect(() => {
    saveStored(key, value);
  }, [key, value]);
}

function FlowArrow() {
  return (
    <div className="flow-arrow" aria-hidden="true">
      <span />
    </div>
  );
}

export default function App() {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);

  const [texts, setTexts] = useState(() =>
    loadStored<Record<string, string>>(STORAGE_KEYS.texts, {}),
  );
  const [positions, setPositions] = useState(() =>
    loadStored<Record<string, Position>>(STORAGE_KEYS.positions, {}),
  );
  const [theme, setTheme] = useState<Theme>(() => ({
    ...DEFAULT_THEME,
    ...loadStored<Partial<Theme>>(STORAGE_KEYS.theme, {}),
  }));
  const [shapes, setShapes] = useState<Shape[]>(() => {
    const stored = loadStored<unknown>(STORAGE_KEYS.shapes, []);
    return Array.isArray(stored) ? stored : [];
  });
  const [blockStyles, setBlockStyles] = useState(() =>
    loadStored<Record<string, BlockStyle>>(STORAGE_KEYS.blocks, {}),
  );
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  // As imagens carregam depois; o histórico precisa partir delas já carregadas.
  const rebaseHistory = useRef<(images: Record<string, string>) => void>(
    () => {},
  );
  const [images, setImages] = useImages((loaded) => rebaseHistory.current(loaded));

  usePersist(STORAGE_KEYS.texts, texts);
  usePersist(STORAGE_KEYS.positions, positions);
  usePersist(STORAGE_KEYS.theme, theme);
  usePersist(STORAGE_KEYS.shapes, shapes);
  usePersist(STORAGE_KEYS.blocks, blockStyles);

  // ---- Projeto (tudo o que o usuário pode alterar) ----
  const project: ProjectData = {
    texts,
    images,
    theme,
    blockStyles,
    shapes,
    positions,
  };

  const applyProject = (data: ProjectData) => {
    setTexts(data.texts);
    setImages(data.images);
    setTheme(data.theme);
    setBlockStyles(data.blockStyles);
    setShapes(data.shapes);
    setPositions(data.positions);
    setSelectedShape(null);
    setSelectedBlock(null);
  };

  const history = useHistory(project, applyProject);
  rebaseHistory.current = (loaded) => history.rebase({ images: loaded });

  const openProject = () =>
    pickFile("application/json,.json", async (file) => {
      try {
        const data = await readProjectFile(file);
        if (
          window.confirm("Abrir este projeto? O conteúdo atual será substituído.")
        ) {
          applyProject(data);
        }
      } catch {
        window.alert("Não foi possível abrir o arquivo do projeto.");
      }
    });

  const resetContent = () => {
    if (window.confirm("Descartar textos e imagens editados?")) {
      setTexts({});
      setImages({});
    }
  };

  // ---- Tema ----
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--navy-950", theme.bg);
    root.setProperty("--orange", theme.accent);
    root.setProperty("--cyan", theme.secondary);
    root.setProperty("--text", theme.text);
    root.setProperty("--font-display", `"${theme.displayFont}"`);
    root.setProperty("--font-body", `"${theme.bodyFont}"`);
  }, [theme]);

  useEffect(() => {
    if (!editMode) {
      setSelectedShape(null);
      setSelectedBlock(null);
    }
  }, [editMode]);

  // ---- Blocos ----
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

  // ---- Formas ----
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" || !selectedShape) return;
      const target = event.target as HTMLElement;
      if (target.isContentEditable || target.tagName === "INPUT") return;
      deleteShape(selectedShape);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedShape]);

  // ---- Exportação em imagem ----
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
          : await toJpeg(dashboardRef.current, { ...options, quality: 0.95 });
      const link = document.createElement("a");
      link.download = `painel-defesa-civil.${format === "png" ? "png" : "jpg"}`;
      link.href = dataUrl;
      link.click();
    } catch {
      window.alert(
        "Não foi possível gerar a imagem. Tente novamente ou use a exportação em PDF.",
      );
    } finally {
      setEditMode(wasEditing);
      setExporting(false);
    }
  };

  const editor: EditorState = {
    editMode,
    texts,
    setText: (key, value) =>
      setTexts((current) => ({ ...current, [key]: value })),
    resetText: (key) =>
      setTexts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      }),
    images,
    setImage: (id, image) =>
      setImages((current) => {
        const next = { ...current };
        if (image) next[id] = image;
        else delete next[id];
        return next;
      }),
    positions,
    setPosition: (id, position) =>
      setPositions((current) => ({ ...current, [id]: position })),
    blockStyles,
    selectedBlock,
    selectBlock: (id) => {
      setSelectedBlock(id);
      setSelectedShape(null);
    },
  };

  return (
    <EditorContext.Provider value={editor}>
      <main
        className="dashboard-shell"
        onPointerDown={(event) => {
          if (
            !(event.target as HTMLElement).closest(".shape-item, .design-panel")
          ) {
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
            <ToolButton onClick={history.undo} disabled={!history.canUndo}>
              DESFAZER
            </ToolButton>
            <ToolButton onClick={history.redo} disabled={!history.canRedo}>
              REFAZER
            </ToolButton>
            <ToolButton onClick={() => exportImage("png")}>PNG</ToolButton>
            <ToolButton onClick={() => exportImage("jpeg")}>JPEG</ToolButton>
            <ToolButton onClick={() => window.print()}>PDF</ToolButton>
            <ToolButton
              className="tool-control--reset"
              onClick={() => setPositions({})}
            >
              RESTAURAR POSIÇÕES
            </ToolButton>
            <ToolButton onClick={() => downloadProject(project)}>
              SALVAR PROJETO
            </ToolButton>
            <ToolButton onClick={openProject}>ABRIR PROJETO</ToolButton>
            <ToolButton onClick={() => setVersionsOpen(true)}>VERSÕES</ToolButton>
            <ToolButton className="tool-control--reset" onClick={resetContent}>
              LIMPAR CONTEÚDO
            </ToolButton>
          </div>
          {exporting && (
            <div className="export-status" role="status">
              GERANDO ARQUIVO…
            </div>
          )}
        </div>

        <div className="dashboard" ref={dashboardRef}>
          <Header />
          <Monitoring />
          <FlowArrow />
          <Triage />
          <FlowArrow />
          <Command />
          <FlowArrow />
          <Intervention />
          <FlowArrow />
          <Demobilization />

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
            <span>
              MONITORAR • CLASSIFICAR • COORDENAR • INTERVIR • RECUPERAR
            </span>
          </footer>
        </div>

        {versionsOpen && (
          <VersionsDialog
            current={project}
            onRestore={applyProject}
            onClose={() => setVersionsOpen(false)}
          />
        )}

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
    </EditorContext.Provider>
  );
}
