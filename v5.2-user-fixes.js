import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const CFG = globalThis.HALARYK_CONFIG || {};
const ROOT = new URL("./", import.meta.url);
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

const CREST = {
  CAS: "assets/nations/nation-castille.svg",
  ENG: "assets/nations/nation-angleterre.svg",
  LAN: "assets/nations/nation-florence.svg",
  BRA: "assets/nations/nation-brandebourg.svg",
  HAB: "assets/nations/nation-autriche.svg",
  TUR: "assets/nations/nation-ottomans.svg",
  MOS: "assets/nations/nation-moscovie.svg"
};
const KIND_LABEL = {
  guerre: "Guerre",
  dynastie: "Dynastie",
  union_personnelle: "Union personnelle",
  "désastre": "Désastre",
  religion: "Religion",
  politique: "Politique",
  autre: "Événement"
};
const KIND_ICON = { guerre:"⚔", dynastie:"♛", union_personnelle:"◆", "désastre":"!", religion:"✝", politique:"✦", autre:"•" };
const DIPLO_TYPES = new Set(["diplomatie","congrès","traité","déclaration","correspondance"]);

function loadCss(){
  if(document.querySelector('link[data-v52-user-fixes]')) return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL('v5.2-user-fixes.css',ROOT).href;
  link.dataset.v52UserFixes='1';
  document.head.append(link);
}

function ensureHeaderSocialsVisible(){
  const holder=$('.v52-header-socials');
  if(holder) holder.classList.add('v52-header-socials-visible');
}

function fixOverview(){
  const story=$('.v52-overview-story');
  if(!story || story.dataset.userFixed) return;
  story.dataset.userFixed='1';
  const aside=$('aside',story);
  if(aside){
    aside.className='v52-publication-note';
    aside.innerHTML='<strong>PUBLICATION DIFFÉRÉE</strong><span>Les données d’une session ne deviennent publiques qu’après la suivante, afin de préserver la diplomatie, la découverte et le « no ledger ».</span>';
  }
}

function setupNationCarousel(){
  const grid=$('#event-nations-grid.v52-nations-grid');
  if(!grid || grid.dataset.carouselReady || $$('.v52-nation-card',grid).length<5) return;
  grid.dataset.carouselReady='1';
  const parent=grid.parentElement;
  if(!parent) return;

  const shell=document.createElement('div');
  shell.className='v52-nation-carousel';
  const viewport=document.createElement('div');
  viewport.className='v52-nation-carousel-viewport';
  const prev=document.createElement('button');
  const next=document.createElement('button');
  prev.type=next.type='button';
  prev.className='v52-nation-carousel-arrow v52-nation-carousel-prev';
  next.className='v52-nation-carousel-arrow v52-nation-carousel-next';
  prev.setAttribute('aria-label','Nations précédentes');
  next.setAttribute('aria-label','Nations suivantes');
  prev.textContent='‹'; next.textContent='›';
  const status=document.createElement('div');
  status.className='v52-nation-carousel-status';

  parent.insertBefore(shell,grid);
  shell.append(prev,viewport,next,status);
  viewport.append(grid);

  let index=0;
  const cards=$$('.v52-nation-card',grid);
  const visibleCount=()=>matchMedia('(max-width:700px)').matches?1:matchMedia('(max-width:1100px)').matches?2:4;
  const maxIndex=()=>Math.max(0,cards.length-visibleCount());
  const render=()=>{
    index=Math.max(0,Math.min(index,maxIndex()));
    const first=cards[index];
    if(first) viewport.scrollTo({left:first.offsetLeft,behavior:'smooth'});
    const shown=Math.min(cards.length,index+visibleCount());
    status.textContent=`${index+1}–${shown} / ${cards.length} nations`;
    prev.disabled=index===0;
    next.disabled=index===maxIndex();
  };
  prev.addEventListener('click',()=>{index=Math.max(0,index-visibleCount());render()});
  next.addEventListener('click',()=>{index=Math.min(maxIndex(),index+visibleCount());render()});
  addEventListener('resize',()=>{index=Math.min(index,maxIndex());render()});
  requestAnimationFrame(render);
}

function eventBelongsTo(entry, participant){
  if(!entry || !participant) return false;
  if(entry.participant_id && entry.participant_id===participant.id) return true;
  const tags=Array.isArray(entry.data?.participants)?entry.data.participants:[];
  if(tags.includes(participant.participant_key)) return true;
  const subjects=Array.isArray(entry.data?.subjects)?entry.data.subjects:[];
  if(subjects.includes(participant.participant_key)) return true;
  return false;
}

function castileManualMilestones(){
  return [
    {
      id:'cas-infantes-manual', entry_type:'politique', title:'Crise des Infants d’Aragon', world_year:null,
      world_date_label:'Session I · date exacte à consolider', _sort:1454,
      summary:'Événement intérieur majeur signalé pendant la première session de la Castille. Il est volontairement conservé dans la chronologie même si la date précise doit encore être consolidée depuis la sauvegarde.'
    },
    {
      id:'cas-coup-manual', entry_type:'politique', title:'Coup d’État / crise de cour en Castille', world_year:null,
      world_date_label:'Session I · date exacte à consolider', _sort:1460,
      summary:'Crise politique importante signalée au cours de la première session. La chronologie la fait apparaître comme repère majeur sans inventer de date précise.'
    }
  ];
}

function normalizeKind(k){ return KIND_LABEL[k]?k:'autre'; }

