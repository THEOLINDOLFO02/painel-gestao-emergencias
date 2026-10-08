import { describe, expect, it } from "vitest";
import { cemadenResponse, rainResponse } from "../test/fixtures";
import { normalizeStations, parseCemadenDate, parseNumber } from "./cemadenCore";
import {
  classify,
  DEFAULT_LIVE_SETTINGS,
  formatMm,
  isActive,
  sanitizeSettings,
  summarizeStations,
} from "./live";
import { chartWindow, nextRain, parseRain, pastRain } from "./openMeteo";

const NOW = Date.UTC(2026, 9, 7, 17, 0); // 07/10/2026 14:00 em Brasília

describe("CEMADEN: leitura dos valores", () => {
  it("converte números do jeito que o CEMADEN envia", () => {
    expect(parseNumber(0.2)).toBe(0.2);
    expect(parseNumber("0,2")).toBe(0.2);
    expect(parseNumber(" 12.5 ")).toBe(12.5);
    expect(parseNumber("-")).toBeNull();
    expect(parseNumber("")).toBeNull();
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(NaN)).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });

  it("lê a data como UTC e rejeita datas impossíveis", () => {
    expect(parseCemadenDate("07/10/26 16:20")).toBe("2026-10-07T16:20:00.000Z");
    expect(parseCemadenDate("31/02/26 10:00")).toBeNull();
    expect(parseCemadenDate("2026-10-07")).toBeNull();
    expect(parseCemadenDate(undefined)).toBeNull();
  });

  it("normaliza estações e ignora registros malformados", () => {
    const stations = normalizeStations([
      ...cemadenResponse(NOW),
      null,
      "texto",
      { idestacao: 5 }, // sem código IBGE
    ]);
    expect(stations).toHaveLength(6);
    const ponunduva = stations.find((s) => s.name === "Ponunduva")!;
    expect(ponunduva).toMatchObject({ id: 7027, ibge: 3509205, type: 1 });
    expect(ponunduva.acc.h24).toBe(2.4);
    expect(ponunduva.acc.h1).toBeNull(); // "-" vira null
    expect(normalizeStations({ não: "é lista" })).toEqual([]);
  });
});

describe("Open-Meteo: chuva", () => {
  const data = parseRain(rainResponse(NOW))!;

  it("lê a resposta e converte as horas de Brasília para UTC", () => {
    expect(data).not.toBeNull();
    expect(data.daily).toHaveLength(5);
    // A hora cheia de 14:00 em Brasília é 17:00 UTC.
    const hour = data.hourly.find((h) => h.time === NOW);
    expect(hour?.mm).toBe(1);
  });

  it("devolve null quando a resposta vem fora do formato", () => {
    expect(parseRain(null)).toBeNull();
    expect(parseRain({ hourly: {}, daily: {} })).toBeNull();
    expect(parseRain({ hourly: { time: [], precipitation: [] }, daily: { time: [], precipitation_sum: [] } })).toBeNull();
  });

  it("soma a chuva passada e a prevista", () => {
    // Fixture: 1 mm nas 6 horas até agora; 2 mm nas 4 horas seguintes.
    expect(pastRain(data, NOW, 24)).toBe(6);
    expect(nextRain(data, NOW, 24)).toBe(8);
    expect(nextRain(data, NOW, 48)).toBe(8);
    expect(pastRain(data, NOW, 3)).toBe(3);
  });

  it("recorta a janela do gráfico em 24 h para trás e 48 h para frente", () => {
    const bars = chartWindow(data, NOW);
    expect(bars.length).toBeGreaterThanOrEqual(72);
    expect(bars.length).toBeLessThanOrEqual(73);
    expect(bars[0].time).toBeGreaterThanOrEqual(NOW - 24 * 3_600_000);
    expect(bars[bars.length - 1].time).toBeLessThanOrEqual(NOW + 48 * 3_600_000);
  });
});

describe("níveis e resumo das estações", () => {
  const settings = DEFAULT_LIVE_SETTINGS;

  it("classifica pelo acumulado de 24 h", () => {
    expect(classify(null, settings)).toBe("normal");
    expect(classify(29.9, settings)).toBe("normal");
    expect(classify(30, settings)).toBe("attention");
    expect(classify(59.9, settings)).toBe("attention");
    expect(classify(60, settings)).toBe("alert");
  });

  it("corrige configurações inválidas", () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_LIVE_SETTINGS);
    expect(sanitizeSettings({ attention24: -5, alert24: "x", cemadenUrl: "  " })).toEqual(
      DEFAULT_LIVE_SETTINGS,
    );
    // O alerta nunca fica abaixo da atenção.
    expect(sanitizeSettings({ attention24: 50, alert24: 20 }).alert24).toBe(50);
    expect(sanitizeSettings({ enabled: false }).enabled).toBe(false);
  });

  it("considera ativa só a estação com leitura nas últimas 6 horas", () => {
    const stations = normalizeStations(cemadenResponse(NOW));
    const byName = (name: string) => stations.find((s) => s.name === name)!;
    expect(isActive(byName("Ponunduva"), NOW)).toBe(true);
    expect(isActive(byName("São Benedito"), NOW)).toBe(false);
    expect(isActive(byName("Ponunduva"), NOW + 7 * 3_600_000)).toBe(false);
  });

  it("resume só pluviômetros da região, com Cajamar primeiro", () => {
    const summary = summarizeStations(normalizeStations(cemadenResponse(NOW)), NOW);
    // Entram: Ponunduva, São Benedito, Parque Paulista, Fazenda Grande.
    // Ficam de fora: tipo 3 (hidrológica) e Campinas.
    expect(summary.active.map((s) => s.name).sort()).toEqual([
      "Fazenda Grande",
      "Parque Paulista",
      "Ponunduva",
    ]);
    expect(summary.inactive.map((s) => s.name)).toEqual(["São Benedito"]);
    expect(summary.shown.map((s) => s.name)).toEqual(["Ponunduva", "Fazenda Grande", "Parque Paulista"]);
    expect(summary.peak?.name).toBe("Fazenda Grande");
    expect(summary.cajamar).toEqual({ total: 2, active: 1 });
  });

  it("respeita o limite de linhas e não quebra sem estações", () => {
    const summary = summarizeStations(normalizeStations(cemadenResponse(NOW)), NOW, 2);
    expect(summary.shown).toHaveLength(2);
    const empty = summarizeStations([], NOW);
    expect(empty).toMatchObject({ shown: [], peak: null, cajamar: { total: 0, active: 0 } });
  });

  it("formata milímetros no padrão brasileiro", () => {
    expect(formatMm(null)).toBe("–");
    expect(formatMm(0)).toBe("0");
    expect(formatMm(12.46)).toBe("12,5");
    expect(formatMm(64)).toBe("64");
  });
});
