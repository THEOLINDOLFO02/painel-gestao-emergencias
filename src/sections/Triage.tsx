import Draggable from "../components/Draggable";
import EditableText from "../components/EditableText";
import ImagePlaceholder from "../components/ImagePlaceholder";
import PhaseLabel from "../components/PhaseLabel";

const levels = [
  {
    id: "small",
    tag: "NÍVEL 01",
    title: "PEQUENA PROPORÇÃO",
    subtitle: "Resposta local coordenada",
    items: [
      "Ocorrência pontual e área delimitada",
      "Equipe local de resposta mobilizada",
      "Recursos municipais suficientes",
      "Monitoramento preventivo mantido",
    ],
  },
  {
    id: "large",
    tag: "NÍVEL 02",
    title: "MAIOR PROPORÇÃO",
    subtitle: "Resposta ampliada e integrada",
    items: [
      "Múltiplos pontos e risco à população",
      "Reforço técnico especializado",
      "Mobilização integrada de recursos",
      "Escalonamento imediato do comando",
    ],
  },
];

export default function Triage() {
  return (
    <Draggable id="phase-2">
      <section className="phase-section triage-section">
        <PhaseLabel number="2" title="TRIAGEM E CLASSIFICAÇÃO" />
        <div className="triage-grid">
          {levels.map((level) => (
            <Draggable id={`triage-${level.id}-card`} key={level.id}>
              <article className={`triage-card triage-card--${level.id}`}>
                <div className="triage-heading">
                  <span className="severity-tag">{level.tag}</span>
                  <div>
                    <EditableText>{level.title}</EditableText>
                  </div>
                  <p>
                    <EditableText>{level.subtitle}</EditableText>
                  </p>
                </div>
                <div className="triage-content">
                  <ImagePlaceholder
                    id={`triage-${level.id}`}
                    label="Foto da ocorrência"
                  />
                  <ul>
                    {level.items.map((item) => (
                      <li key={item}>
                        <EditableText>{item}</EditableText>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Draggable>
          ))}
        </div>
      </section>
    </Draggable>
  );
}
