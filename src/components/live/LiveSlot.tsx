import { useEditor } from "../../editor/context";
import { useImageUpload } from "../../editor/useImageUpload";
import { useLive } from "../../data/useLiveData";
import ImagePlaceholder from "../ImagePlaceholder";
import RainCard from "./RainCard";
import StationsCard from "./StationsCard";

export type LiveKind = "rain" | "stations";

/**
 * Espaço de um cartão de monitoramento. Prioridade: foto inserida, depois dados
 * ao vivo (se ligados) e, por fim, o espaço reservado para foto.
 */
export default function LiveSlot({
  id,
  label,
  kind,
}: {
  id: string;
  label: string;
  kind: LiveKind;
}) {
  const { images, editMode } = useEditor();
  const { settings } = useLive();
  const upload = useImageUpload(id);

  if (images[id] || !settings.enabled) {
    return <ImagePlaceholder id={id} label={label} />;
  }

  return (
    <div className="live-slot" data-live={kind}>
      {kind === "rain" ? <RainCard /> : <StationsCard />}
      {editMode && (
        <button type="button" className="live-photo-button" onClick={upload}>
          USAR FOTO NO LUGAR
        </button>
      )}
    </div>
  );
}
