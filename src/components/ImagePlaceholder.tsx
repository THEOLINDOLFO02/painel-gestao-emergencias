import { type KeyboardEvent, type PointerEvent, useRef } from "react";
import { useEditor } from "../editor/context";
import { clampFrame, DEFAULT_FRAME, frameTransform } from "../editor/frame";
import { useOrientedImage } from "../editor/orient";
import { pickFile } from "../editor/project";
import { compressImage } from "../editor/storage";

export default function ImagePlaceholder({
  id,
  label,
  compact = false,
  className = "",
}: {
  id: string;
  label: string;
  compact?: boolean;
  className?: string;
}) {
  const { editMode, images, setImage, frames, setFrame, selectedImage, selectImage } =
    useEditor();
  const image = images[id];
  const frame = frames[id];
  const framing = editMode && !!image && selectedImage === id;
  const photo = useOrientedImage(image, frame);
  const pan = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const selectFile = () => {
    if (!editMode) return;
    pickFile("image/png,image/jpeg,image/webp", (file) => {
      compressImage(file)
        .then((dataUrl) => {
          setImage(id, dataUrl);
          setFrame(id); // foto nova começa sem enquadramento
        })
        .catch(() => window.alert("Não foi possível carregar a imagem."));
    });
  };

  const handleClick = () => {
    // Enquadrando, o clique não abre o seletor de arquivos.
    if (!framing) selectFile();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (editMode && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      handleClick();
    }
  };

  const startPan = (event: PointerEvent<HTMLElement>) => {
    if (!framing) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = frame ?? DEFAULT_FRAME;
    pan.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: current.x,
      y: current.y,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const movePan = (event: PointerEvent<HTMLElement>) => {
    const start = pan.current;
    if (!start) return;
    const current = frame ?? DEFAULT_FRAME;
    setFrame(
      id,
      clampFrame({
        ...current,
        x: start.x + ((event.clientX - start.pointerX) / start.width) * 100,
        y: start.y + ((event.clientY - start.pointerY) / start.height) * 100,
      }),
    );
  };

  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <div
      className={`image-placeholder ${image ? "image-placeholder--filled" : ""} ${editMode ? "image-placeholder--editable" : ""} ${framing ? "image-placeholder--framing" : ""} ${compact ? "image-placeholder--compact" : ""} ${className}`}
      role={!editMode ? "img" : image ? "group" : "button"}
      aria-label={`Espaço reservado para ${label}`}
      tabIndex={editMode && !image ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={() => (pan.current = null)}
      onPointerCancel={() => (pan.current = null)}
    >
      {image ? (
        <div
          className="photo-frame"
          style={{ transform: frameTransform(frame), opacity: frame?.opacity }}
        >
          <img
            src={photo}
            alt={label}
            className="uploaded-image"
            data-rotate={frame?.rotate ?? 0}
            data-flip-x={frame?.flipX ? "true" : undefined}
            data-flip-y={frame?.flipY ? "true" : undefined}
            draggable={false}
          />
        </div>
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
          <button
            type="button"
            className="image-action"
            onPointerDown={stop}
            onClick={(event) => {
              event.stopPropagation();
              selectFile();
            }}
          >
            TROCAR
          </button>
          <button
            type="button"
            className="image-action"
            aria-pressed={framing}
            onPointerDown={stop}
            onClick={(event) => {
              event.stopPropagation();
              selectImage(framing ? null : id);
            }}
          >
            {framing ? "CONCLUIR" : "AJUSTAR"}
          </button>
          <button
            type="button"
            className="image-action remove-image"
            onPointerDown={stop}
            onClick={(event) => {
              event.stopPropagation();
              setImage(id);
              setFrame(id);
              selectImage(null);
            }}
          >
            REMOVER
          </button>
        </div>
      )}
    </div>
  );
}
