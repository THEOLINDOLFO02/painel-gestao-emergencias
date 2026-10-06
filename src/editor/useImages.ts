import { useEffect, useRef, useState } from "react";
import { idbGet, idbSet, loadStored, saveStored, STORAGE_KEYS } from "./storage";

type Images = Record<string, string>;

/**
 * Imagens do painel. Ficam no IndexedDB (sem o limite de ~5 MB do
 * localStorage) e são carregadas de forma assíncrona; imagens salvas pela
 * versão antiga, no localStorage, são migradas na primeira abertura.
 */
export function useImages(onLoaded: (images: Images) => void) {
  const [images, setImagesState] = useState<Images>({});
  const [ready, setReady] = useState(false);
  const loadedCallback = useRef(onLoaded);
  loadedCallback.current = onLoaded;
  // Se a pessoa mudar as imagens antes do carregamento terminar (por exemplo,
  // abrindo um projeto), o que ela fez vale mais do que o que estava salvo.
  const touched = useRef(false);

  const setImages: typeof setImagesState = (value) => {
    touched.current = true;
    setImagesState(value);
  };

  useEffect(() => {
    const legacy = loadStored<Images>(STORAGE_KEYS.images, {});
    idbGet<Images>(STORAGE_KEYS.images)
      .catch(() => undefined)
      .then((stored) => {
        if (!touched.current) {
          const loaded = stored && Object.keys(stored).length ? stored : legacy;
          loadedCallback.current(loaded);
          setImagesState(loaded);
        }
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    idbSet(STORAGE_KEYS.images, images)
      .then(() => window.localStorage.removeItem(STORAGE_KEYS.images))
      .catch(() => {
        // Sem IndexedDB: usa o localStorage, que tem limite menor.
        if (!saveStored(STORAGE_KEYS.images, images)) {
          window.alert(
            "Espaço de armazenamento cheio: as imagens não serão mantidas ao recarregar.",
          );
        }
      });
  }, [images, ready]);

  return [images, setImages] as const;
}
