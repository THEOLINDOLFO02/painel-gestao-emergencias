// Função do Vercel: busca as estações do CEMADEN e devolve só as da região pedida.
// Existe porque o servidor do CEMADEN não libera chamadas direto do navegador (CORS).
//
// Este arquivo é propositalmente autocontido (sem imports relativos): o projeto é
// ESM ("type": "module") e o Node exige extensão em imports relativos, o que
// derrubava a função no Vercel. A lista de municípios abaixo precisa ficar igual
// à de src/data/cemadenCore.ts (há um teste que confere).

// Tipos mínimos do que usamos do Vercel (evita depender de @vercel/node).
type Req = { url?: string; method?: string };
type Res = {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  end(): void;
};

export const SOURCE_URL =
  "https://resources.cemaden.gov.br/graficos/interativo/getJson2.php?uf=SP";

/** Cajamar e municípios vizinhos (códigos IBGE). */
export const DEFAULT_IBGE = [
  3509205, 3547304, 3509007, 3515004, 3516408, 3525904, 3539103, 3505708,
];

const TIMEOUT_MS = 15_000;
const MAX_CODES = 20;

/** Lê "?ibge=1,2,3" (códigos de 7 dígitos); inválido vira null. */
function parseIbge(value: string | null): number[] | null {
  if (!value) return DEFAULT_IBGE;
  const parts = value.split(",");
  if (parts.length > MAX_CODES || !parts.every((part) => /^\d{7}$/.test(part))) return null;
  return parts.map(Number);
}

function filterByIbge(raw: unknown, codes: number[]): unknown[] {
  if (!Array.isArray(raw)) return [];
  const wanted = new Set(codes);
  return raw.filter((item) => {
    const code = Number((item as { codibge?: unknown } | null)?.codibge);
    return Number.isFinite(code) && wanted.has(code);
  });
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method && req.method !== "GET") {
    res.status(405).json({ error: "Método não permitido" });
    return;
  }

  const query = new URL(req.url ?? "/", "http://localhost").searchParams;
  const codes = parseIbge(query.get("ibge"));
  if (!codes) {
    res.status(400).json({
      error: "Parâmetro ibge inválido (use códigos de 7 dígitos separados por vírgula)",
    });
    return;
  }

  try {
    const response = await fetch(SOURCE_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`CEMADEN respondeu ${response.status}`);
    const raw = await response.json();
    // Os dados mudam a cada ~10 minutos; guardar 5 minutos poupa o CEMADEN.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(filterByIbge(raw, codes));
  } catch {
    res.status(502).json({ error: "Não foi possível consultar o CEMADEN agora" });
  }
}
