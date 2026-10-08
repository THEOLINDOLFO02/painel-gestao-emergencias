// Lógica do CEMADEN usada pela tela. (A função do Vercel, em api/cemaden.ts, é
// autocontida de propósito; um teste confere que as duas listas de municípios batem.)

/** Endereço do JSON usado pelo mapa interativo do CEMADEN (não é uma API documentada). */
export const CEMADEN_SOURCE_URL =
  "https://resources.cemaden.gov.br/graficos/interativo/getJson2.php?uf=SP";

/** Códigos IBGE: Cajamar e municípios vizinhos acompanhados por padrão. */
export const CAJAMAR_IBGE = 3509205;
export const AREA_IBGE: Record<number, string> = {
  3509205: "Cajamar",
  3547304: "Santana de Parnaíba",
  3509007: "Caieiras",
  3515004: "Francisco Morato",
  3516408: "Franco da Rocha",
  3525904: "Jundiaí",
  3539103: "Pirapora do Bom Jesus",
  3505708: "Barueri",
};

/** Tipos de estação do CEMADEN que interessam: 1 = pluviômetro. */
export const RAIN_STATION_TYPE = 1;

export type Accumulated = {
  h1: number | null;
  h3: number | null;
  h6: number | null;
  h12: number | null;
  h24: number | null;
  h48: number | null;
  h72: number | null;
  h96: number | null;
};

export type Station = {
  id: number;
  name: string;
  city: string;
  ibge: number;
  type: number;
  /** Última leitura (mm no intervalo), se houver. */
  lastValue: number | null;
  /** Instante da última leitura, em ISO (UTC), se houver. */
  lastTime: string | null;
  acc: Accumulated;
};

/** "0,2", 0.2 e "-" viram número ou null. */
export function parseNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim().replace(",", ".");
  if (text === "" || text === "-") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** "07/10/26 16:20" (UTC, como o CEMADEN registra) vira ISO; texto inválido vira null. */
export function parseCemadenDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year, hour, minute] = match.map(Number);
  const time = Date.UTC(2000 + year, month - 1, day, hour, minute);
  const date = new Date(time);
  // Rejeita datas impossíveis (ex.: 31/02), que o Date "corrigiria" em silêncio.
  if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) return null;
  return date.toISOString();
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Converte o JSON bruto do CEMADEN, ignorando registros malformados. */
export function normalizeStations(raw: unknown): Station[] {
  if (!Array.isArray(raw)) return [];
  const stations: Station[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = parseNumber(item.idestacao);
    const ibge = parseNumber(item.codibge);
    if (id === null || ibge === null) continue;
    stations.push({
      id,
      ibge,
      name: typeof item.nomeestacao === "string" ? item.nomeestacao.trim() : `Estação ${id}`,
      city: typeof item.cidade === "string" ? item.cidade.trim() : "",
      type: parseNumber(item.tipoestacao) ?? 0,
      lastValue: parseNumber(item.ultimovalor),
      lastTime: parseCemadenDate(item.datahoraUltimovalor),
      acc: {
        h1: parseNumber(item.acc1hr),
        h3: parseNumber(item.acc3hr),
        h6: parseNumber(item.acc6hr),
        h12: parseNumber(item.acc12hr),
        h24: parseNumber(item.acc24hr),
        h48: parseNumber(item.acc48hr),
        h72: parseNumber(item.acc72hr),
        h96: parseNumber(item.acc96hr),
      },
    });
  }
  return stations;
}
