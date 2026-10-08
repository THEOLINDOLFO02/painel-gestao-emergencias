import { vi } from "vitest";
import { cemadenResponse, rainResponse } from "./fixtures";

type Route = "rain" | "stations";
type Responder = () => Response | Promise<Response>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/**
 * Troca o fetch por um falso que responde as duas fontes. Cada rota pode ser
 * trocada por um erro, uma resposta atrasada, etc.
 */
export function mockLiveFetch(overrides: Partial<Record<Route, Responder>> = {}, now = Date.now()) {
  const defaults: Record<Route, Responder> = {
    rain: () => json(rainResponse(now)),
    stations: () => json(cemadenResponse(now)),
  };
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith("https://api.open-meteo.com")) return (overrides.rain ?? defaults.rain)();
    if (url.includes("/api/cemaden")) return (overrides.stations ?? defaults.stations)();
    throw new Error(`URL inesperada nos testes: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, calls };
}

export const failing = (): Response => {
  throw new Error("falha de rede");
};

export { cemadenResponse, json, rainResponse };
