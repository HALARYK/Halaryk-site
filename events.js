import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";

const $=(s,c=document)=>c.querySelector(s);
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtNumber=(v,d=0)=>Number.isFinite(Number(v))?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d}).format(Number(v)):'—';
const year=v=>v?String(v).slice(0,4):'—';
const fmtDate=v=>{if(!v)return'—';try{return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${v}T12:00:00`))}catch{return v}};
const fmtDateTime=v=>{if(!v)return'—';try{return new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return v}};
let supabase=null;

function eventUrl(e){return e.slug==='ppo-europe'?'ppo-europe/':`fiche/?slug=${encodeURIComponent(e.slug)}`}
function eventCard(e,fromHome=false){
  const current=year(e.world_current_date),start=year(e.world_start_date),cutoff=year(e.public_chronicle_cutoff_date);
  const href=fromHome?`evenements/${eventUrl(e)}`:eventUrl(e);
  return `<article class="event-card ${e.featured?'featured':''}">
    <div class="event-card-top"><span class="eyebrow">${e.status==='active'?'ÉVÉNEMENT EN COURS':'ÉVÉNEMENT ARCHIVÉ'}</span><span>${esc(e.game_name||e.event_type||'')}</span></div>
    <h3>${esc(e.title)}</h3>${e.subtitle?`<p class="event-card-subtitle">${esc(e.subtitle)}</p>`:''}
    <p>${esc(e.summary||'')}</p>
    <div class="event-card-facts"><span><strong>${start}</strong> début</span><span><strong>${current}</strong> situation</span><span><strong>${cutoff}</strong> public</span></div>
    <a class="button ${e.status==='active'?'button-primary':'button-ghost'}" href="${href}">${e.status==='active'?'Découvrir':'Revoir'} l’événement →</a>
  </article>`;
}

async function loadHomeFeature(){
  const box=$('#home-feature-event');if(!box||!supabase)return;
  const{data,error}=await supabase.from('site_events').select('*').eq('featured',true).eq('status','active').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error||!data)return;
  $('#featured-event-title') && ($('#featured-event-title').textContent=data.title);
  const copy=$('.featured-event-copy > p:not(.eyebrow):not(.featured-event-game)',box); if(copy)copy.textContent=data.summary||'';
}

async function loadEventsIndex(){
  const active=$('#events-active-grid'),archives=$('#events-archive-grid');if(!active||!archives||!supabase)return;
  const{data,error}=await supabase.from('site_events').select('*').in('status',['active','archived']).order('featured',{ascending:false}).order('created_at',{ascending:false});
  if(error)return;
  const events=data||[],current=events.filter(e=>e.status==='active'),old=events.filter(e=>e.status==='archived');
  active.innerHTML=current.length?current.map(e=>eventCard(e)).join(''):`<div class="empty-state"><strong>Aucun événement actif</strong></div>`;
  archives.innerHTML=old.length?old.map(e=>eventCard(e)).join(''):`<div class="empty-state"><strong>Aucune archive pour le moment</strong><p>Les événements terminés resteront consultables ici.</p></div>`;
}

function statDelta(a,b,key){const x=Number(a?.[key]),y=Number(b?.[key]);if(!Number.isFinite(x)||!Number.isFinite(y))return'';const d=y-x;return `${d>=0?'+':''}${fmtNumber(d,key==='estimated_monthly_income'?1:0)}`}
function nationCard(p,start,end){
  const a=start?.stats||{},b=end?.stats||{},tech=b.technologies||{};
  return `<article class="event-nation-card">
    <div class="event-nation-head"><div><span class="event-tag">${esc(p.participant_key)}</span><h3>${esc(p.title)}</h3><p>${esc(p.player_name||'')}</p></div><span class="event-nation-period">1444 → 1481</span></div>
    <div class="event-nation-stats">
      <div><span>Provinces</span><strong>${fmtNumber(b.province_count)}</strong><small>${statDelta(a,b,'province_count')}</small></div>
      <div><span>Développement</span><strong>${fmtNumber(b.development)}</strong><small>${statDelta(a,b,'development')}</small></div>
      <div><span>Revenu / mois</span><strong>${fmtNumber(b.estimated_monthly_income,1)}</strong><small>${statDelta(a,b,'estimated_monthly_income')}</small></div>
      <div><span>Régiments</span><strong>${fmtNumber(b.regiment_count)}</strong><small>${statDelta(a,b,'regiment_count')}</small></div>
      <div><span>Navires</span><strong>${fmtNumber(b.ship_count)}</strong><small>${statDelta(a,b,'ship_count')}</small></div>
      <div><span>Technologies</span><strong>${tech.administrative??'—'} / ${tech.diplomatic??'—'} / ${tech.military??'—'}</strong><small>Adm · Dip · Mil</small></div>
    </div>
    <details class="event-nation-details"><summary>Comparer les relevés</summary><div class="snapshot-compare"><div><b>1444</b><span>${fmtNumber(a.province_count)} prov.</span><span>${fmtNumber(a.development)} dev.</span><span>${fmtNumber(a.regiment_count)} rég.</span></div><div><b>1481</b><span>${fmtNumber(b.province_count)} prov.</span><span>${fmtNumber(b.development)} dev.</span><span>${fmtNumber(b.regiment_count)} rég.</span></div></div></details>
  </article>`;
}

function entryCard(e){return `<article class="event-entry-card ${e.featured?'featured':''}"><div class="event-entry-meta"><span>${esc((e.entry_type||'événement').toUpperCase())}</span>${e.world_date_label?`<span>${esc(e.world_date_label)}</span>`:''}</div><h3>${esc(e.title)}</h3><p>${esc(e.summary||'')}</p>${e.body?`<details><summary>Lire la suite</summary><p>${esc(e.body)}</p></details>`:''}</article>`}

async function loadEventDetail(){
  const slug=document.body.dataset.eventSlug||new URLSearchParams(location.search).get('slug');if(!slug||!supabase)return;
  const{data:event,error}=await supabase.from('site_events').select('*').eq('slug',slug).maybeSingle();if(error||!event)return;
  const [pr,ch,sn,en,me]=await Promise.all([
    supabase.from('site_event_participants').select('*').eq('event_id',event.id).order('sort_order'),
    supabase.from('site_event_chapters').select('*').eq('event_id',event.id).order('sort_order'),
    supabase.from('site_event_snapshots').select('*').eq('event_id',event.id).order('snapshot_date'),
    supabase.from('site_event_entries').select('*').eq('event_id',event.id).order('sort_order').order('created_at'),
    supabase.from('site_event_media').select('*').eq('event_id',event.id).order('sort_order')
  ]);
  const participants=pr.data||[],chapters=ch.data||[],snapshots=sn.data||[],entries=en.data||[],media=me.data||[];
  const snapshotIds=snapshots.map(s=>s.id);let stats=[];
  if(snapshotIds.length){const r=await supabase.from('site_event_snapshot_stats').select('*').in('snapshot_id',snapshotIds);stats=r.data||[]}
  const statsMap=new Map(stats.map(s=>[`${s.snapshot_id}:${s.participant_id}`,s]));
  const start=snapshots[0],end=snapshots.at(-1);

  $('#event-eyebrow') && ($('#event-eyebrow').textContent=(event.eyebrow||'ÉVÉNEMENT').toUpperCase());
  $('#event-game-name') && ($('#event-game-name').textContent=event.game_name||'');
  $('#event-title') && ($('#event-title').textContent=event.title);
  $('#event-summary') && ($('#event-summary').textContent=event.summary||'');
  $('#event-world-start') && ($('#event-world-start').textContent=year(event.world_start_date));
  $('#event-world-current') && ($('#event-world-current').textContent=year(event.world_current_date));
  $('#event-public-snapshot') && ($('#event-public-snapshot').textContent=year(event.public_snapshot_date));
  $('#event-chronicle-cutoff') && ($('#event-chronicle-cutoff').textContent=year(event.public_chronicle_cutoff_date));
  $('#event-next-session') && event.next_session_at && ($('#event-next-session').textContent=fmtDateTime(event.next_session_at));

  const nations=$('#event-nations-grid');if(nations)nations.innerHTML=participants.length?participants.map(p=>nationCard(p,statsMap.get(`${start?.id}:${p.id}`),statsMap.get(`${end?.id}:${p.id}`))).join(''):`<div class="empty-state"><strong>Aucune nation publiée</strong></div>`;

  const timeline=$('#event-timeline');if(timeline){timeline.innerHTML=chapters.length?chapters.map(c=>{
    const related=entries.filter(e=>e.chapter_id===c.id);
    const range=c.world_start_date?`${year(c.world_start_date)}${c.world_end_date?` → ${year(c.world_end_date)}`:''}`:(c.real_start_date?`${fmtDate(c.real_start_date)}${c.real_end_date&&c.real_end_date!==c.real_start_date?` → ${fmtDate(c.real_end_date)}`:''}`:'');
    return `<article class="event-chapter ${esc(c.kind)} ${esc(c.status)}"><div class="event-chapter-marker"></div><div class="event-chapter-heading"><span>${esc(range)}</span><h3>${esc(c.title)}</h3><p>${esc(c.subtitle||'')}</p></div><div class="event-chapter-entries">${related.length?related.map(entryCard).join(''):`<p class="event-chapter-empty">Les éléments détaillés de cette période sont en cours de validation.</p>`}</div></article>`
  }).join(''):`<div class="empty-state"><strong>Chronologie à venir</strong></div>`}

  const wars=entries.filter(e=>e.entry_type==='guerre');const warBox=$('#event-wars');if(warBox&&wars.length)warBox.innerHTML=wars.map(entryCard).join('');
  const diplo=entries.filter(e=>['diplomatie','congrès','traité','déclaration','correspondance'].includes(e.entry_type));const dipBox=$('#event-diplomacy');if(dipBox&&diplo.length)dipBox.innerHTML=diplo.map(entryCard).join('');
  const mediaBox=$('#event-media');if(mediaBox&&media.length)mediaBox.innerHTML=media.map(m=>{const title=esc(m.title||'Média de campagne'),caption=m.caption?`<span>${esc(m.caption)}</span>`:'';if(m.media_type==='image')return `<figure class="event-media-card"><img src="${esc(m.url)}" alt="${title}" loading="lazy"><figcaption><strong>${title}</strong>${caption}</figcaption></figure>`;return `<a class="event-media-card event-media-link" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer"><div class="event-media-link-mark">${m.media_type==='clip'?'▶':'↗'}</div><figcaption><strong>${title}</strong>${caption}<small>Ouvrir ${m.media_type==='clip'?'le clip':'le lien'} ↗</small></figcaption></a>`}).join('');
}

async function boot(){
  if(!BACKEND_CONFIGURED)return;
  supabase=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  await Promise.all([loadHomeFeature(),loadEventsIndex(),loadEventDetail()]);
}
boot();
