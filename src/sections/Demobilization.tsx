import Draggable from "../components/Draggable";
import EditableText from "../components/EditableText";
import ImagePlaceholder from "../components/ImagePlaceholder";
import PhaseLabel from "../components/PhaseLabel";

const cards = [
  { code: "A", title: "ASSISTÊNCIA", copy: "Acolhimento e apoio social" },
  { code: "B", title: "SUPRIMENTOS", copy: "Organização de donativos" },
  { code: "C", title: "REAVALIAÇÃO", copy: "Vistoria das áreas afetadas" },
  { code: "D", title: "RELATÓRIO", copy: "Registro e encerramento" },
];

export default function Demobilization() {
  return (
    <Draggable id="phase-5">
      <section className="phase-section demobilization-section">
        <PhaseLabel number="5" title="DESMOBILIZAÇÃO" />
        <div className="demobilization-grid">
          {cards.map((card) => (
            <Draggable id={`demobilization-card-${card.code}`} key={card.code}>
              <article className="demobilization-card">
                <div className="mini-code">
                  <EditableText>{card.code}</EditableText>
                </div>
                <ImagePlaceholder
                  id={`demobilization-${card.code}`}
                  label="Inserir foto"
                  compact
                />
                <div className="mini-copy">
                  <strong>
                    <EditableText>{card.title}</EditableText>
                  </strong>
                  <p>
                    <EditableText>{card.copy}</EditableText>
                  </p>
                </div>
              </article>
            </Draggable>
          ))}
        </div>
      </section>
    </Draggable>
  );
}
