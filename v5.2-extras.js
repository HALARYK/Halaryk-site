import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";
import { CURATED_EVENTS } from "./v5.2-curated-data.js";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ROOT=new URL("./",import.meta.url);
const asset=p=>new URL(p,ROOT).href;

const TAGS=["CAS","ENG","LAN","BRA","HAB","TUR","MOS"];
const CRESTS={CAS:"assets/nations/nation-castille.svg",ENG:"assets/nations/nation-angleterre.svg",LAN:"assets/nations/nation-florence.svg",BRA:"assets/nations/nation-brandebourg.svg",HAB:"assets/nations/nation-autriche.svg",TUR:"assets/nations/nation-ottomans.svg",MOS:"assets/nations/nation-moscovie.svg"};
const DIPLO_TYPES=new Set(["diplomatie","congrès","traité","déclaration","correspondance"]);
const LABELS={guerre:"Guerre",bataille:"Bataille",dynastie:"Dynastie",désastre:"Désastre",politique:"Politique",crise:"Crise",exploration:"Exploration",événement:"Événement",religion:"Religion",empire:"Saint-Empire",puissance:"Grande Puissance",capitale:"Capitale",population:"Population",révolte:"Révolte",culture:"Culture",diplomatie:"Diplomatie"};

function loadCss(){
  if(document.querySelector('link[href$="v5.2-extras.css"]'))return;
  const l=document.createElement("link");l.rel="stylesheet";l.href=new URL("./v5.2-extras.css",import.meta.url).href;document.head.appendChild(l);
}
function parseDate(d){
  const m=String(d||"").match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})$/);
  if(!m)return 99999999;
  return Number(m[1])*10000+Number(m[2])*100+Number(m[3]);
}
function frDate(d){
  const m=String(d||"").match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})$/);
  if(!m)return d||"—";
  return `${m[3].padStart(2,"0")}/${m[2].padStart(2,"0")}/${m[1]}`;
}
function typeLabel(t){return LABELS[t]||String(t||"Événement").replaceAll("_"," ")}
function entryTags(entry,byId){
  const tags=new Set();
  const owner=entry.participant_id?byId.get(entry.participant_id):null;
  if(owner?.participant_key)tags.add(owner.participant_key);
  (entry.data?.participants||[]).forEach(t=>tags.add(t));
  (entry.data?.subjects||[]).forEach(t=>tags.add(t));
  return [...tags];
}
function isPre1482(entry,chapterById){
  const wy=Number(entry.world_year);
  if(Number.isFinite(wy)&&wy>0)return wy<=1481;
  const c=entry.chapter_id?chapterById.get(entry.chapter_id):null;
  if(!c)return false;
  const raw=c.world_end_date||c.world_start_date||"";
  const y=Number(String(raw).slice(0,4));
  return Number.isFinite(y)&&y<=1481;
}

