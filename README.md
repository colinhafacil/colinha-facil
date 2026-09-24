# Colinha Fácil — Paraná — MVP

Protótipo de PWA para organizar uma anotação pessoal dos números de votação nas Eleições 2026.

## O que já está pronto

- Interface mobile-first.
- Fluxo dos 6 cargos na ordem oficial.
- Busca por nome, número ou partido.
- Seleção salva no `localStorage`.
- Tela final da colinha.
- Impressão.
- Compartilhamento via Web Share quando disponível.
- PWA instalável no celular.
- Fallback de demonstração para testar a interface.
- Script inicial para importar candidatos PR do arquivo oficial de Candidatos 2026 do TSE.

## Fonte oficial

Portal de Dados Abertos do TSE:
https://dadosabertos.tse.jus.br/dataset/candidatos-2026

Arquivo de candidatos:
https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip

Fotos PR:
https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_PR_div.zip

## Rodar localmente

Requer Node.js 20+.

```bash
npm install
npm run dev
```

Abra a URL exibida pelo Vite.

## Importar candidatos do Paraná

```bash
npm run import:tse
```

O script baixa o ZIP oficial, encontra o CSV do Paraná e cria:

`data/candidatos-pr.json`

### Atenção

O formato dos arquivos do TSE pode mudar. O script é um ponto de partida e deve ser testado com a versão atual do arquivo antes de colocar o processo automático em produção.

## Próximos passos de produção

1. Associar automaticamente as fotos do pacote PR pelo `SQ_CANDIDATO`.
2. Criar rotina diária/4x ao dia de atualização.
3. Subir os dados para Supabase ou gerar JSON estático no build.
4. Criar páginas de Privacidade e Termos.
5. Configurar domínio.
6. Configurar Analytics.
7. Preparar AdSense/publicidade geral.
8. Criar modelos de colinha para impressão em A4 e cartão.
9. Expandir PR para todas as UFs.

## Monetização

O produto básico deve permanecer gratuito. Para receita:

- publicidade geral em espaços claramente identificados;
- versão premium com modelos de impressão, sem anúncios e recursos extras;
- publicidade comercial não eleitoral, separada do conteúdo de candidaturas.

Não criar ranking, recomendação, destaque pago de candidato ou linguagem de persuasão política. A finalidade é organizar a escolha feita pelo próprio eleitor.

## Aviso de produto

O Colinha Fácil não é o TSE e não substitui os canais oficiais da Justiça Eleitoral. Os dados de candidaturas são apresentados a partir de fontes oficiais e devem exibir a data da última atualização.
