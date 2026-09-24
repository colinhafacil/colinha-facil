import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

const CAND_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const OUT = path.resolve("data/candidatos-pr.json");
const META = path.resolve("data/tse-meta.json");
const PHOTO_DIR = path.resolve("public/fotos");
const PHOTO_URLS = [
  "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_PR_div.zip",
  "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_BR_div.zip"
];

function pick(row, keys){
  for(const k of keys){
    if(row[k] !== undefined) return String(row[k]).trim();
  }
  return "";
}

async function download(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Falha ao baixar ${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

function statusVisible(s){
  const v = String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
  // O campo de situação da candidatura pode ser APTO/INAPTO.
  // Mantemos registros aptos e descartamos situações explicitamente inaptas/canceladas.
  return !v.includes("INAPTO") && !v.includes("CANCELAD") && !v.includes("FALEC");
}

function isRelevantCargo(cargo){
  const c=String(cargo||"").toUpperCase();
  return c.includes("DEPUTADO FEDERAL") || c.includes("DEPUTADO ESTADUAL") ||
    c.includes("DEPUTADO DISTRITAL") || c.includes("SENADOR") ||
    c.includes("GOVERNADOR") || c.includes("PRESIDENTE");
}

console.log("Baixando a base oficial de candidatos 2026 do TSE...");
const zip = new AdmZip(await download(CAND_URL));
const entries = zip.getEntries().filter(
  e => !e.isDirectory && /consulta_cand_2026.*\.csv$/i.test(e.entryName)
);
if(!entries.length) throw new Error("CSV de candidaturas não encontrado no ZIP do TSE.");

const all=[];
for(const entry of entries){
  const text=entry.getData().toString("latin1");
  const rows=parse(text,{
    columns:true,
    delimiter:";",
    relax_quotes:true,
    skip_empty_lines:true,
    bom:true
  });

  for(const row of rows){
    const uf=pick(row,["SG_UF"]);
    const cargo=pick(row,["DS_CARGO"]);
    const situacao=pick(row,["DS_SITUACAO_CANDIDATURA"]);

    const relevante =
      (uf === "PR" && isRelevantCargo(cargo)) ||
      (uf === "BR" && String(cargo).toUpperCase().includes("PRESIDENTE"));

    if(!relevante || !statusVisible(situacao)) continue;

    const id=pick(row,["SQ_CANDIDATO"]);
    if(!id) continue;

    all.push({
      id,
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

const unique=[...new Map(all.map(x=>[x.id,x])).values()]
  .sort((a,b)=>(a.cargo+a.nome_urna).localeCompare(b.cargo+b.nome_urna,"pt-BR"));

await fs.mkdir(path.dirname(OUT),{recursive:true});
await fs.writeFile(OUT,JSON.stringify(unique,null,2),"utf8");
await fs.writeFile(META,JSON.stringify({
  fonte:"TSE - Portal de Dados Abertos",
  dataset:"Candidatos - 2026",
  url:"https://dadosabertos.tse.jus.br/dataset/candidatos-2026",
  atualizado_em:new Date().toISOString(),
  quantidade:unique.length
},null,2),"utf8");

console.log(`Candidatos importados: ${unique.length}`);
console.log(`Arquivo: ${OUT}`);

// Importa as fotos oficiais disponibilizadas pelo TSE/DivulgaCand.
// A foto é associada pelo SQ_CANDIDATO e salva localmente para o site.
await fs.rm(PHOTO_DIR,{recursive:true,force:true});
await fs.mkdir(PHOTO_DIR,{recursive:true});
const byId = new Map(unique.map(c=>[String(c.id),c]));
let fotosImportadas = 0;
for(const photoUrl of PHOTO_URLS){
  try{
    console.log(`Baixando fotos: ${photoUrl}`);
    const pzip = new AdmZip(await download(photoUrl));
    for(const entry of pzip.getEntries()){
      if(entry.isDirectory || !/\.(jpe?g|png)$/i.test(entry.entryName)) continue;
      const base = path.basename(entry.entryName);
      const matches = base.match(/\d{6,}/g) || [];
      const id = matches.find(d=>byId.has(d));
      if(!id) continue;
      const outName = `${id}.jpg`;
      await fs.writeFile(path.join(PHOTO_DIR,outName),entry.getData());
      byId.get(id).foto_url = `/fotos/${outName}`;
      fotosImportadas++;
    }
  }catch(err){
    console.warn(`Aviso: fotos não importadas de ${photoUrl}: ${err.message}`);
  }
}
await fs.writeFile(OUT,JSON.stringify(unique,null,2),"utf8");
await fs.writeFile(META,JSON.stringify({
  fonte:"TSE - Portal de Dados Abertos / DivulgaCand",
  dataset:"Candidatos - 2026",
  url:"https://dadosabertos.tse.jus.br/dataset/candidatos-2026",
  atualizado_em:new Date().toISOString(),
  quantidade:unique.length,
  fotos_importadas:fotosImportadas
},null,2),"utf8");
console.log(`Fotos importadas: ${fotosImportadas}`);
