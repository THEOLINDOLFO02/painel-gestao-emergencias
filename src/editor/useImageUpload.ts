import { useEditor } from "./context";
import { pickFile } from "./project";
import { compressImage } from "./storage";

/** Abre o seletor de arquivos e coloca a foto escolhida no espaço `id`. */
export function useImageUpload(id: string) {
  const { editMode, setImage, setFrame } = useEditor();
  return () => {
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
}
