const CARGOS = [
  {key:"depFederal", label:"Deputado Federal", short:"Federal", digits:4},
  {key:"depEstadual", label:"Deputado Estadual", short:"Estadual", digits:5},
  {key:"senador1", label:"Senador — 1ª vaga", short:"Senador 1", digits:3},
  {key:"senador2", label:"Senador — 2ª vaga", short:"Senador 2", digits:3},
  {key:"governador", label:"Governador", short:"Governador", digits:2},
  {key:"presidente", label:"Presidente", short:"Presidente", digits:2},
];

const demo = [
  {id:"demo-1",nome_urna:"ANIBELLI NETO",nome_completo:"ANIBELLI NETO",numero:"15190",cargo:"DEPUTADO ESTADUAL",partido_sigla:"MDB",uf:"PR"},
  {id:"demo-2",nome_urna:"SÉRGIO SOUZA",nome_completo:"SÉRGIO SOUZA",numero:"1512",cargo:"DEPUTADO FEDERAL",partido_sigla:"MDB",uf:"PR"},
  {id:"demo-3",nome_urna:"ALEXANDRE CURI",nome_completo:"ALEXANDRE CURI",numero:"100",cargo:"SENADOR",partido_sigla:"PSD",uf:"PR"},
  {id:"demo-4",nome_urna:"SANDRO ALEX",nome_completo:"SANDRO ALEX",numero:"55",cargo:"GOVERNADOR",partido_sigla:"PSD",uf:"PR"},
];

let candidatos = [];
let index = 0;
let filtro = "todos";
const selecionados = JSON.parse(localStorage.getItem("colinha-facil-pr") || "{}");

const $ = (id) => document.getElementById(id);

async function carregarDados(){
  try{
    const r = await fetch("/data/candidatos-pr.json");
    if(!r.ok) throw new Error("dados não encontrados");
    candidatos = await r.json();
  }catch{
    candidatos = demo;
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
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

function initials(name=""){
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
}

function renderSteps(){
  $("steps").innerHTML = CARGOS.map((c,i)=>{
    const chosen = selecionados[c.key];
    return `<button class="step ${i===index?"active":""} ${chosen?"done":""}" data-step="${i}">
      <span class="dot">${chosen?"✓":i+1}</span>
      <span><b>${c.short}</b><small>${chosen ? chosen.numero : "Escolher"}</small></span>
    </button>`;
  }).join("");
  document.querySelectorAll(".step").forEach(b=>b.onclick=()=>{index=Number(b.dataset.step);render()});
}

function renderResults(){
  const q = normalize($("searchInput").value.trim());
  const list = candidatos.filter(c=>c.uf==="PR" && cargoMatches(c)).filter(c=>{
    if(!q) return false;
    const hay = normalize(`${c.nome_urna} ${c.nome_completo} ${c.numero} ${c.partido_sigla}`);
    if(filtro==="numero") return String(c.numero||"").includes(q);
    if(filtro==="partido") return normalize(c.partido_sigla||"").includes(q);
    return hay.includes(q);
  }).slice(0,30);

  $("empty").classList.toggle("hidden", !!q && list.length===0 ? false : true);
  if(!q){
    $("results").innerHTML = `<div class="empty">Digite nome, número ou partido para encontrar candidatos.</div>`;
    return;
  }
  if(list.length===0){
    $("results").innerHTML = "";
    $("empty").textContent = "Nenhum candidato encontrado para este cargo.";
    return;
  }
  $("empty").classList.add("hidden");
  $("results").innerHTML = list.map(c=>{
    const chosen = selecionados[CARGOS[index].key]?.id === c.id;
    return `<div class="candidate ${chosen?"selected":""}">
      <div class="avatar">${c.foto_url?`<img src="${c.foto_url}" alt="">`:initials(c.nome_urna)}</div>
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
}

function render(){
  const c=CARGOS[index];
  $("stepLabel").textContent=`${index+1} de ${CARGOS.length}`;
  $("cargoTitle").textContent=c.label;
  $("searchInput").value="";
  $("nextBtn").textContent=index===CARGOS.length-1?"Finalizar →":"Continuar →";
  $("backBtn").disabled=index===0;
  renderSteps(); renderResults(); renderSummary();
}

function save(){localStorage.setItem("colinha-facil-pr",JSON.stringify(selecionados));}

function renderTicket(){
  $("ticket").innerHTML = `<div class="ticket-title"><b>COLINHA FÁCIL</b><small>ELEIÇÕES 2026 • PARANÁ</small></div>`+
    CARGOS.map((c,i)=>{
      const x=selecionados[c.key];
      return `<div class="ticket-row">
        <div class="ticket-photo">${x?.foto_url?`<img src="${x.foto_url}" alt="">`:initials(x?.nome_urna||c.short)}</div>
        <div class="ticket-info"><small>${i+1}. ${c.label}</small><b>${x?escapeHtml(x.nome_urna):"Não preenchido"}</b></div>
        <div class="ticket-number">${x?escapeHtml(x.numero):"—"}</div>
      </div>`;
    }).join("");
}

function showFinal(){
  renderTicket();
  $("finalSection").classList.remove("hidden");
  $("finalSection").scrollIntoView({behavior:"smooth"});
}

function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function escapeAttr(v=""){return escapeHtml(v).replace(/`/g,"&#096;");}

$("searchInput").addEventListener("input",renderResults);
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{filtro=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderResults()});
$("nextBtn").onclick=()=>{if(!selecionados[CARGOS[index].key]){alert("Escolha um candidato antes de continuar.");return} if(index<CARGOS.length-1){index++;render()}else showFinal()};
$("backBtn").onclick=()=>{if(index>0){index--;render()}};
$("clearStep").onclick=()=>{delete selecionados[CARGOS[index].key];save();render()};
$("generateBtn").onclick=showFinal;
$("editBtn").onclick=()=>{$("finalSection").classList.add("hidden");window.scrollTo({top:0,behavior:"smooth"})};
$("printBtn").onclick=()=>window.print();
$("shareBtn").onclick=async()=>{
  const text="Minha colinha eleitoral está pronta no Colinha Fácil.";
  if(navigator.share){await navigator.share({title:"Minha Colinha — Eleições 2026",text,url:location.href});}
  else {await navigator.clipboard.writeText(location.href);alert("Link copiado!");}
};
$("downloadBtn").onclick=async()=>{
  const node=$("ticket");
  if(window.html2canvas){
    const canvas=await window.html2canvas(node,{scale:2,backgroundColor:"#ffffff",useCORS:true});
    const a=document.createElement("a");
    a.download="minha-colinha-2026.png";
    a.href=canvas.toDataURL("image/png");
    a.click();
    return;
  }
  alert("O gerador de imagem não carregou. Use Imprimir por enquanto.");
};

if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
carregarDados();
