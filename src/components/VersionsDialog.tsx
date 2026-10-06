import { useEffect, useRef, useState } from "react";
import type { ProjectData } from "../editor/project";
import {
  defaultVersionName,
  loadVersions,
  MAX_VERSIONS,
  saveVersions,
  type Version,
} from "../editor/versions";

export default function VersionsDialog({
  current,
  onRestore,
  onClose,
}: {
  current: ProjectData;
  onRestore: (data: ProjectData) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [name, setName] = useState(() => defaultVersionName());
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVersions().then(setVersions);
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const persist = async (next: Version[]) => {
    try {
      await saveVersions(next);
      setVersions(next);
      setError("");
    } catch {
      setError("Não foi possível salvar: espaço de armazenamento insuficiente.");
    }
  };

  const saveCurrent = () => {
    if (!versions) return;
    const version: Version = {
      id: `v-${Date.now()}`,
      name: name.trim() || defaultVersionName(),
      createdAt: Date.now(),
      data: current,
    };
    persist([version, ...versions].slice(0, MAX_VERSIONS));
    setName(defaultVersionName());
  };

  const restore = (version: Version) => {
    if (
      window.confirm(
        `Restaurar "${version.name}"? O conteúdo atual será substituído (você pode desfazer).`,
      )
    ) {
      onRestore(version.data);
      onClose();
    }
  };

  const remove = (version: Version) => {
    if (window.confirm(`Excluir a versão "${version.name}"?`) && versions) {
      persist(versions.filter((item) => item.id !== version.id));
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
        aria-labelledby="versions-title"
      >
        <header>
          <h2 id="versions-title">Versões do projeto</h2>
          <button type="button" className="panel-button" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="versions-save">
          <label>
            Nome da versão
            <input
              ref={nameRef}
              type="text"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && saveCurrent()}
            />
          </label>
          <button
            type="button"
            className="panel-button"
            disabled={!versions}
            onClick={saveCurrent}
          >
            Salvar versão atual
          </button>
        </div>
        {error && (
          <p role="alert" className="versions-error">
            {error}
          </p>
        )}

        {versions === null ? (
          <p className="versions-empty">Carregando…</p>
        ) : versions.length === 0 ? (
          <p className="versions-empty">
            Nenhuma versão salva. Salve uma para poder voltar a este ponto
            depois.
          </p>
        ) : (
          <ul className="versions-list">
            {versions.map((version) => (
              <li key={version.id}>
                <div>
                  <strong>{version.name}</strong>
                  <span>
                    {new Date(version.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <button
                  type="button"
                  className="panel-button"
                  aria-label={`Restaurar ${version.name}`}
                  onClick={() => restore(version)}
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  className="panel-button panel-button--danger"
                  aria-label={`Excluir ${version.name}`}
                  onClick={() => remove(version)}
                >
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="versions-note">
          As versões ficam neste navegador (máx. {MAX_VERSIONS}). Para levar o
          projeto a outro computador, use Salvar projeto.
        </p>
      </div>
    </div>
  );
}
