import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

const CAND_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";
const OUT_DIR = path.resolve("public/data");
const OUT = path.join(OUT_DIR, "candidatos-pr.json");
const META = path.join(OUT_DIR, "tse-meta.json");
const STATUS = path.join(OUT_DIR, "build-status.json");
const PHOTO_DIR = path.resolve("public/fotos");
const PHOTO_URLS = [
  "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_PR_div.zip",
  "https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_BR_div.zip"
];

function pick(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return String(row[k]).trim();
  }
  return "";
}

function normalize(s = "") {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function statusVisible(s) {
  const v = normalize(s);
  return !v.includes("INAPTO") && !v.includes("CANCELAD") && !v.includes("FALEC");
}

function isRelevantCargo(cargo) {
  const c = normalize(cargo);
  return c.includes("DEPUTADO FEDERAL") ||
    c.includes("DEPUTADO ESTADUAL") ||
    c.includes("DEPUTADO DISTRITAL") ||
    c.includes("SENADOR") ||
    c.includes("GOVERNADOR") ||
    c.includes("PRESIDENTE");
}

async function download(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Colinha-Facil/0.8 (+TSE-data-import)" }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function writeStatus(status, extra = {}) {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(STATUS, JSON.stringify({
    ok: status === "ok",
    status,
    timestamp: new Date().toISOString(),
    ...extra
  }, null, 2), "utf8");
}

await writeStatus("starting");

try {
  console.log("[TSE] Baixando base oficial de candidaturas 2026...");
  const zip = new AdmZip(await download(CAND_URL));
  const entries = zip.getEntries().filter(
    e => !e.isDirectory && /consulta_cand_2026.*\.csv$/i.test(e.entryName)
  );
  if (!entries.length) throw new Error("CSV de candidaturas não encontrado no ZIP do TSE.");

  const all = [];
  for (const entry of entries) {
    const text = entry.getData().toString("latin1");
    const rows = parse(text, {
      columns: true,
      delimiter: ";",
      relax_quotes: true,
      skip_empty_lines: true,
      bom: true
    });

    for (const row of rows) {
      const uf = pick(row, ["SG_UF"]);
      const cargo = pick(row, ["DS_CARGO"]);
      const situacao = pick(row, ["DS_SITUACAO_CANDIDATURA"]);
      const relevante =
        (uf === "PR" && isRelevantCargo(cargo)) ||
        (uf === "BR" && normalize(cargo).includes("PRESIDENTE"));

      if (!relevante || !statusVisible(situacao)) continue;

      const id = pick(row, ["SQ_CANDIDATO"]);
      if (!id) continue;

      all.push({
        id,
        nome_completo: pick(row, ["NM_CANDIDATO"]),
        nome_urna: pick(row, ["NM_URNA_CANDIDATO"]),
        numero: pick(row, ["NR_CANDIDATO"]),
        cargo,
        partido_sigla: pick(row, ["SG_PARTIDO"]),
        uf,
        situacao
      });
    }
  }

  const unique = [...new Map(all.map(x => [x.id, x])).values()]
    .sort((a, b) => (a.cargo + a.nome_urna).localeCompare(b.cargo + b.nome_urna, "pt-BR"));

  // Fail the deployment instead of publishing a site with an empty/partial base.
  if (unique.length < 50) {
    throw new Error(`Base do TSE retornou apenas ${unique.length} candidatos relevantes; atualização abortada por segurança.`);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(unique, null, 2), "utf8");

  console.log(`[TSE] Candidatos importados: ${unique.length}`);

  // Photos are optional: candidate data must remain available even if the photo package changes.
  let fotosImportadas = 0;
  await fs.rm(PHOTO_DIR, { recursive: true, force: true });
  await fs.mkdir(PHOTO_DIR, { recursive: true });
  const byId = new Map(unique.map(c => [String(c.id), c]));

  for (const photoUrl of PHOTO_URLS) {
    try {
      console.log(`[TSE] Baixando fotos: ${photoUrl}`);
      const pzip = new AdmZip(await download(photoUrl));
      for (const entry of pzip.getEntries()) {
        if (entry.isDirectory || !/\.(jpe?g|png)$/i.test(entry.entryName)) continue;
        const base = path.basename(entry.entryName);
        const matches = base.match(/\d{6,}/g) || [];
        const id = matches.find(d => byId.has(d));
        if (!id) continue;
        const outName = `${id}.jpg`;
        await fs.writeFile(path.join(PHOTO_DIR, outName), entry.getData());
        byId.get(id).foto_url = `/fotos/${outName}`;
        fotosImportadas++;
      }
    } catch (err) {
      console.warn(`[TSE] Fotos indisponíveis nesta fonte: ${err.message}`);
    }
  }

  await fs.writeFile(OUT, JSON.stringify(unique, null, 2), "utf8");
  const metadata = {
    fonte: "TSE - Portal de Dados Abertos / DivulgaCand",
    dataset: "Candidatos - 2026",
    url: "https://dadosabertos.tse.jus.br/dataset/candidatos-2026",
    atualizado_em: new Date().toISOString(),
    quantidade: unique.length,
    fotos_importadas: fotosImportadas
  };
  await fs.writeFile(META, JSON.stringify(metadata, null, 2), "utf8");
  await writeStatus("ok", metadata);
  console.log(`[TSE] Fotos importadas: ${fotosImportadas}`);
  console.log(`[TSE] Base pronta em ${OUT}`);
} catch (err) {
  await writeStatus("error", { error: String(err?.message || err) });
  console.error("[TSE] ERRO:", err);
  process.exit(1);
}
