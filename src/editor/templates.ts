import type { Theme } from "../DesignTools";

// As chaves de `texts` são os textos originais do painel (ver EditableText).
export type Template = {
  id: string;
  name: string;
  description: string;
  texts: Record<string, string>;
  theme: Partial<Theme>;
};

const TITLE = "SISTEMA INTEGRADO DE GESTÃO DE EMERGÊNCIAS";

export const TEMPLATES: Template[] = [
  {
    id: "padrao",
    name: "Padrão",
    description: "Protocolo geral de resposta, com os textos e as cores originais.",
    texts: {},
    theme: {
      bg: "#070d14",
      accent: "#ff8a24",
      secondary: "#4bc7e8",
      text: "#eef4f8",
    },
  },
  {
    id: "alagamento",
    name: "Alagamento e enchente",
    description:
      "Monitoramento de chuva e nível de rios; resposta a alagamentos pontuais e enchentes.",
    texts: {
      [TITLE]: "GESTÃO DE EMERGÊNCIAS: ALAGAMENTOS E ENCHENTES",
      MONITORAMENTO: "MONITORAMENTO HIDROMETEOROLÓGICO",
      "MAPA DE RISCO": "PONTOS DE ALAGAMENTO",
      "RADAR METEOROLÓGICO": "RADAR DE CHUVA",
      INDICADORES: "NÍVEL DOS RIOS E CÓRREGOS",
      PRECIPITAÇÃO: "CHUVA ACUMULADA",
      "PEQUENA PROPORÇÃO": "ALAGAMENTO LOCALIZADO",
      "Resposta local coordenada": "Pontos isolados de acúmulo de água",
      "Ocorrência pontual e área delimitada": "Poucas vias afetadas, sem desabrigados",
      "Equipe local de resposta mobilizada": "Equipe local sinaliza e desvia o tráfego",
      "Recursos municipais suficientes": "Drenagem e limpeza de bueiros acionadas",
      "Monitoramento preventivo mantido": "Monitoramento do nível da água mantido",
      "MAIOR PROPORÇÃO": "ENCHENTE E INUNDAÇÃO",
      "Resposta ampliada e integrada": "Várias áreas atingidas e famílias desalojadas",
      "Múltiplos pontos e risco à população": "Famílias desalojadas e áreas isoladas",
      "Reforço técnico especializado": "Abrigos temporários ativados",
      "Mobilização integrada de recursos": "Apoio de bombeiros, SAMU e concessionárias",
      "Escalonamento imediato do comando": "Comando integrado e alerta à população",
      "Coordenação estratégica, consolidação de dados e tomada de decisão.":
        "Acompanhamento do nível dos rios, definição de alertas e acionamento de abrigos.",
      "RESGATE E SALVAMENTO": "RESGATE E EVACUAÇÃO",
      "Ações de busca, resgate, evacuação e atendimento emergencial às comunidades afetadas.":
        "Resgate de pessoas ilhadas, evacuação de áreas de risco e atendimento emergencial.",
      "CONTROLE DE RISCOS": "CONTROLE DA ÁGUA",
      "Isolamento de áreas críticas, contenção de danos e estabilização dos cenários de risco.":
        "Bloqueio de vias alagadas, drenagem de pontos críticos e proteção de estruturas essenciais.",
      "Restabelecimento prioritário de energia, vias, comunicações e serviços fundamentais.":
        "Restabelecimento de energia, vias e comunicações; água potável e abrigos.",
      "Acolhimento e apoio social": "Acolhimento de desalojados",
      "Organização de donativos": "Donativos, água potável e higiene",
      "Vistoria das áreas afetadas": "Vistoria de imóveis e limpeza das vias",
    },
    theme: {
      bg: "#06101a",
      accent: "#3aa0ff",
      secondary: "#6fe0c5",
      text: "#eef4f8",
    },
  },
  {
    id: "deslizamento",
    name: "Deslizamento de encosta",
    description:
      "Monitoramento de encostas e chuva; resposta a deslizamentos e movimentos de massa.",
    texts: {
      [TITLE]: "GESTÃO DE EMERGÊNCIAS: DESLIZAMENTOS DE ENCOSTA",
      MONITORAMENTO: "MONITORAMENTO GEOLÓGICO E METEOROLÓGICO",
      "MAPA DE RISCO": "ÁREAS DE ENCOSTA EM RISCO",
      "RADAR METEOROLÓGICO": "RADAR DE CHUVA",
      INDICADORES: "ALERTAS E OCORRÊNCIAS",
      PRECIPITAÇÃO: "CHUVA ACUMULADA (72 H)",
      "PEQUENA PROPORÇÃO": "DESLIZAMENTO PONTUAL",
      "Resposta local coordenada": "Movimentação localizada de solo",
      "Ocorrência pontual e área delimitada": "Ocorrência isolada, sem vítimas",
      "Equipe local de resposta mobilizada": "Isolamento da área e vistoria técnica",
      "Recursos municipais suficientes": "Moradias próximas sob observação",
      "Monitoramento preventivo mantido": "Monitoramento de trincas e de chuva mantido",
      "MAIOR PROPORÇÃO": "DESLIZAMENTO DE GRANDE PORTE",
      "Resposta ampliada e integrada": "Risco iminente a várias moradias",
      "Múltiplos pontos e risco à população": "Várias moradias atingidas ou ameaçadas",
      "Reforço técnico especializado": "Evacuação preventiva das encostas",
      "Mobilização integrada de recursos": "Apoio de bombeiros, SAMU e engenharia",
      "Escalonamento imediato do comando": "Comando integrado e alerta à população",
      "Coordenação estratégica, consolidação de dados e tomada de decisão.":
        "Avaliação geotécnica, definição de áreas de evacuação e tomada de decisão.",
      "Ações de busca, resgate, evacuação e atendimento emergencial às comunidades afetadas.":
        "Busca e resgate de soterrados, evacuação de encostas e atendimento emergencial.",
      "Isolamento de áreas críticas, contenção de danos e estabilização dos cenários de risco.":
        "Interdição de áreas, contenção provisória de encostas e vistoria técnica.",
      "Acolhimento e apoio social": "Acolhimento das famílias removidas",
      REAVALIAÇÃO: "LAUDOS TÉCNICOS",
      "Vistoria das áreas afetadas": "Laudos e interdição definitiva",
    },
    theme: {
      bg: "#0e0b08",
      accent: "#e8873a",
      secondary: "#d6c26a",
      text: "#f3eee8",
    },
  },
];
