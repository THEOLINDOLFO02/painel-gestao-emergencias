import { describe, expect, it, vi } from "vitest";
import { cemadenResponse } from "../src/test/fixtures";
import handler from "./cemaden";

function call(url: string, method = "GET") {
  const headers: Record<string, string> = {};
  let statusCode = 0;
  let body: unknown;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    json(payload: unknown) {
      body = payload;
    },
    end() {},
  };
  return handler({ url, method }, res).then(() => ({ statusCode, headers, body }));
}

const upstream = (response: Response | Error) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      if (response instanceof Error) throw response;
      return response;
    }),
  );

const okJson = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "text/html" } });

describe("função /api/cemaden", () => {
  it("devolve só as estações dos municípios pedidos, com CORS e cache", async () => {
    upstream(okJson(cemadenResponse()));
    const { statusCode, headers, body } = await call("/api/cemaden?ibge=3509205");
    expect(statusCode).toBe(200);
    expect(headers["access-control-allow-origin"]).toBe("*");
    expect(headers["cache-control"]).toContain("s-maxage=300");
    expect((body as { cidade: string }[]).map((s) => s.cidade)).toEqual(["CAJAMAR", "CAJAMAR"]);
  });

  it("sem ibge, usa a região padrão (Cajamar e vizinhos, sem Campinas)", async () => {
    upstream(okJson(cemadenResponse()));
    const { body } = await call("/api/cemaden");
    const cities = new Set((body as { cidade: string }[]).map((s) => s.cidade));
    expect(cities.has("CAJAMAR")).toBe(true);
    expect(cities.has("CAMPINAS")).toBe(false);
  });

  it("recusa parâmetros inválidos sem consultar o CEMADEN", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { statusCode, body } = await call("/api/cemaden?ibge=abc");
    expect(statusCode).toBe(400);
    expect(body).toMatchObject({ error: expect.stringContaining("ibge") });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("responde 502 quando o CEMADEN falha ou devolve erro", async () => {
    upstream(new Error("timeout"));
    expect((await call("/api/cemaden")).statusCode).toBe(502);
    upstream(new Response("erro", { status: 500 }));
    const failed = await call("/api/cemaden");
    expect(failed.statusCode).toBe(502);
    expect(failed.headers["cache-control"]).toBeUndefined(); // erro não fica em cache
  });

  it("responde ao preflight e recusa outros métodos", async () => {
    expect((await call("/api/cemaden", "OPTIONS")).statusCode).toBe(204);
    expect((await call("/api/cemaden", "POST")).statusCode).toBe(405);
  });

  it("devolve lista vazia quando o CEMADEN manda algo que não é lista", async () => {
    upstream(okJson({ erro: true }));
    const { statusCode, body } = await call("/api/cemaden");
    expect(statusCode).toBe(200);
    expect(body).toEqual([]);
  });
});
