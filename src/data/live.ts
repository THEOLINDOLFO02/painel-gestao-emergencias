import { AREA_IBGE, CAJAMAR_IBGE, RAIN_STATION_TYPE, type Station } from "./cemadenCore";

export type LiveSettings = {
  /** Mostra dados ao vivo nos cartões Precipitação e Indicadores (quando não há foto). */
  enabled: boolean;
  /** Endereço do serviço que repassa os dados do CEMADEN. */
  cemadenUrl: string;
  /** Acumulado de 24 h a partir do qual o nível vira "Atenção" (mm). */
  attention24: number;
  /** Acumulado de 24 h a partir do qual o nível vira "Alerta" (mm). */
  alert24: number;
};

// As faixas são só um ponto de partida: ajuste ao protocolo da Defesa Civil.
export const DEFAULT_LIVE_SETTINGS: LiveSettings = {
  enabled: true,
  // No GitHub Pages não há função; defina VITE_CEMADEN_URL no build ou use o campo do painel.
  cemadenUrl: import.meta.env.VITE_CEMADEN_URL || "/api/cemaden",
  attention24: 30,
  alert24: 60,
};

/** Completa e corrige configurações salvas (campos ausentes, valores inválidos). */
export function sanitizeSettings(value: unknown): LiveSettings {
  const input = (typeof value === "object" && value !== null ? value : {}) as Partial<
    Record<keyof LiveSettings, unknown>
  >;
  const positive = (n: unknown, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) && n > 0 ? n : fallback;
  const attention24 = positive(input.attention24, DEFAULT_LIVE_SETTINGS.attention24);
  const alert24 = Math.max(positive(input.alert24, DEFAULT_LIVE_SETTINGS.alert24), attention24);
  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULT_LIVE_SETTINGS.enabled,
    cemadenUrl:
      typeof input.cemadenUrl === "string" && input.cemadenUrl.trim()
        ? input.cemadenUrl.trim()
        : DEFAULT_LIVE_SETTINGS.cemadenUrl,
    attention24,
    alert24,
  };
}

export type Level = "normal" | "attention" | "alert";

export const LEVEL_LABELS: Record<Level, string> = {
  normal: "Normal",
  attention: "Atenção",
  alert: "Alerta",
};

export function classify(mm24: number | null, settings: LiveSettings): Level {
  if (mm24 === null) return "normal";
  if (mm24 >= settings.alert24) return "alert";
  if (mm24 >= settings.attention24) return "attention";
  return "normal";
}

const HOUR = 3_600_000;
/** Estação sem leitura há mais que isso é tratada como parada. */
export const ACTIVE_WINDOW_MS = 6 * HOUR;

export function isActive(station: Station, now: number) {
  if (!station.lastTime) return false;
  const age = now - Date.parse(station.lastTime);
  return age >= -HOUR && age <= ACTIVE_WINDOW_MS;
}

export type StationSummary = {
  /** Pluviômetros da região com leitura recente. */
  active: Station[];
  /** Pluviômetros da região sem leitura recente. */
  inactive: Station[];
  /** Os que cabem no cartão: os de Cajamar primeiro, depois os maiores acumulados. */
  shown: Station[];
  /** Maior acumulado de 24 h entre as estações ativas. */
  peak: Station | null;
  /** Quantas estações de Cajamar existem na rede e quantas estão ativas. */
  cajamar: { total: number; active: number };
};

const h24 = (station: Station) => station.acc.h24 ?? -1;

export function summarizeStations(stations: Station[], now: number, limit = 6): StationSummary {
  const rain = stations.filter(
    (station) => station.type === RAIN_STATION_TYPE && station.ibge in AREA_IBGE,
  );
  const active = rain.filter((station) => isActive(station, now));
  const inactive = rain.filter((station) => !isActive(station, now));

  const byRain = (a: Station, b: Station) => h24(b) - h24(a) || a.name.localeCompare(b.name, "pt-BR");
  const home = active.filter((s) => s.ibge === CAJAMAR_IBGE).sort(byRain);
  const others = active.filter((s) => s.ibge !== CAJAMAR_IBGE).sort(byRain);

  const withData = active.filter((s) => s.acc.h24 !== null).sort(byRain);
  const cajamar = rain.filter((s) => s.ibge === CAJAMAR_IBGE);

  return {
    active,
    inactive,
    shown: [...home, ...others].slice(0, limit),
    peak: withData[0] ?? null,
    cajamar: { total: cajamar.length, active: cajamar.filter((s) => isActive(s, now)).length },
  };
}

/** "12,5" — milímetros no formato brasileiro; null vira traço. */
export function formatMm(value: number | null) {
  if (value === null) return "–";
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

/** Hora local de Brasília ("14:20") a partir de um instante ISO. */
export function formatClock(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

/** "07/10 14:20" no horário de Brasília. */
export function formatDateTime(iso: string | number | null) {
  if (iso === null) return "–";
  const date = new Date(iso);
  const day = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return `${day} ${formatClock(date.toISOString())}`;
}
