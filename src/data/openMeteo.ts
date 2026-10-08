// Previsão e chuva recente de Cajamar pelo Open-Meteo (CC-BY; uso não comercial).

/** Centro de Cajamar/SP. */
export const CAJAMAR_COORDS = { latitude: -23.355, longitude: -46.877 };

export const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${CAJAMAR_COORDS.latitude}&longitude=${CAJAMAR_COORDS.longitude}` +
  "&hourly=precipitation&daily=precipitation_sum" +
  "&past_days=2&forecast_days=3&timezone=America%2FSao_Paulo";

export type HourlyRain = {
  /** Início da hora, em milissegundos (UTC). */
  time: number;
  /** Chuva da hora, em mm. */
  mm: number;
};

export type DailyRain = {
  /** "AAAA-MM-DD" no horário de Brasília. */
  date: string;
  mm: number;
};

export type RainData = {
  hourly: HourlyRain[];
  daily: DailyRain[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Valida a resposta do Open-Meteo; devolve null se vier fora do formato. */
export function parseRain(json: unknown): RainData | null {
  if (!isRecord(json) || !isRecord(json.hourly) || !isRecord(json.daily)) return null;
  const offsetSeconds = typeof json.utc_offset_seconds === "number" ? json.utc_offset_seconds : 0;
  const { time: hourTimes, precipitation } = json.hourly;
  const { time: dayTimes, precipitation_sum: daySums } = json.daily;
  if (
    !Array.isArray(hourTimes) ||
    !Array.isArray(precipitation) ||
    !Array.isArray(dayTimes) ||
    !Array.isArray(daySums)
  ) {
    return null;
  }

  const hourly: HourlyRain[] = [];
  hourTimes.forEach((text, index) => {
    const mm = precipitation[index];
    const match = typeof text === "string" ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text) : null;
    if (!match || typeof mm !== "number" || !Number.isFinite(mm)) return;
    const [, y, mo, d, h, mi] = match.map(Number);
    // O horário vem no fuso pedido; subtrai o deslocamento para obter UTC.
    hourly.push({ time: Date.UTC(y, mo - 1, d, h, mi) - offsetSeconds * 1000, mm });
  });

  const daily: DailyRain[] = [];
  dayTimes.forEach((date, index) => {
    const mm = daySums[index];
    if (typeof date === "string" && typeof mm === "number" && Number.isFinite(mm)) {
      daily.push({ date, mm });
    }
  });

  return hourly.length > 0 ? { hourly, daily } : null;
}

const HOUR = 3_600_000;

/** Soma da chuva das `hours` horas até agora (conta a hora corrente, ainda em andamento). */
export function pastRain(data: RainData, now: number, hours: number) {
  return sum(data.hourly.filter((h) => h.time > now - hours * HOUR && h.time <= now));
}

/** Soma da chuva prevista nas `hours` horas seguintes a `now`. */
export function nextRain(data: RainData, now: number, hours: number) {
  return sum(data.hourly.filter((h) => h.time > now && h.time <= now + hours * HOUR));
}

const sum = (items: HourlyRain[]) =>
  Math.round(items.reduce((total, item) => total + item.mm, 0) * 10) / 10;

/** Janela do gráfico: últimas 24 h e próximas 48 h. */
export function chartWindow(data: RainData, now: number) {
  return data.hourly.filter((h) => h.time + HOUR > now - 24 * HOUR && h.time <= now + 48 * HOUR);
}
