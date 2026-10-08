import { AREA_IBGE } from "../../data/cemadenCore";
import {
  classify,
  formatClock,
  formatMm,
  LEVEL_LABELS,
  summarizeStations,
  type Level,
} from "../../data/live";
import { useLive } from "../../data/useLiveData";

const STALE_AFTER_MS = 30 * 60_000;
const LEVEL_MARK: Record<Level, string> = { normal: "●", attention: "▲", alert: "◆" };

function LevelBadge({ level }: { level: Level }) {
  return (
    <span className={`level level--${level}`}>
      <span aria-hidden="true">{LEVEL_MARK[level]}</span> {LEVEL_LABELS[level]}
    </span>
  );
}

export default function StationsCard() {
  const { stations, settings, now, loading, refresh } = useLive();

  if (!stations.data) {
    return (
      <div className="live-message" role="status">
        {stations.error ? (
          <>
            <strong>Estações do CEMADEN indisponíveis</strong>
            <span>Sem conexão com o serviço agora.</span>
            <button type="button" className="live-retry" onClick={refresh}>
              Tentar de novo
            </button>
          </>
        ) : (
          <span>{loading ? "Carregando estações…" : "Aguardando estações…"}</span>
        )}
      </div>
    );
  }

  const summary = summarizeStations(stations.data, now, 5);
  const peakLevel = classify(summary.peak?.acc.h24 ?? null, settings);
  const latest = summary.active
    .map((s) => s.lastTime)
    .filter((t): t is string => t !== null)
    .sort()
    .pop();
  const stale =
    stations.error || (stations.fetchedAt !== null && now - stations.fetchedAt > STALE_AFTER_MS);

  return (
    <div className="live-card stations-card">
      <div className="stations-head">
        <div>
          <span className="stations-kicker">Maior acumulado em 24 h</span>
          <strong className="stations-peak">
            {summary.peak ? `${formatMm(summary.peak.acc.h24)} mm` : "sem chuva registrada"}
          </strong>
          {summary.peak && (
            <span className="stations-where">
              {summary.peak.name} · {AREA_IBGE[summary.peak.ibge]}
            </span>
          )}
        </div>
        <LevelBadge level={peakLevel} />
      </div>

      <table className="stations-table">
        <caption className="visually-hidden">Pluviômetros do CEMADEN em Cajamar e municípios vizinhos</caption>
        <thead>
          <tr>
            <th scope="col">Estação</th>
            <th scope="col">24 h</th>
            <th scope="col">72 h</th>
            <th scope="col">Nível</th>
          </tr>
        </thead>
        <tbody>
          {summary.shown.map((station) => (
            <tr key={station.id}>
              <th scope="row">
                {station.name}
                <small>{AREA_IBGE[station.ibge] ?? station.city}</small>
              </th>
              <td>{formatMm(station.acc.h24)}</td>
              <td>{formatMm(station.acc.h72)}</td>
              <td>
                <LevelBadge level={classify(station.acc.h24, settings)} />
              </td>
            </tr>
          ))}
          {summary.shown.length === 0 && (
            <tr>
              <td colSpan={4}>Nenhuma estação com leitura recente.</td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="stations-foot">
        Cajamar: {summary.cajamar.active} de {summary.cajamar.total} pluviômetros ativos
        {" · "}
        {summary.active.length} ativos e {summary.inactive.length} sem leitura recente na região
      </p>
      <p className="live-source">
        Fonte: CEMADEN/MCTI · leitura mais recente {formatClock(latest ?? null)}
        {stale && <strong className="live-stale"> · desatualizado</strong>}
      </p>
    </div>
  );
}
