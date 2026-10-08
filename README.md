# Painel de Gestão de Emergências

Painel editável do protocolo integrado de resposta da Defesa Civil (React + Vite).

## Uso

- `pnpm install` — instala as dependências
- `pnpm dev` — servidor de desenvolvimento
- `pnpm test` — testes automáticos (componentes, rápidos)
- `pnpm e2e` — testes no navegador real (Playwright): arrastar, exportar, impressão, celular e acessibilidade; usa o Chrome instalado
- `pnpm build` — gera a pasta `dist/`

No painel, **Editar painel** libera textos, imagens, cores, fontes, formas e posições.
**Salvar projeto** baixa um `.json` com tudo; **Abrir projeto** o carrega de volta.
Outros recursos: **Modelos** (Alagamento, Deslizamento, Padrão), **Versões** nomeadas do
projeto, redimensionar blocos (quadrado ciano no canto do bloco selecionado), **Enquadrar**
fotos (zoom e posição) e aviso de contraste ao escolher cores.
Formas: girar (alça acima da forma, controle de rotação ou teclas `[` e `]`), editar
posição e tamanho por números, **camadas** (subir/descer, esconder, bloquear, pôr atrás dos
blocos do painel). Blocos: trazer para a frente/enviar para trás. Fotos (botão **AJUSTAR**):
zoom, posição, **transparência**, **girar 90°**, **espelhar/inverter** e copiar os ajustes para
outra foto ou para todas.
As edições ficam no navegador (localStorage e IndexedDB) e não são compartilhadas
entre pessoas ou computadores — para isso, use o arquivo `.json`.

## Dados ao vivo (Precipitação e Indicadores)

Os cartões **Precipitação** e **Indicadores** mostram dados reais quando não há foto neles
(a foto sempre tem prioridade; em edição, **USAR FOTO NO LUGAR** troca os dados por uma foto).

- **Precipitação:** chuva por hora (últimas 24 h estimadas e próximas 48 h previstas) e total
  por dia, pelo [Open-Meteo](https://open-meteo.com/) (CC-BY, **uso não comercial**; confirme
  se o uso pela prefeitura se enquadra ou contrate o plano pago).
- **Indicadores:** pluviômetros do CEMADEN em Cajamar e municípios vizinhos, com acumulados de
  24 h e 72 h e nível (Normal/Atenção/Alerta). As faixas de alerta são **valores de exemplo**:
  ajuste em *Dados ao vivo* conforme o protocolo da Defesa Civil.
- Atualiza a cada 10 minutos; sem internet, mostra a última resposta marcada como
  "desatualizado". Dá para desligar em *Dados ao vivo* (cada pessoa, no próprio navegador).

**Serviço do CEMADEN.** O JSON do CEMADEN (o mesmo do mapa interativo, **não é uma API
documentada** e pode mudar) não aceita chamadas direto do navegador. Por isso existe
`api/cemaden.ts`, uma função do Vercel que busca, filtra e guarda em cache por 5 minutos.

- No **Vercel**, o site e a função ficam juntos e nada precisa ser configurado.
- Em **desenvolvimento** (`pnpm dev`), o Vite repassa `/api/cemaden` direto ao CEMADEN.
- No **GitHub Pages** não há função: defina a variável de repositório `CEMADEN_URL`
  (Settings > Secrets and variables > Actions > Variables) com o endereço publicado no Vercel,
  por exemplo `https://SEU-PROJETO.vercel.app/api/cemaden`, ou preencha o campo *Serviço CEMADEN*
  em *Dados ao vivo*. Sem isso, o cartão mostra "Estações do CEMADEN indisponíveis".

Os testes nunca usam a internet: as duas fontes são simuladas (`src/test/fixtures.ts`).

## Publicar (site estático)

```bash
FIGMA_PUBLIC_URL=. pnpm build
```

O build usa caminhos relativos, então a pasta `dist/` funciona em qualquer hospedagem
estática, inclusive em subpasta (GitHub Pages, Netlify, Vercel, servidor interno):
basta enviar o conteúdo de `dist/`. O site vem com `noindex` (não aparece em buscadores);
para mudar isso, edite `robots` em `.figma/make/site.json`.

## Impressão

O botão **PDF** usa a impressão do navegador, configurada para A3 paisagem em duas
páginas. Na janela de impressão, deixe as margens em "Padrão"/"Nenhuma" e ative
"Gráficos de plano de fundo".
