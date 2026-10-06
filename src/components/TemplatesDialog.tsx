import { useEffect } from "react";
import { type Template, TEMPLATES } from "../editor/templates";

export default function TemplatesDialog({
  onApply,
  onClose,
}: {
  onApply: (template: Template) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const apply = (template: Template) => {
    if (
      window.confirm(
        `Aplicar o modelo "${template.name}"? Os textos e as cores gerais serão substituídos (você pode desfazer). Imagens, formas e posições são mantidas.`,
      )
    ) {
      onApply(template);
      onClose();
    }
  };

  return (
    <div
      className="versions-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="versions-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-title"
      >
        <header>
          <h2 id="templates-title">Modelos</h2>
          <button
            type="button"
            className="panel-button"
            autoFocus
            onClick={onClose}
          >
            Fechar
          </button>
        </header>
        <ul className="versions-list templates-list">
          {TEMPLATES.map((template) => (
            <li key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </div>
              <button
                type="button"
                className="panel-button"
                aria-label={`Aplicar ${template.name}`}
                onClick={() => apply(template)}
              >
                Aplicar
              </button>
            </li>
          ))}
        </ul>
        <p className="versions-note">
          Seus próprios modelos: salve uma versão em Versões e restaure-a quando
          quiser.
        </p>
      </div>
    </div>
  );
}
