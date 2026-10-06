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
blocos do painel). Blocos: trazer para a frente/enviar para trás. Fotos: **transparência**.
As edições ficam no navegador (localStorage e IndexedDB) e não são compartilhadas
entre pessoas ou computadores — para isso, use o arquivo `.json`.

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
