import { type ReactNode, useLayoutEffect, useRef } from "react";
import { useEditor } from "../editor/context";

export default function EditableText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const { editMode, texts, setText, resetText } = useEditor();
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
