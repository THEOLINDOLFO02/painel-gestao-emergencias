/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Endereço do serviço que repassa os dados do CEMADEN (padrão: /api/cemaden). */
  readonly VITE_CEMADEN_URL?: string;
}
