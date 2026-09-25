const CARGOS = [
  {key:"depFederal", label:"Deputado Federal", short:"Federal", digits:4},
  {key:"depEstadual", label:"Deputado Estadual", short:"Estadual", digits:5},
  {key:"senador1", label:"Senador — 1ª vaga", short:"Senador 1", digits:3},
  {key:"senador2", label:"Senador — 2ª vaga", short:"Senador 2", digits:3},
  {key:"governador", label:"Governador", short:"Governador", digits:2},
  {key:"presidente", label:"Presidente", short:"Presidente", digits:2},
];

let candidatos = [];
let meta = null;
let index = 0;
let filtro = "todos";
let dadosErro = "";

const selecionados = JSON.parse(localStorage.getItem("colinha-facil-pr") || "{}");
const $ = id => document.getElementById(id);

async function carregarDados(){
  dadosErro = "";
  try {
    const r = await fetch(`/data/candidatos-pr.json?v=${Date.now()}`, {cache:"no-store"});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    if(!Array.isArray(data) || data.length < 50) throw new Error("base incompleta");
    candidatos = data;

    try {
      const mr = await fetch(`/data/tse-meta.json?v=${Date.now()}`, {cache:"no-store"});
      if(mr.ok) meta = await mr.json();
    } catch {}
  } catch(err) {
    console.error("Falha ao carregar a base oficial do TSE:", err);
    candidatos = [];
    dadosErro = "A base oficial não está disponível neste momento. Tente atualizar a página.";
  }
  render();
}

function cargoMatches(c){
  const cargo = String(c.cargo || "").toUpperCase();
  const key = CARGOS[index].key;
  if(key === "depFederal") return cargo.includes("DEPUTADO FEDERAL");
  if(key === "depEstadual") return cargo.includes("DEPUTADO ESTADUAL") || cargo.includes("DEPUTADO DISTRITAL");
  if(key.startsWith("senador")) return cargo.includes("SENADOR");
  if(key === "governador") return cargo.includes("GOVERNADOR");
  if(key === "presidente") return cargo.includes("PRESIDENTE");
  return false;
}

