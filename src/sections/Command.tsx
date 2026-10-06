import Draggable from "../components/Draggable";
import EditableText from "../components/EditableText";
import ImagePlaceholder from "../components/ImagePlaceholder";
import PhaseLabel from "../components/PhaseLabel";

export default function Command() {
  return (
    <Draggable id="phase-3">
      <section className="phase-section command-section">
        <PhaseLabel number="3" title="COMANDO" />
        <Draggable id="command-card">
          <div className="command-card">
            <div className="command-copy">
              <span className="command-index">PC</span>
              <div>
                <strong>
                  <EditableText>POSTO DE COMANDO INTEGRADO</EditableText>
                </strong>
                <p>
                  <EditableText>
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
            />
            <div className="command-meta">
              <span>SITUAÇÃO</span>
              <strong>
                <EditableText>EM OPERAÇÃO</EditableText>
              </strong>
            </div>
          </div>
        </Draggable>
      </section>
    </Draggable>
  );
}
