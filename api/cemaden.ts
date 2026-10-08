// Função do Vercel: busca as estações do CEMADEN e devolve só as da região pedida.
// Existe porque o servidor do CEMADEN não libera chamadas direto do navegador (CORS).
import {
  CEMADEN_SOURCE_URL,
  filterRawByIbge,
  parseIbgeParam,
} from "../src/data/cemadenCore";

// Tipos mínimos do que usamos do Vercel (evita depender de @vercel/node).
type Req = { url?: string; method?: string };
type Res = {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  end(): void;
};

const TIMEOUT_MS = 15_000;

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
  const codes = parseIbgeParam(query.get("ibge"));
  if (!codes) {
    res.status(400).json({ error: "Parâmetro ibge inválido (use códigos de 7 dígitos separados por vírgula)" });
    return;
  }

  try {
    const response = await fetch(CEMADEN_SOURCE_URL, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`CEMADEN respondeu ${response.status}`);
    const raw = await response.json();
    // Os dados mudam a cada ~10 minutos; guardar 5 minutos poupa o CEMADEN.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(filterRawByIbge(raw, codes));
  } catch {
    res.status(502).json({ error: "Não foi possível consultar o CEMADEN agora" });
  }
}
