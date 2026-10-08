import Draggable from "../components/Draggable";
import EditableText from "../components/EditableText";
import ImagePlaceholder from "../components/ImagePlaceholder";
import LiveSlot, { type LiveKind } from "../components/live/LiveSlot";
import PhaseLabel from "../components/PhaseLabel";

const cards: {
  id: string;
  number: string;
  title: string;
  label: string;
  wide?: boolean;
  /** Mostra dados ao vivo quando não há foto. */
  live?: LiveKind;
}[] = [
  {
    id: "monitor-map",
    number: "01",
    title: "MAPA DE RISCO",
    label: "Mapa de monitoramento",
    wide: true,
  },
  {
    id: "monitor-radar",
    number: "02",
    title: "RADAR METEOROLÓGICO",
    label: "Mapa climático",
  },
  {
    id: "monitor-indicators",
    number: "03",
    title: "INDICADORES",
    label: "Gráfico de alertas",
    live: "stations",
  },
  {
    id: "monitor-rain",
    number: "04",
    title: "PRECIPITAÇÃO",
    label: "Gráfico climático",
    live: "rain",
  },
];

export default function Monitoring() {
  return (
    <Draggable id="phase-1">
      <section className="phase-section monitoring-section">
        <PhaseLabel number="1" title="MONITORAMENTO" />
        <div className="monitoring-grid">
          {cards.map((card) => (
            <Draggable id={`${card.id}-card`} key={card.id}>
              <div
                className={`monitor-card ${card.wide ? "monitor-card--wide" : ""}`}
              >
                <div className="card-kicker">
                  <span className="card-number">{card.number}</span>
                  <EditableText>{card.title}</EditableText>
                </div>
                {card.live ? (
                  <LiveSlot id={card.id} label={card.label} kind={card.live} />
                ) : (
                  <ImagePlaceholder id={card.id} label={card.label} />
                )}
              </div>
            </Draggable>
          ))}
        </div>
      </section>
    </Draggable>
  );
}
