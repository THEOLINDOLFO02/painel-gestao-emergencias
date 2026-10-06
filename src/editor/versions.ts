import type { ProjectData } from "./project";
import { idbGet, idbSet } from "./storage";

export type Version = {
  id: string;
  name: string;
  createdAt: number;
  data: ProjectData;
};

export const MAX_VERSIONS = 20;
const VERSIONS_KEY = "versions";

export async function loadVersions(): Promise<Version[]> {
  try {
    const stored = await idbGet<Version[]>(VERSIONS_KEY);
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function saveVersions(versions: Version[]): Promise<void> {
  return idbSet(VERSIONS_KEY, versions);
}

export const defaultVersionName = (date = new Date()) =>
  `Versão ${date.toLocaleDateString("pt-BR")} ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
