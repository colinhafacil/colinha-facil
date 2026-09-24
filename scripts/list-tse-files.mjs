import AdmZip from "adm-zip";
const url="https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const r=await fetch(url); if(!r.ok) throw new Error(`HTTP ${r.status}`);
const zip=new AdmZip(Buffer.from(await r.arrayBuffer()));
console.log(zip.getEntries().map(e=>e.entryName).join("\n"));
