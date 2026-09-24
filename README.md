# Colinha Fácil — Eleições 2026

Ferramenta independente para organizar uma anotação pessoal dos números escolhidos pelo próprio eleitor.

## Dados
Os dados de candidaturas são importados do Portal de Dados Abertos do TSE, conjunto **Candidatos - 2026**. O projeto não é afiliado ao TSE e não indica candidatos.

Fonte oficial: https://dadosabertos.tse.jus.br/dataset/candidatos-2026

O workflow `Atualizar dados TSE` pode ser executado manualmente e também roda a cada 6 horas. Ele baixa os dados oficiais, mantém apenas candidaturas aptas relevantes para o Paraná e Presidente, importa as fotos oficiais quando consegue associá-las ao identificador do candidato e grava os arquivos no repositório.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```


## Dados oficiais
O build importa a base de Candidatos 2026 diretamente do Portal de Dados Abertos do TSE antes de gerar o site.

## Fotos oficiais
A V6 importa, no build, as fotos de candidatos disponibilizadas pelo TSE para 2026 e associa cada imagem ao `SQ_CANDIDATO`. Se uma foto não estiver disponível, o aplicativo usa as iniciais do nome como fallback.
