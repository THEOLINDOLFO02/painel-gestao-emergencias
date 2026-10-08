import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { loadStored, saveStored } from "../editor/storage";
import { AREA_IBGE, normalizeStations, type Station } from "./cemadenCore";
import { DEFAULT_LIVE_SETTINGS, type LiveSettings } from "./live";
import { OPEN_METEO_URL, parseRain, type RainData } from "./openMeteo";

const CACHE_KEY = "defesa-civil-live-cache";
const REFRESH_MS = 10 * 60_000;
const CLOCK_MS = 60_000;
const TIMEOUT_MS = 20_000;

export type Source<T> = {
  data: T | null;
  /** Quando os dados foram obtidos (ms). */
  fetchedAt: number | null;
  /** A última tentativa falhou (os dados, se houver, são de antes). */
  error: boolean;
};

export type LiveState = {
  rain: Source<RainData>;
  stations: Source<Station[]>;
  /** Relógio do painel, atualizado a cada minuto. */
  now: number;
  loading: boolean;
};

export type Live = LiveState & {
  settings: LiveSettings;
  refresh: () => void;
};

const empty = <T,>(): Source<T> => ({ data: null, fetchedAt: null, error: false });

export const LiveContext = createContext<Live>({
  rain: empty(),
  stations: empty(),
  now: 0,
  loading: false,
  settings: { ...DEFAULT_LIVE_SETTINGS, enabled: false },
  refresh: () => {},
});

export const useLive = () => useContext(LiveContext);

export function stationsUrl(base: string) {
  const url = new URL(base, window.location.href);
  url.searchParams.set("ibge", Object.keys(AREA_IBGE).join(","));
  return url.toString();
}

async function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

type Cache = { rain?: Source<RainData>; stations?: Source<Station[]> };

/**
 * Busca chuva (Open-Meteo) e estações (CEMADEN) enquanto estiver habilitado,
 * atualiza a cada 10 minutos e guarda a última resposta boa para mostrar
 * "desatualizado" quando a internet cair.
 */
export function useLiveData(settings: LiveSettings): Live {
  const [state, setState] = useState<LiveState>(() => {
    const cache = loadStored<Cache>(CACHE_KEY, {});
    return {
      rain: cache.rain ?? empty(),
      stations: cache.stations ?? empty(),
      now: Date.now(),
      loading: false,
    };
  });
  const abort = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    if (!settings.enabled) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState((s) => ({ ...s, loading: true }));

    const rain = getJson(OPEN_METEO_URL, controller.signal).then(parseRain);
    const stations = getJson(stationsUrl(settings.cemadenUrl), controller.signal).then(normalizeStations);

    Promise.allSettled([rain, stations]).then(([rainResult, stationResult]) => {
      if (controller.signal.aborted) return;
      const at = Date.now();
      setState((s) => {
        const next: LiveState = {
          ...s,
          now: at,
          loading: false,
          rain:
            rainResult.status === "fulfilled" && rainResult.value
              ? { data: rainResult.value, fetchedAt: at, error: false }
              : { ...s.rain, error: true },
          stations:
            stationResult.status === "fulfilled" && stationResult.value.length > 0
              ? { data: stationResult.value, fetchedAt: at, error: false }
              : { ...s.stations, error: true },
        };
        return next;
      });
    });
  }, [settings.enabled, settings.cemadenUrl]);

  // Guarda a última resposta para mostrar mesmo sem internet.
  useEffect(() => {
    saveStored(CACHE_KEY, { rain: state.rain, stations: state.stations });
  }, [state.rain, state.stations]);

  useEffect(() => {
    if (!settings.enabled) return;
    refresh();
    const refreshTimer = window.setInterval(refresh, REFRESH_MS);
    return () => {
      window.clearInterval(refreshTimer);
      abort.current?.abort();
    };
  }, [settings.enabled, refresh]);

  useEffect(() => {
    const clock = window.setInterval(() => setState((s) => ({ ...s, now: Date.now() })), CLOCK_MS);
    return () => window.clearInterval(clock);
  }, []);

  return { ...state, settings, refresh };
}
