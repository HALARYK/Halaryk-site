import { CONFIG, BACKEND_CONFIGURED } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ROOT=new URL("./",import.meta.url);
const asset=p=>new URL(p,ROOT).href;

function loadCss(){
  if(document.querySelector('link[data-v52-feedback]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=new URL('v5.2-feedback.css',ROOT).href;link.dataset.v52Feedback='1';document.head.appendChild(link);
}

function improveOverview(){
  const story=$('.v52-overview-story');
  if(!story||story.dataset.feedbackReady)return;
  story.dataset.feedbackReady='1';
  const aside=$('aside',story);
  if(aside) aside.innerHTML='<strong>PUBLICATION DIFFÉRÉE</strong><span>Les données récentes restent volontairement cachées pour préserver la diplomatie, la découverte et le principe no-ledger.</span>';
}

let nationPage=0;
function nationPageSize(){return innerWidth<620?1:innerWidth<900?2:4}
function renderNationCarousel(){
  const grid=$('#event-nations-grid');
  if(!grid)return;
  const cards=$$('.v52-nation-card',grid);
  if(cards.length<5)return;
  if(grid.dataset.carouselReady){
    const pageSize=nationPageSize();
    const maxPage=Math.max(0,Math.ceil(cards.length/pageSize)-1);
    nationPage=Math.min(nationPage,maxPage);
    cards.forEach((card,i)=>card.classList.toggle('v52-nation-hidden',i<nationPage*pageSize||i>=Math.min(cards.length,(nationPage+1)*pageSize)));
    const prev=$('.v52-nation-prev',grid),next=$('.v52-nation-next',grid),count=$('.v52-nation-count',grid);
    if(prev)prev.disabled=nationPage===0;
    if(next)next.disabled=nationPage===maxPage;
    if(count)count.textContent=`${nationPage+1} / ${maxPage+1}`;
    return;
  }
  grid.dataset.carouselReady='1';
  grid.classList.add('v52-nations-carousel');
  const prev=document.createElement('button');prev.type='button';prev.className='v52-nation-arrow v52-nation-prev';prev.setAttribute('aria-label','Nations précédentes');prev.textContent='‹';
  const next=document.createElement('button');next.type='button';next.className='v52-nation-arrow v52-nation-next';next.setAttribute('aria-label','Nations suivantes');next.textContent='›';
  const count=document.createElement('span');count.className='v52-nation-count';
  const hint=document.createElement('span');hint.className='v52-nation-hint';hint.textContent='7 nations · navigation par groupes';
  grid.prepend(prev);grid.append(next,count,hint);
  prev.addEventListener('click',()=>{nationPage=Math.max(0,nationPage-1);renderNationCarousel()});
  next.addEventListener('click',()=>{nationPage+=1;renderNationCarousel()});
  renderNationCarousel();
}

const crestByTag={CAS:'assets/nations/nation-castille.svg',ENG:'assets/nations/nation-angleterre.svg',LAN:'assets/nations/nation-florence.svg',BRA:'assets/nations/nation-brandebourg.svg',HAB:'assets/nations/nation-autriche.svg',TUR:'assets/nations/nation-ottomans.svg',MOS:'assets/nations/nation-moscovie.svg'};
const tagOrder=['CAS','ENG','LAN','BRA','HAB','TUR','MOS'];
const typeLabel={guerre:'Guerre',dynastie:'Dynastie',union_personnelle:'Union personnelle','désastre':'Désastre',religion:'Religion',politique:'Politique',autre:'Événement'};
const typeIcon={guerre:'⚔',dynastie:'♛',union_personnelle:'◆','désastre':'!',religion:'✝',politique:'✦',autre:'•'};
const diplomacyTypes=new Set(['diplomatie','congrès','traité','déclaration','correspondance']);
let timelineReady=false;

function entryTags(entry,participantsById){
  const tags=new Set();
  const owner=entry.participant_id?participantsById.get(entry.participant_id):null;
  if(owner?.participant_key)tags.add(owner.participant_key);
  (entry.data?.participants||[]).forEach(tag=>tags.add(tag));
  (entry.data?.subjects||[]).forEach(tag=>tags.add(tag));
  return [...tags];
}
function kindOf(entry){return typeLabel[entry.entry_type]?entry.entry_type:'autre'}
function entryNode(entry){
  const kind=kindOf(entry);
  const label=entry.world_year||entry.world_date_label||'—';
  return `<button type="button" class="v52-country-node" data-entry-id="${esc(entry.id)}"><span class="v52-country-year">${esc(label)}</span><span class="v52-country-dot">${typeIcon[kind]||'•'}</span><span class="v52-country-kind">${esc(typeLabel[kind]||'Événement')}</span><strong>${esc(entry.title)}</strong></button>`;
}
function detailMarkup(entry,countryName){
  const kind=kindOf(entry);
  return `<div class="v52-country-detail-meta"><span>${typeIcon[kind]||'•'} ${esc(typeLabel[kind]||'Événement')}</span><span>${esc(entry.world_date_label||entry.world_year||'Date non précisée')}</span><span>${esc(countryName)}</span></div><h3>${esc(entry.title)}</h3><p>${esc(entry.summary||entry.body||'Fait historique enregistré dans la campagne.')}</p>`;
}

async function buildCountryTimeline(){
  if(timelineReady||document.body.dataset.eventSlug!=='ppo-europe'||!BACKEND_CONFIGURED)return;
  const host=$('#event-timeline');if(!host)return;
  timelineReady=true;
  const db=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});
  const {data:event}=await db.from('site_events').select('id').eq('slug','ppo-europe').maybeSingle();
  if(!event){timelineReady=false;return}
  const [{data:participants},{data:entries}]=await Promise.all([
    db.from('site_event_participants').select('id,participant_key,player_name,title,sort_order').eq('event_id',event.id).eq('public',true).order('sort_order'),
    db.from('site_event_entries').select('*').eq('event_id',event.id).eq('public',true).lte('world_year',1481).order('world_year').order('sort_order')
  ]);
  const ps=(participants||[]).filter(p=>tagOrder.includes(p.participant_key)).sort((a,b)=>tagOrder.indexOf(a.participant_key)-tagOrder.indexOf(b.participant_key));
  const pById=new Map(ps.map(p=>[p.id,p]));
  const es=(entries||[]).filter(e=>!diplomacyTypes.has(e.entry_type));
  const entryMap=new Map(es.map(e=>[String(e.id),e]));
  let activeTag=ps.find(p=>p.participant_key==='CAS')?.participant_key||ps[0]?.participant_key;

  const render=()=>{
    const p=ps.find(x=>x.participant_key===activeTag)||ps[0];
    const filtered=es.filter(e=>entryTags(e,pById).includes(activeTag));
    host.className='v52-country-timeline';
    host.innerHTML=`<div class="v52-country-tabs">${ps.map(x=>`<button type="button" class="${x.participant_key===activeTag?'active':''}" data-country="${x.participant_key}"><img src="${asset(crestByTag[x.participant_key])}" alt=""><span>${esc(x.title)}</span></button>`).join('')}</div><div class="v52-country-range"><strong>${esc(p?.title||'Nation')} · 1444 → 1481</strong><span>La chronologie publique s’arrête à la fin de la Session I. La session suivante sera ajoutée après sa mise en archive.</span></div>${filtered.length?`<div class="v52-country-timeline-shell"><div class="v52-country-track">${filtered.map(entryNode).join('')}</div></div><article class="v52-country-detail" id="v52-country-detail"></article>`:'<div class="empty-state"><strong>Aucun fait public enregistré pour cette nation avant 1481.</strong></div>'}`;
    $$('.v52-country-tabs button',host).forEach(button=>button.addEventListener('click',()=>{activeTag=button.dataset.country;render()}));
    const nodes=$$('.v52-country-node',host);const detail=$('#v52-country-detail',host);
    const select=node=>{if(!node||!detail)return;nodes.forEach(n=>n.classList.toggle('active',n===node));detail.innerHTML=detailMarkup(entryMap.get(node.dataset.entryId),p?.title||activeTag)};
    nodes.forEach(node=>node.addEventListener('click',()=>select(node)));
    select(nodes[0]);
  };
  render();
}

function observeDynamic(){
  const observer=new MutationObserver(()=>{improveOverview();renderNationCarousel();buildCountryTimeline()});
  observer.observe(document.body,{childList:true,subtree:true});
  improveOverview();renderNationCarousel();buildCountryTimeline();
  addEventListener('resize',()=>renderNationCarousel(),{passive:true});
}

loadCss();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeDynamic);else observeDynamic();