function timelineNode(entry){
  const kind=normalizeKind(entry.entry_type);
  const label=entry.world_year || entry.world_date_label || 'Session I';
  return `<button class="v52-country-node" type="button" data-entry-id="${esc(entry.id)}" data-kind="${esc(kind)}">
    <span class="v52-country-node-year">${esc(label)}</span>
    <span class="v52-country-node-dot">${KIND_ICON[kind]||'•'}</span>
    <span class="v52-country-node-kind">${esc(KIND_LABEL[kind]||'Événement')}</span>
    <strong>${esc(entry.title)}</strong>
  </button>`;
}

function renderTimelineDetail(entry, country){
  const detail=$('#v52-country-detail');
  if(!detail || !entry) return;
  const kind=normalizeKind(entry.entry_type);
  detail.innerHTML=`<div class="v52-country-detail-top"><span>${KIND_ICON[kind]||'•'} ${esc(KIND_LABEL[kind]||'Événement')}</span><span>${esc(entry.world_date_label || entry.world_year || 'Session I')}</span></div>
  <div class="v52-country-detail-body">
    <div><p class="eyebrow">${esc(country.title)} · ${esc(country.player_name||'')}</p><h3>${esc(entry.title)}</h3><p>${esc(entry.summary || entry.body || 'Fait important de la campagne.')}</p></div>
    <div class="v52-country-detail-emblem"><img src="${new URL(CREST[country.participant_key],ROOT).href}" alt="${esc(country.title)}"></div>
  </div>`;
}

function renderCountryTimeline(container, participants, entries){
  const countryOrder=participants.filter(p=>CREST[p.participant_key]).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
  if(!countryOrder.length) return;
  const byId=new Map(entries.map(e=>[String(e.id),e]));
  for(const extra of castileManualMilestones()) byId.set(extra.id,extra);
  let activeTag=container.dataset.activeCountry || 'CAS';

  const renderCountry=(tag)=>{
    activeTag=tag;
    container.dataset.activeCountry=tag;
    const country=countryOrder.find(p=>p.participant_key===tag) || countryOrder[0];
    let countryEntries=entries.filter(e=>eventBelongsTo(e,country) && !DIPLO_TYPES.has(e.entry_type) && Number(e.world_year||0)<=1481);
    if(tag==='CAS') countryEntries=[...countryEntries,...castileManualMilestones()];
    countryEntries.sort((a,b)=>(Number(a.world_year||a._sort||9999)-Number(b.world_year||b._sort||9999)) || Number(a.sort_order||0)-Number(b.sort_order||0));

    const tabs=countryOrder.map(p=>`<button class="v52-country-tab ${p.participant_key===tag?'active':''}" type="button" data-country="${esc(p.participant_key)}"><img src="${new URL(CREST[p.participant_key],ROOT).href}" alt=""><span><b>${esc(p.title)}</b><small>${esc(p.player_name||'')}</small></span></button>`).join('');
    const nodes=countryEntries.length?countryEntries.map(timelineNode).join(''):'<div class="v52-country-empty">Aucun fait publié pour cette nation sur la Session I.</div>';
    container.innerHTML=`<div class="v52-country-timeline-head"><div class="v52-country-publication"><strong>SESSION I PUBLIQUE · 1444 → 1481</strong><span>La Session II reste volontairement masquée jusqu’à la publication de la session suivante.</span></div></div>
    <div class="v52-country-tabs">${tabs}</div>
    <div class="v52-country-track-shell"><div class="v52-country-track">${nodes}</div></div>
    <article id="v52-country-detail" class="v52-country-detail"></article>`;

    $$('.v52-country-tab',container).forEach(btn=>btn.addEventListener('click',()=>renderCountry(btn.dataset.country)));
    const buttons=$$('.v52-country-node',container);
    const select=(btn)=>{
      buttons.forEach(b=>b.classList.toggle('active',b===btn));
      const e=byId.get(btn?.dataset.entryId);
      if(e) renderTimelineDetail(e,country);
    };
    buttons.forEach(btn=>btn.addEventListener('click',()=>select(btn)));
    select(buttons[0]);
  };
  renderCountry(activeTag);
}

async function installCountryTimeline(){
  if(document.body.dataset.page!=='event' || !CFG.SUPABASE_URL || !CFG.SUPABASE_PUBLISHABLE_KEY) return;
  const db=createClient(CFG.SUPABASE_URL,CFG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});
  const {data:event}=await db.from('site_events').select('id').eq('slug','ppo-europe').maybeSingle();
  if(!event) return;
  const [pr,en]=await Promise.all([
    db.from('site_event_participants').select('id,participant_key,player_name,title,sort_order').eq('event_id',event.id).eq('public',true).order('sort_order'),
    db.from('site_event_entries').select('id,entry_type,title,world_year,world_date_label,summary,body,participant_id,data,sort_order').eq('event_id',event.id).eq('public',true).lte('world_year',1481).order('world_year',{ascending:true,nullsFirst:false}).order('sort_order')
  ]);
  const participants=pr.data||[];
  const entries=en.data||[];
  const timeline=$('#event-timeline');
  if(!timeline) return;

  const apply=()=>{
    if(!timeline.querySelector('.v52-country-tabs')) renderCountryTimeline(timeline,participants,entries);
  };
  const observer=new MutationObserver(()=>requestAnimationFrame(apply));
  observer.observe(timeline,{childList:true,subtree:false});
  setTimeout(apply,350);
  setTimeout(apply,1000);
}

function observeDynamicFixes(){
  const apply=()=>{ensureHeaderSocialsVisible();fixOverview();setupNationCarousel()};
  apply();
  const obs=new MutationObserver(()=>requestAnimationFrame(apply));
  obs.observe(document.body,{childList:true,subtree:true});
}

loadCss();
observeDynamicFixes();
installCountryTimeline().catch(console.error);