function ensureModal(){
  let modal=$("#v52-detail-modal");if(modal)return modal;
  modal=document.createElement("div");modal.id="v52-detail-modal";modal.className="v52-detail-modal";modal.hidden=true;
  modal.innerHTML=`<article class="v52-detail-sheet"><button type="button" class="v52-detail-close" aria-label="Fermer">×</button><div class="v52-detail-content"></div></article>`;
  document.body.append(modal);
  const close=()=>{modal.hidden=true;document.body.style.overflow=""};
  $(".v52-detail-close",modal).addEventListener("click",close);
  modal.addEventListener("click",e=>{if(e.target===modal)close()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close()});
  return modal;
}
function openEvent(ev,country){
  const modal=ensureModal(),box=$(".v52-detail-content",modal);
  const facts=(ev.facts||[]).filter(x=>Array.isArray(x)&&x.length>=2&&x[0]&&x[1]);
  box.innerHTML=`<div class="v52-detail-meta"><span>${esc(country.title)}</span><span>${esc(typeLabel(ev.type))}</span><span>${esc(frDate(ev.date))}</span></div><h3>${esc(ev.title)}</h3>${ev.summary?`<p class="v52-detail-summary">${esc(ev.summary)}</p>`:""}${facts.length?`<div class="v52-fact-grid">${facts.map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div>`:""}`;
  modal.hidden=false;document.body.style.overflow="hidden";
}
function openDocument(entry,country){
  const modal=ensureModal(),box=$(".v52-detail-content",modal);
  box.innerHTML=`<div class="v52-detail-meta"><span>${esc(country.title)}</span><span>${esc(typeLabel(entry.entry_type))}</span><span>${esc(entry.world_date_label||entry.world_year||"Document RP")}</span></div><h3>${esc(entry.title||"Document diplomatique")}</h3>${entry.summary?`<p class="v52-detail-summary">${esc(entry.summary)}</p>`:""}<div class="v52-document-body">${esc(entry.body||"Aucun texte complet n’a encore été publié pour ce document.")}</div>`;
  modal.hidden=false;document.body.style.overflow="hidden";
}
function curatedNode(ev,i){
  return `<button type="button" class="v52-curated-node" data-event-index="${i}" data-type="${esc(ev.type)}"><span class="v52-curated-date">${esc(frDate(ev.date))}</span><span class="v52-curated-dot" aria-hidden="true"></span><strong>${esc(ev.title)}</strong></button>`;
}
function entryDocDate(e){return e.world_date_label||e.world_year||typeLabel(e.entry_type)}

function renderChronology(host,participants,docs,byId,chapterById){
  const byTag=new Map(participants.map(p=>[p.participant_key,p]));
  let active=host.dataset.activeCountry||"CAS";
  if(!byTag.has(active))active=participants[0]?.participant_key||"CAS";
  host.dataset.activeCountry=active;
  const country=byTag.get(active)||{participant_key:active,title:active,player_name:""};
  const events=[...(CURATED_EVENTS[active]||[])].sort((a,b)=>parseDate(a.date)-parseDate(b.date));
  const countryDocs=docs.filter(e=>entryTags(e,byId).includes(active)&&isPre1482(e,chapterById));

  host.className="v52-curated-timeline";
  host.innerHTML=`<div class="v52-country-tabs">${participants.filter(p=>TAGS.includes(p.participant_key)).sort((a,b)=>TAGS.indexOf(a.participant_key)-TAGS.indexOf(b.participant_key)).map(p=>`<button type="button" class="${p.participant_key===active?"active":""}" data-country="${p.participant_key}"><img src="${asset(CRESTS[p.participant_key])}" alt=""><span><b>${esc(p.title)}</b><small>${esc(p.player_name||"")}</small></span></button>`).join("")}</div><div class="v52-country-range"><strong>${esc(country.title)} · 1444 → 1481</strong><span>${events.length} faits retenus · clique sur un événement pour ouvrir son dossier détaillé.</span></div>${countryDocs.length?`<div class="v52-diplomacy-strip"><div class="v52-diplomacy-strip-label">Documents RP</div><div class="v52-diplomacy-bubbles">${countryDocs.map(e=>`<button type="button" class="v52-diplomacy-bubble" data-doc-id="${esc(e.id)}"><span class="v52-diplomacy-bubble-icon">✉</span><span><span>${esc(entryDocDate(e))}</span><strong>${esc(e.title||typeLabel(e.entry_type))}</strong></span></button>`).join("")}</div></div>`:""}<div class="v52-curated-shell"><div class="v52-curated-track">${events.map(curatedNode).join("")}</div></div>`;

  $$(".v52-country-tabs button",host).forEach(b=>b.addEventListener("click",()=>{host.dataset.activeCountry=b.dataset.country;renderChronology(host,participants,docs,byId,chapterById)}));
  $$(".v52-curated-node",host).forEach(b=>b.addEventListener("click",()=>openEvent(events[Number(b.dataset.eventIndex)],country)));
  const docMap=new Map(countryDocs.map(e=>[String(e.id),e]));
  $$(".v52-diplomacy-bubble",host).forEach(b=>b.addEventListener("click",()=>openDocument(docMap.get(b.dataset.docId),country)));
}

async function bootCurated(){
  if(document.body.dataset.eventSlug!=="ppo-europe"||!BACKEND_CONFIGURED)return;
  const host=$("#event-timeline");if(!host)return;
  const db=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});
  const {data:event}=await db.from("site_events").select("id").eq("slug","ppo-europe").maybeSingle();if(!event)return;
  const [{data:participants},{data:entries},{data:chapters}]=await Promise.all([
    db.from("site_event_participants").select("id,participant_key,player_name,title,sort_order").eq("event_id",event.id).eq("public",true).order("sort_order"),
    db.from("site_event_entries").select("*").eq("event_id",event.id).eq("public",true).order("world_year",{ascending:true,nullsFirst:false}).order("sort_order"),
    db.from("site_event_chapters").select("id,world_start_date,world_end_date,status").eq("event_id",event.id).eq("public",true)
  ]);
  const ps=participants||[],byId=new Map(ps.map(p=>[p.id,p])),chapterById=new Map((chapters||[]).map(c=>[c.id,c]));
  const docs=(entries||[]).filter(e=>DIPLO_TYPES.has(e.entry_type));
  let applying=false;
  const apply=()=>{if(applying||host.querySelector(".v52-curated-track"))return;applying=true;renderChronology(host,ps,docs,byId,chapterById);applying=false};
  new MutationObserver(()=>requestAnimationFrame(apply)).observe(host,{childList:true,subtree:true});
  setTimeout(apply,0);setTimeout(apply,900);
}

loadCss();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootCurated);else bootCurated();
