# Painel de Gestão de Emergências

Painel editável do protocolo integrado de resposta da Defesa Civil (React + Vite).

## Uso

- `npm install` — instala as dependências
- `npm run dev` — servidor de desenvolvimento
- `npm test` — testes automáticos
- `npm run build` — gera a pasta `dist/`

No painel, **Editar painel** libera textos, imagens, cores, fontes, formas e posições.
**Salvar projeto** baixa um `.json` com tudo; **Abrir projeto** o carrega de volta.
As edições ficam no navegador (localStorage e IndexedDB) e não são compartilhadas
entre pessoas ou computadores — para isso, use o arquivo `.json`.

## Publicar (site estático)

```bash
FIGMA_PUBLIC_URL=. npm run build
```

O build usa caminhos relativos, então a pasta `dist/` funciona em qualquer hospedagem
estática, inclusive em subpasta (GitHub Pages, Netlify, Vercel, servidor interno):
basta enviar o conteúdo de `dist/`. O site vem com `noindex` (não aparece em buscadores);
para mudar isso, edite `robots` em `.figma/make/site.json`.

## Impressão

O botão **PDF** usa a impressão do navegador, configurada para A3 paisagem em duas
páginas. Na janela de impressão, deixe as margens em "Padrão"/"Nenhuma" e ative
"Gráficos de plano de fundo".
