import {
  chartWindow,
  nextRain,
  type DailyRain,
  type RainData,
  pastRain,
} from "../../data/openMeteo";
import { formatClock, formatMm } from "../../data/live";
import { useLive } from "../../data/useLiveData";

const W = 260;
const H = 100;
const PAD_LEFT = 24;
const PAD_BOTTOM = 14;
const STALE_AFTER_MS = 30 * 60_000;

const HOUR = 3_600_000;

/** Teto do eixo: o menor valor "redondo" (2, 5, 10, 20, 50...) que cabe a chuva. */
export function axisMax(maxMm: number) {
  const steps = [2, 5, 10, 20, 30, 50, 80, 120];
  return steps.find((step) => maxMm <= step) ?? Math.ceil(maxMm / 10) * 10;
}

function dayLabel(day: DailyRain) {
  const date = new Date(`${day.date}T12:00:00-03:00`);
  return date
    .toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", timeZone: "America/Sao_Paulo" })
    .replace(".", "");
}

function todayKey(now: number) {
  return new Date(now - 3 * HOUR).toISOString().slice(0, 10);
}

function Chart({ data, now }: { data: RainData; now: number }) {
  const bars = chartWindow(data, now);
  const max = axisMax(Math.max(0, ...bars.map((b) => b.mm)));
  const plotW = W - PAD_LEFT;
  const plotH = H - PAD_BOTTOM;
  const barW = plotW / Math.max(bars.length, 1);
  const first = bars[0]?.time ?? now;
  const nowX = PAD_LEFT + ((now - first) / HOUR + 1) * barW;

  const past24 = pastRain(data, now, 24);
  const next24 = nextRain(data, now, 24);
  const label = `Chuva por hora em Cajamar: ${formatMm(past24)} mm nas últimas 24 horas e ${formatMm(next24)} mm previstos para as próximas 24 horas.`;

  return (
    <svg className="rain-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <line className="rain-axis" x1={PAD_LEFT} x2={W} y1={plotH} y2={plotH} />
      <text className="rain-tick" x={PAD_LEFT - 3} y={9} textAnchor="end">
        {max}
      </text>
      <text className="rain-tick" x={PAD_LEFT - 3} y={plotH} textAnchor="end">
        0
      </text>
      <text className="rain-tick" x={0} y={H - 1}>
        mm
      </text>
      {bars.map((bar, index) => {
        const height = (Math.min(bar.mm, max) / max) * (plotH - 10);
        return (
          <rect
            key={bar.time}
            className={bar.time + HOUR <= now ? "rain-bar rain-bar--past" : "rain-bar rain-bar--next"}
            x={PAD_LEFT + index * barW + 0.4}
            y={plotH - height}
            width={Math.max(barW - 0.8, 0.5)}
            height={height}
          />
        );
      })}
      <line className="rain-now" x1={nowX} x2={nowX} y1={2} y2={plotH} />
      <text className="rain-tick" x={nowX} y={H - 1} textAnchor="middle">
        agora
      </text>
    </svg>
  );
}

export default function RainCard() {
  const { rain, now, loading, refresh } = useLive();
  const data = rain.data;

  if (!data) {
    return (
      <div className="live-message" role="status">
        {rain.error ? (
          <>
            <strong>Previsão de chuva indisponível</strong>
            <span>Sem conexão com o serviço agora.</span>
            <button type="button" className="live-retry" onClick={refresh}>
              Tentar de novo
            </button>
          </>
        ) : (
          <span>{loading ? "Carregando chuva…" : "Aguardando dados de chuva…"}</span>
        )}
      </div>
    );
  }

  const stale = rain.error || (rain.fetchedAt !== null && now - rain.fetchedAt > STALE_AFTER_MS);
  const today = todayKey(now);

  return (
    <div className="live-card rain-card">
      <Chart data={data} now={now} />
      <div className="rain-legend" aria-hidden="true">
        <span className="rain-key rain-key--past">estimada</span>
        <span className="rain-key rain-key--next">prevista</span>
      </div>
      <p className="rain-summary">
        <span>
          24 h passadas <strong>{formatMm(pastRain(data, now, 24))} mm</strong>
        </span>
        <span>
          próx. 24 h <strong>{formatMm(nextRain(data, now, 24))} mm</strong>
        </span>
        <span>
          próx. 48 h <strong>{formatMm(nextRain(data, now, 48))} mm</strong>
        </span>
      </p>
      <ul className="rain-days" aria-label="Chuva por dia">
        {data.daily.map((day) => (
          <li key={day.date} className={day.date === today ? "rain-day rain-day--today" : "rain-day"}>
            <span>{dayLabel(day)}</span>
            <strong>{formatMm(day.mm)}</strong>
          </li>
        ))}
      </ul>
      <p className="live-source">
        Modelo: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo.com</a>
        {" · "}
        {rain.fetchedAt ? `atualizado ${formatClock(new Date(rain.fetchedAt).toISOString())}` : ""}
        {stale && <strong className="live-stale"> · desatualizado</strong>}
      </p>
    </div>
  );
}
