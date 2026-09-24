import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

const CAND_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const OUT = path.resolve("data/candidatos-pr.json");

function pick(row, keys){
  for(const k of keys){ if(row[k] !== undefined) return String(row[k]).trim(); }
  return "";
}

async function download(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

console.log("Baixando dados oficiais do TSE...");
const zipBuffer = await download(CAND_URL);
const zip = new AdmZip(zipBuffer);

const entries = zip.getEntries().filter(e =>
  !e.isDirectory &&
  /consulta_cand_2026.*\\.csv$/i.test(e.entryName) &&
  /PR/i.test(e.entryName)
);

if(!entries.length){
  console.error("Não encontrei o CSV do Paraná dentro do ZIP. Liste os arquivos com 'node scripts/list-tse-files.mjs'.");
  process.exit(1);
}

const all = [];
for(const entry of entries){
  const text = entry.getData().toString("latin1");
  const rows = parse(text,{columns:true,delimiter:";",relax_quotes:true,skip_empty_lines:true});
  for(const row of rows){
    const uf = pick(row,["SG_UF"]);
    if(uf !== "PR") continue;
    all.push({
      id: pick(row,["SQ_CANDIDATO"]),
      nome_completo: pick(row,["NM_CANDIDATO"]),
      nome_urna: pick(row,["NM_URNA_CANDIDATO"]),
      numero: pick(row,["NR_CANDIDATO"]),
      cargo: pick(row,["DS_CARGO"]),
      partido_sigla: pick(row,["SG_PARTIDO"]),
      uf,
      situacao: pick(row,["DS_SITUACAO_CANDIDATURA"])
    });
  }
}

await fs.writeFile(OUT, JSON.stringify(all,null,2), "utf8");
console.log(`OK: ${all.length} registros gravados em ${OUT}`);
console.log("Próximo passo: importar/associar as fotos do pacote PR e revisar os campos do CSV.");