function normalize(s=""){
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

function initials(name=""){
  return String(name).split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
}

function renderSteps(){
  $("steps").innerHTML = CARGOS.map((c,i)=>{
    const chosen = selecionados[c.key];
    return `<button class="step ${i===index?"active":""} ${chosen?"done":""}" data-step="${i}">
      <span class="dot">${chosen?"✓":i+1}</span>
      <span><b>${c.short}</b><small>${chosen ? escapeHtml(chosen.numero) : "Escolher"}</small></span>
    </button>`;
  }).join("");
  document.querySelectorAll(".step").forEach(b=>b.onclick=()=>{index=Number(b.dataset.step);render()});
}

function renderResults(){
  const q = normalize($("searchInput").value.trim());
  const ufEsperada = CARGOS[index].key === "presidente" ? "BR" : "PR";
  const outroSenadorKey = CARGOS[index].key === "senador1" ? "senador2" : (CARGOS[index].key === "senador2" ? "senador1" : null);
  const idOutroSenador = outroSenadorKey ? selecionados[outroSenadorKey]?.id : null;

  if(!candidatos.length){
    $("empty").classList.remove("hidden");
    $("empty").innerHTML = `${escapeHtml(dadosErro || "A base oficial de candidatos ainda não foi carregada.")}<br><button class="retry" id="retryBtn">↻ Tentar novamente</button>`;
    $("results").innerHTML = "";
    $("retryBtn").onclick = carregarDados;
    return;
  }

  const list = candidatos
    .filter(c=>c.uf===ufEsperada && cargoMatches(c))
    .filter(c=>!idOutroSenador || String(c.id)!==String(idOutroSenador))
    .filter(c=>{
      if(!q) return false;
      const hay = normalize(`${c.nome_urna} ${c.nome_completo} ${c.numero} ${c.partido_sigla}`);
      if(filtro==="numero") return String(c.numero||"").includes(q);
      if(filtro==="partido") return normalize(c.partido_sigla||"").includes(q);
      return hay.includes(q);
    }).slice(0,30);

  $("empty").classList.add("hidden");
  if(!q){
    $("results").innerHTML = `<div class="empty">Digite nome, número ou partido para encontrar candidatos.</div>`;
    return;
  }
  if(!list.length){
    $("results").innerHTML = "";
    $("empty").classList.remove("hidden");
    $("empty").textContent = "Nenhum candidato encontrado para este cargo.";
    return;
  }

  $("results").innerHTML = list.map(c=>{
    const chosen = selecionados[CARGOS[index].key]?.id === c.id;
    return `<div class="candidate ${chosen?"selected":""}">
      <div class="avatar">${c.foto_url?`<img src="${escapeAttr(c.foto_url)}" alt="Foto de ${escapeAttr(c.nome_urna||c.nome_completo)}" loading="lazy">`:initials(c.nome_urna||c.nome_completo)}</div>
      <div class="candidate-main">
        <div class="candidate-name">${escapeHtml(c.nome_urna || c.nome_completo)}</div>
        <div class="candidate-meta">${escapeHtml(c.partido_sigla||"")} • ${escapeHtml(c.cargo||"")}</div>
      </div>
      <div class="candidate-number">${escapeHtml(c.numero||"")}</div>
      <button class="add" data-id="${escapeAttr(c.id)}">${chosen?"✓ Escolhido":"+ Adicionar"}</button>
    </div>`;
  }).join("");

  document.querySelectorAll(".add").forEach(btn=>btn.onclick=()=>{
    const c=list.find(x=>String(x.id)===String(btn.dataset.id));
    if(c){selecionados[CARGOS[index].key]=c;save();render();}
  });
}

function renderSummary(){
  const count = CARGOS.filter(c=>selecionados[c.key]).length;
  $("selectedCount").textContent = `${count}/6`;
  $("summaryList").innerHTML = CARGOS.map((c,i)=>{
    const x=selecionados[c.key];
    return `<div class="summary-row">
      <span class="summary-n">${i+1}</span>
      <div><b>${c.short}</b><small>${x?escapeHtml(x.nome_urna||"Selecionado"):"Não escolhido"}</small></div>
      <span class="summary-number">${x?escapeHtml(x.numero):"—"}</span>
    </div>`;
  }).join("");
  $("generateBtn").disabled = count===0;
  $("generateBtn").title = count===6 ? "Ver a colinha completa" : "Você pode visualizar mesmo com campos vazios";
}

function render(){
  const c=CARGOS[index];
  $("stepLabel").textContent=`${index+1} de ${CARGOS.length}`;
  $("cargoTitle").textContent=c.label;
  $("searchInput").value="";
  $("nextBtn").textContent=index===CARGOS.length-1?"Finalizar →":"Continuar →";
  $("backBtn").disabled=index===0;
  renderSteps(); renderResults(); renderSummary();
  updateDataStatus();
}

function updateDataStatus(){
  const el=$("dataStatus");
  if(!el) return;
  if(meta?.atualizado_em){
    const d=new Date(meta.atualizado_em);
    el.textContent=`Base oficial carregada • ${d.toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})}`;
  }else if(candidatos.length){
    el.textContent="Base oficial carregada";
  }else{
    el.textContent="Base oficial indisponível";
  }
}

function save(){localStorage.setItem("colinha-facil-pr",JSON.stringify(selecionados));}

function renderTicket(){
  $("ticket").innerHTML = `<div class="ticket-title"><b>COLINHA FÁCIL</b><small>ELEIÇÕES 2026 • PARANÁ</small></div>`+
    CARGOS.map((c,i)=>{
      const x=selecionados[c.key];
      return `<div class="ticket-row">
        <div class="ticket-photo">${x?.foto_url?`<img src="${escapeAttr(x.foto_url)}" alt="" crossorigin="anonymous">`:initials(x?.nome_urna||c.short)}</div>
        <div class="ticket-info"><small>${i+1}. ${c.label}</small><b>${x?escapeHtml(x.nome_urna):"Não preenchido"}</b></div>
        <div class="ticket-number">${x?escapeHtml(x.numero):"—"}</div>
        <span class="confirm-badge" aria-label="Confirma">CONFIRMA<span class="braille-dots">••••••</span></span>
      </div>`;
    }).join("")+
    `<div class="ticket-source">Dados de candidaturas: TSE • Colinha Fácil não indica candidatos.</div>`;
}

function renderUrna(){
  $("urnaList").innerHTML = CARGOS.map((c,i)=>{
    const x=selecionados[c.key];
    return `<div class="urna-row"><span class="urna-cargo">${i+1}. ${c.label}</span><strong>${x ? escapeHtml(x.numero) : "—"}</strong></div>`;
  }).join("");
}

function abrirUrna(){renderUrna();$("urnaModal").classList.remove("hidden");$("urnaModal").setAttribute("aria-hidden","false");}
function fecharUrna(){$("urnaModal").classList.add("hidden");$("urnaModal").setAttribute("aria-hidden","true");}

function showFinal(){
  renderTicket();
  $("finalSection").classList.remove("hidden");
  $("finalSection").scrollIntoView({behavior:"smooth"});
}

function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function escapeAttr(v=""){return escapeHtml(v).replace(/`/g,"&#096;");}

$("searchInput").addEventListener("input",renderResults);
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{filtro=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderResults()});
$("nextBtn").onclick=()=>{
  if(!selecionados[CARGOS[index].key]){alert("Escolha um candidato antes de continuar.");return}
  if(index<CARGOS.length-1){index++;render();}else showFinal();
};
$("backBtn").onclick=()=>{if(index>0){index--;render()}};
$("clearStep").onclick=()=>{delete selecionados[CARGOS[index].key];save();render()};
$("generateBtn").onclick=showFinal;
$("urnaBtn").onclick=abrirUrna;
$("closeUrnaBtn").onclick=fecharUrna;
$("urnaModal").addEventListener("click",e=>{if(e.target.id==="urnaModal")fecharUrna()});
$("clearAllBtn").onclick=()=>{
  if(confirm("Tem certeza que deseja limpar todos os candidatos escolhidos?")){
    Object.keys(selecionados).forEach(k=>delete selecionados[k]);
    save(); fecharUrna(); $("finalSection").classList.add("hidden"); index=0; render(); window.scrollTo({top:0,behavior:"smooth"});
  }
};
$("editBtn").onclick=()=>{$("finalSection").classList.add("hidden");window.scrollTo({top:0,behavior:"smooth"})};
$("retryDataBtn").onclick=carregarDados;
$("printBtn").onclick=()=>window.print();

async function gerarImagemColinha(){
  const node=$("ticket");
  if(!window.html2canvas) throw new Error("gerador de imagem não carregou");
  return window.html2canvas(node,{scale:2,backgroundColor:"#ffffff",useCORS:true,allowTaint:false});
}

$("shareBtn").onclick=async()=>{
  try{
    const canvas=await gerarImagemColinha();
    canvas.toBlob(async blob=>{
      if(!blob) throw new Error("não foi possível gerar a imagem");
      const file=new File([blob],"minha-colinha-2026.png",{type:"image/png"});
      const text="Minha colinha eleitoral 2026 está pronta no Colinha Fácil.";
      if(navigator.share && navigator.canShare?.({files:[file]})) await navigator.share({title:"Minha Colinha — Eleições 2026",text,files:[file]});
      else if(navigator.share) await navigator.share({title:"Minha Colinha — Eleições 2026",text,url:location.href});
      else {await navigator.clipboard?.writeText(location.href);alert("Link copiado! Você pode colar no WhatsApp ou em outro aplicativo.");}
    },"image/png");
  }catch(err){if(err?.name!=="AbortError") alert("Não foi possível compartilhar agora. Use Baixar imagem e envie pelo WhatsApp.");}
};

$("whatsappBtn").onclick=()=>{
  const text="Minha colinha eleitoral 2026 está pronta no Colinha Fácil. Monte a sua também: "+location.href;
  window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank","noopener,noreferrer");
};

$("downloadBtn").onclick=async()=>{
  try{
    const canvas=await gerarImagemColinha();
    const a=document.createElement("a");a.download="minha-colinha-2026.png";a.href=canvas.toDataURL("image/png");a.click();
  }catch(err){alert("O gerador de imagem não carregou. Use Imprimir por enquanto.");}
};

if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js?v=8").catch(()=>{});
carregarDados();
