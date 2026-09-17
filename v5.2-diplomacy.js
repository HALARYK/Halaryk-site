import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";
import { renderRichText, plainExcerpt } from "./v5.2-richtext.js";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ROOT=new URL("./",import.meta.url);
const asset=p=>new URL(p,ROOT).href;
const CRESTS={CAS:"assets/nations/nation-castille.svg",ENG:"assets/nations/nation-angleterre.svg",LAN:"assets/nations/nation-florence.svg",BRA:"assets/nations/nation-brandebourg.svg",HAB:"assets/nations/nation-autriche.svg",TUR:"assets/nations/nation-ottomans.svg",MOS:"assets/nations/nation-moscovie.svg"};
const TYPES=new Set(["diplomatie","congrès","traité","déclaration","correspondance"]);

function loadCss(){if(document.querySelector('link[href$="v5.2-diplomacy.css"]'))return;const l=document.createElement("link");l.rel="stylesheet";l.href=new URL("v5.2-diplomacy.css",ROOT).href;document.head.appendChild(l)}
function labelType(v="déclaration"){return String(v).replaceAll("_"," ")}
function crest(p){const path=CRESTS[p?.participant_key];return path?asset(path):""}
function dateLabel(e){return e.world_date_label||e.world_year||"Document public"}

function ensureModal(){
  let modal=$("#v52-diplomacy-modal");if(modal)return modal;
  modal=document.createElement("div");modal.id="v52-diplomacy-modal";modal.className="v52-diplomacy-modal";modal.hidden=true;
  modal.innerHTML='<article class="v52-diplomacy-sheet"><button class="v52-diplomacy-close" type="button" aria-label="Fermer">×</button><div class="v52-diplomacy-sheet-content"></div></article>';
  document.body.append(modal);
  const close=()=>{modal.hidden=true;document.body.style.overflow=""};
  $(".v52-diplomacy-close",modal)?.addEventListener("click",close);
  modal.addEventListener("click",e=>{if(e.target===modal)close()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close()});
  return modal;
}

function openDocument(entry,p){
  const modal=ensureModal(),box=$(".v52-diplomacy-sheet-content",modal),img=crest(p);
  box.innerHTML=`<div class="v52-diplomacy-sheet-head">${img?`<img src="${img}" alt="${esc(p?.title||"")}">`:""}<div><b>${esc(p?.title||"Diplomatie")}</b><span>${esc(labelType(entry.entry_type))} · ${esc(dateLabel(entry))}</span></div></div><h2>${esc(entry.title||"Document diplomatique")}</h2><div class="v52-diplomacy-rule"></div><div class="v52-rich-document">${renderRichText(entry.body||entry.summary||"")}</div>`;
  modal.hidden=false;document.body.style.overflow="hidden";
}

function card(entry,p){
  const img=crest(p),excerpt=plainExcerpt(entry.summary||entry.body||"",260);
  return `<article class="v52-diplomacy-document-card" data-diplomacy-id="${esc(entry.id)}"><div class="v52-diplomacy-document-head">${img?`<img src="${img}" alt="${esc(p?.title||"")}">`:""}<div><b>${esc(p?.title||"Diplomatie")}</b><span>${esc(labelType(entry.entry_type))} · ${esc(dateLabel(entry))}</span></div></div><h3>${esc(entry.title||"Document diplomatique")}</h3>${excerpt?`<p class="v52-diplomacy-document-excerpt">${esc(excerpt)}</p>`:""}<button class="v52-diplomacy-read" type="button">Lire le document</button></article>`;
}

async function boot(){
  if(document.body.dataset.eventSlug!=="ppo-europe"||!BACKEND_CONFIGURED)return;
  loadCss();
  const host=$("#event-diplomacy");if(!host)return;
  const db=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});
  const {data:event}=await db.from("site_events").select("id").eq("slug","ppo-europe").maybeSingle();if(!event)return;
  const [{data:participants},{data:entries}]=await Promise.all([
    db.from("site_event_participants").select("id,participant_key,player_name,title,sort_order").eq("event_id",event.id).eq("public",true).order("sort_order"),
    db.from("site_event_entries").select("*").eq("event_id",event.id).eq("public",true).order("world_year",{ascending:true,nullsFirst:false}).order("sort_order")
  ]);
  const ps=participants||[],byId=new Map(ps.map(p=>[p.id,p]));
  const docs=(entries||[]).filter(e=>TYPES.has(e.entry_type));
  const docsById=new Map(docs.map(e=>[String(e.id),e]));
  let applying=false;
  const render=()=>{
    if(applying)return;
    if(host.querySelectorAll(".v52-diplomacy-document-card").length===docs.length&&host.classList.contains("v52-diplomacy-library"))return;
    applying=true;
    host.className="v52-diplomacy-library";
    host.innerHTML=docs.length?docs.map(e=>card(e,e.participant_id?byId.get(e.participant_id):null)).join(""):'<div class="empty-state"><strong>Aucune prise de parole publique pour le moment</strong><p>Les déclarations, traités et congrès apparaîtront ici une fois publiés.</p></div>';
    applying=false;
  };
  host.addEventListener("click",e=>{
    const cardEl=e.target.closest("[data-diplomacy-id]");if(!cardEl||!e.target.closest(".v52-diplomacy-read"))return;
    const entry=docsById.get(cardEl.dataset.diplomacyId);if(!entry)return;openDocument(entry,entry.participant_id?byId.get(entry.participant_id):null);
  });
  new MutationObserver(()=>requestAnimationFrame(render)).observe(host,{childList:true,subtree:false});
  render();setTimeout(render,400);setTimeout(render,1200);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
