import type { KeyboardEvent } from "react";
import { useEditor } from "../editor/context";
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
  const { editMode, images, setImage } = useEditor();
  const image = images[id];

  const selectImage = () => {
    if (!editMode) return;
    pickFile("image/png,image/jpeg,image/webp", (file) => {
      compressImage(file)
        .then((dataUrl) => setImage(id, dataUrl))
        .catch(() => window.alert("Não foi possível carregar a imagem."));
    });
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
              setImage(id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.stopPropagation();
                setImage(id);
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
