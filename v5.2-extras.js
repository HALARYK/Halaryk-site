import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const diplomaticTypes=new Set(["diplomatie","congrès","traité","déclaration","correspondance"]);
const PUBLIC_END_YEAR=1481;

function loadCss(){
  if(document.querySelector('link[href$="v5.2-extras.css"]'))return;
  const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('./v5.2-extras.css',import.meta.url).href;document.head.appendChild(l);
}
function y(v){return v?Number(String(v).slice(0,4)):null}
function tagsFor(entry,participantsById){
  const tags=new Set();
  const owner=entry.participant_id?participantsById.get(entry.participant_id):null;
  if(owner?.participant_key)tags.add(owner.participant_key);
  (entry.data?.participants||[]).forEach(t=>tags.add(t));
  (entry.data?.subjects||[]).forEach(t=>tags.add(t));
  return [...tags];
}
function isPublishedPeriod(entry,chapterById){
  const wy=Number(entry.world_year);
  if(Number.isFinite(wy)&&wy>0)return wy<=PUBLIC_END_YEAR;
  const chapter=entry.chapter_id?chapterById.get(entry.chapter_id):null;
  if(!chapter)return false;
  const end=y(chapter.world_end_date),start=y(chapter.world_start_date);
  if(end)return end<=PUBLIC_END_YEAR;
  return !!start&&start<=PUBLIC_END_YEAR&&chapter.status==='complete';
}
function dateLabel(entry){return entry.world_date_label||entry.world_year||'Document RP'}
function typeLabel(t){return ({déclaration:'Déclaration',traité:'Traité',congrès:'Congrès',correspondance:'Correspondance',diplomatie:'Diplomatie'})[t]||'Document diplomatique'}

function ensureModal(){
  let modal=$('#v52-document-modal');if(modal)return modal;
  modal=document.createElement('div');modal.id='v52-document-modal';modal.className='v52-document-modal';modal.hidden=true;
  modal.innerHTML='<article class="v52-document-sheet"><button type="button" class="v52-document-close" aria-label="Fermer">×</button><div class="v52-document-content"></div></article>';
  document.body.append(modal);
  const close=()=>{modal.hidden=true;document.body.style.overflow=''};
  $('.v52-document-close',modal).addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
  return modal;
}
function openDocument(entry,country){
  const modal=ensureModal(),content=$('.v52-document-content',modal);
  content.innerHTML=`<div class="v52-document-meta"><span>${esc(country?.title||'Diplomatie')}</span><span>${esc(typeLabel(entry.entry_type))}</span><span>${esc(dateLabel(entry))}</span></div><h3>${esc(entry.title||'Document diplomatique')}</h3>${entry.summary?`<p class="v52-document-summary">${esc(entry.summary)}</p>`:''}${entry.body?`<div class="v52-document-body">${esc(entry.body)}</div>`:'<div class="v52-document-body">Aucun texte complet n’a encore été publié pour ce document.</div>'}`;
  modal.hidden=false;document.body.style.overflow='hidden';
}

async function bootDiplomacyTimeline(){
  if(document.body.dataset.eventSlug!=='ppo-europe'||!BACKEND_CONFIGURED)return;
  const host=$('#event-timeline');if(!host)return;
  const db=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});
  const {data:event}=await db.from('site_events').select('id').eq('slug','ppo-europe').maybeSingle();if(!event)return;
  const [{data:participants},{data:entries},{data:chapters}]=await Promise.all([
    db.from('site_event_participants').select('id,participant_key,player_name,title').eq('event_id',event.id).eq('public',true),
    db.from('site_event_entries').select('*').eq('event_id',event.id).eq('public',true).order('world_year',{ascending:true,nullsFirst:false}).order('sort_order'),
    db.from('site_event_chapters').select('id,title,world_start_date,world_end_date,status').eq('event_id',event.id).eq('public',true)
  ]);
  const ps=participants||[],byId=new Map(ps.map(p=>[p.id,p])),chapterById=new Map((chapters||[]).map(c=>[c.id,c]));
  const docs=(entries||[]).filter(e=>diplomaticTypes.has(e.entry_type)&&isPublishedPeriod(e,chapterById));
  const docMap=new Map(docs.map(e=>[String(e.id),e]));
  const countryByTag=new Map(ps.map(p=>[p.participant_key,p]));

  const render=()=>{
    const timeline=$('.v52-country-timeline',host);if(!timeline)return;
    $('.v52-diplomacy-strip',timeline)?.remove();
    const active=$('.v52-country-tabs button.active',timeline)?.dataset.country;if(!active)return;
    const country=countryByTag.get(active);
    const selected=docs.filter(e=>tagsFor(e,byId).includes(active));
    if(!selected.length)return;
    const strip=document.createElement('div');strip.className='v52-diplomacy-strip';
    strip.innerHTML=`<div class="v52-diplomacy-strip-label">Documents RP</div><div class="v52-diplomacy-bubbles">${selected.map(e=>`<button type="button" class="v52-diplomacy-bubble" data-doc-id="${esc(e.id)}"><span class="v52-diplomacy-bubble-icon">✉</span><span><span>${esc(typeLabel(e.entry_type))} · ${esc(dateLabel(e))}</span><strong>${esc(e.title||'Document diplomatique')}</strong></span></button>`).join('')}</div>`;
    const target=$('.v52-country-timeline-shell',timeline)||$('.v52-country-detail',timeline);target?.insertAdjacentElement('beforebegin',strip);
    $$('.v52-diplomacy-bubble',strip).forEach(b=>b.addEventListener('click',()=>openDocument(docMap.get(b.dataset.docId),country)));
  };

  let scheduled=false;
  const schedule=()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})};
  new MutationObserver(schedule).observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  host.addEventListener('click',e=>{if(e.target.closest('.v52-country-tabs button'))setTimeout(render,0)});
  schedule();
}

loadCss();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootDiplomacyTimeline);else bootDiplomacyTimeline();
