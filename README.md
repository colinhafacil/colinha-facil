# Colinha Fácil — Eleições 2026

PWA/mobile web app para organizar uma anotação pessoal de números de candidatos na ordem oficial de votação.

## Fonte dos dados
Os dados de candidaturas e fotos são importados no build a partir do Portal de Dados Abertos do TSE, conjunto **Candidatos - 2026**: https://dadosabertos.tse.jus.br/dataset/candidatos-2026

O aplicativo é independente do TSE e não indica candidatos.

## Build

```bash
npm install
npm run build
npm run dev
```

O build executa `scripts/import-tse.mjs` antes do Vite. O importador grava os dados em `public/data/` e as fotos em `public/fotos/`.

Se a base oficial não puder ser baixada ou retornar poucos registros, o build falha de propósito, evitando publicar um site vazio.
