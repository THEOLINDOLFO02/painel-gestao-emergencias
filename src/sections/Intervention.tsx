import Draggable from "../components/Draggable";
import EditableText from "../components/EditableText";
import ImagePlaceholder from "../components/ImagePlaceholder";
import PhaseLabel from "../components/PhaseLabel";

const cards = [
  {
    code: "01",
    title: "RESGATE E SALVAMENTO",
    copy: "Ações de busca, resgate, evacuação e atendimento emergencial às comunidades afetadas.",
  },
  {
    code: "02",
    title: "CONTROLE DE RISCOS",
    copy: "Isolamento de áreas críticas, contenção de danos e estabilização dos cenários de risco.",
  },
  {
    code: "03",
    title: "SUPORTE ESSENCIAL",
    copy: "Restabelecimento prioritário de energia, vias, comunicações e serviços fundamentais.",
  },
];

export default function Intervention() {
  return (
    <Draggable id="phase-4">
      <section className="phase-section intervention-section">
        <PhaseLabel number="4" title="INTERVENÇÃO" />
        <div className="intervention-grid">
          {cards.map((card) => (
            <Draggable id={`intervention-card-${card.code}`} key={card.code}>
              <article className="intervention-card">
                <div className="intervention-heading">
                  <span>{card.code}</span>
                  <strong>
                    <EditableText>{card.title}</EditableText>
                  </strong>
                </div>
                <ImagePlaceholder
                  id={`intervention-${card.code}`}
                  label={`Foto — ${card.title}`}
                />
                <p>
                  <EditableText>{card.copy}</EditableText>
                </p>
              </article>
            </Draggable>
          ))}
        </div>
      </section>
    </Draggable>
  );
}
