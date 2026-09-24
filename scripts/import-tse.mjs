import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

const CAND_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const PHOTO_PR_URL = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_PR_div.zip";
const PHOTO_BR_URL = "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_BR_div.zip";
const OUT = path.resolve("data/candidatos-pr.json");
const PHOTO_DIR = path.resolve("public/fotos");

function pick(row, keys){
  for(const k of keys){ if(row[k] !== undefined) return String(row[k]).trim(); }
  return "";
}

async function download(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

function isApto(s){
  return String(s || "").toUpperCase().includes("APTO");
}

function isRelevantCargo(cargo){
  const c=String(cargo||"").toUpperCase();
  return c.includes("DEPUTADO FEDERAL") || c.includes("DEPUTADO ESTADUAL") ||
    c.includes("DEPUTADO DISTRITAL") || c.includes("SENADOR") ||
    c.includes("GOVERNADOR") || c.includes("PRESIDENTE");
}

console.log("Baixando dados oficiais do TSE...");
const zip = new AdmZip(await download(CAND_URL));
const entries = zip.getEntries().filter(e => !e.isDirectory && /consulta_cand_2026.*\.csv$/i.test(e.entryName));
if(!entries.length) throw new Error("CSV de candidaturas não encontrado no ZIP do TSE.");

const all=[];
for(const entry of entries){
  const text=entry.getData().toString("latin1");
  const rows=parse(text,{columns:true,delimiter:";",relax_quotes:true,skip_empty_lines:true,bom:true});
  for(const row of rows){
    const uf=pick(row,["SG_UF"]);
    const cargo=pick(row,["DS_CARGO"]);
    const situacao=pick(row,["DS_SITUACAO_CANDIDATURA"]);
    // PR para cargos estaduais e BR para Presidente.
    if(!((uf === "PR" && isRelevantCargo(cargo)) || (uf === "BR" && String(cargo).toUpperCase().includes("PRESIDENTE")))) continue;
    if(!isApto(situacao)) continue;
    all.push({
      id: pick(row,["SQ_CANDIDATO"]),
      nome_completo: pick(row,["NM_CANDIDATO"]),
      nome_urna: pick(row,["NM_URNA_CANDIDATO"]),
      numero: pick(row,["NR_CANDIDATO"]),
      cargo,
      partido_sigla: pick(row,["SG_PARTIDO"]),
      uf,
      situacao
    });
  }
}

// Remove duplicidades pelo identificador oficial.
const unique=[...new Map(all.map(x=>[x.id,x])).values()];
await fs.writeFile(OUT,JSON.stringify(unique,null,2),"utf8");
console.log(`Candidatos aptos gravados: ${unique.length}`);

// Fotos: baixa os pacotes oficiais e tenta associar pelo SQ_CANDIDATO presente no nome do arquivo.
await fs.rm(PHOTO_DIR,{recursive:true,force:true});
await fs.mkdir(PHOTO_DIR,{recursive:true});
const photoZips=[PHOTO_PR_URL,PHOTO_BR_URL];
const photoIndex=new Map();
for(const url of photoZips){
  try{
    const pzip=new AdmZip(await download(url));
    for(const entry of pzip.getEntries()){
      if(entry.isDirectory || !/\.(jpe?g|png)$/i.test(entry.entryName)) continue;
      const base=path.basename(entry.entryName);
      const digits=base.match(/\d{6,}/g) || [];
      for(const d of digits){
        const candidate=unique.find(c=>c.id===d);
        if(candidate){
          const safe=`${candidate.id}.jpg`;
          await fs.writeFile(path.join(PHOTO_DIR,safe),entry.getData());
          photoIndex.set(candidate.id,`/fotos/${safe}`);
          break;
        }
      }
    }
  }catch(err){
    console.warn(`Aviso: não foi possível importar fotos de ${url}: ${err.message}`);
  }
}

for(const c of unique){ if(photoIndex.has(c.id)) c.foto_url=photoIndex.get(c.id); }
await fs.writeFile(OUT,JSON.stringify(unique,null,2),"utf8");
console.log(`Fotos associadas: ${photoIndex.size}`);
console.log(`Arquivo final: ${OUT}`);
