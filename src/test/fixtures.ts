// Dados de exemplo no formato das fontes reais. Sem dependência do Vitest,
// para servir também aos testes do Playwright.

export const HOUR = 3_600_000;

/** "2026-10-07T14:00" no horário de Brasília (UTC-3) para um instante em ms. */
const brasiliaHour = (time: number) => new Date(time - 3 * HOUR).toISOString().slice(0, 16);

/** Resposta do Open-Meteo montada em torno de `now`: 6 h de chuva passada e 4 h previstas. */
export function rainResponse(now = Date.now()) {
  const startOfHour = Math.floor(now / HOUR) * HOUR;
  const times: string[] = [];
  const precipitation: number[] = [];
  for (let h = -48; h <= 72; h++) {
    times.push(brasiliaHour(startOfHour + h * HOUR));
    precipitation.push(h >= -5 && h <= 0 ? 1 : h >= 1 && h <= 4 ? 2 : 0);
  }
  const today = new Date(now - 3 * HOUR);
  const days = [-2, -1, 0, 1, 2].map((offset) =>
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset))
      .toISOString()
      .slice(0, 10),
  );
  return {
    utc_offset_seconds: -10800,
    timezone: "America/Sao_Paulo",
    hourly: { time: times, precipitation },
    daily: { time: days, precipitation_sum: [4.2, 12.8, 5.2, 0.1, 0.4] },
  };
}

/** "07/10/26 16:20", em UTC, para um instante em ms. */
export function cemadenStamp(time: number) {
  const d = new Date(time);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

type RawOptions = {
  idestacao: number;
  codibge: number;
  cidade: string;
  nomeestacao: string;
  acc24hr: number | string;
  minutesAgo: number | null;
  tipoestacao?: number;
  now: number;
};

function raw(o: RawOptions) {
  const acc = o.acc24hr;
  return {
    idestacao: o.idestacao,
    uf: "SP",
    codibge: o.codibge,
    cidade: o.cidade,
    nomeestacao: o.nomeestacao,
    ultimovalor: 0,
    datahoraUltimovalor: o.minutesAgo === null ? "28/11/23 15:10" : cemadenStamp(o.now - o.minutesAgo * 60_000),
    acc1hr: "-",
    acc3hr: acc,
    acc6hr: acc,
    acc12hr: acc,
    acc24hr: acc,
    acc48hr: acc,
    acc72hr: typeof acc === "number" ? acc + 1 : acc,
    acc96hr: acc,
    tipoestacao: o.tipoestacao ?? 1,
    status: 0,
  };
}

/** Estações no formato bruto do CEMADEN, com uma de cada situação. */
export function cemadenResponse(now = Date.now()) {
  return [
    raw({ now, idestacao: 7027, codibge: 3509205, cidade: "CAJAMAR", nomeestacao: "Ponunduva", acc24hr: 2.4, minutesAgo: 20 }),
    raw({ now, idestacao: 7028, codibge: 3509205, cidade: "CAJAMAR", nomeestacao: "São Benedito", acc24hr: "-", minutesAgo: null }),
    raw({ now, idestacao: 7049, codibge: 3516408, cidade: "FRANCO DA ROCHA", nomeestacao: "Parque Paulista", acc24hr: 35, minutesAgo: 30 }),
    raw({ now, idestacao: 7067, codibge: 3525904, cidade: "JUNDIAÍ", nomeestacao: "Fazenda Grande", acc24hr: 64.5, minutesAgo: 25 }),
    // Hidrológica (tipo 3) e fora da região: não entram.
    raw({ now, idestacao: 6592, codibge: 3516408, cidade: "FRANCO DA ROCHA", nomeestacao: "Rio Jundiai", acc24hr: 99, minutesAgo: 10, tipoestacao: 3 }),
    raw({ now, idestacao: 1, codibge: 3509502, cidade: "CAMPINAS", nomeestacao: "Centro", acc24hr: 80, minutesAgo: 10 }),
  ];
}
