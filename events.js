import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ROOT=new URL("./",import.meta.url);
const asset=p=>new URL(p,ROOT).href;
const year=v=>v?String(v).slice(0,4):"—";
const fmt=(v,d=0)=>v===null||v===undefined||v===""||!Number.isFinite(Number(v))?"—":new Intl.NumberFormat("fr-FR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(Number(v));
const pct=(a,b)=>{a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b)||a===0)return"—";const p=(b-a)/a*100;return`${p>=0?"+":""}${fmt(p,1)} %`};
const delta=(a,b,key,d=0)=>{const x=Number(a?.[key]),y=Number(b?.[key]);if(!Number.isFinite(x)||!Number.isFinite(y))return"";const v=y-x;return`${v>=0?"+":""}${fmt(v,d)}`};

let db=null;
let participantMap=new Map();
let activeEvents=[];
let activeIndex=0;

const crestByTag={CAS:"assets/nations/nation-castille.svg",ENG:"assets/nations/nation-angleterre.svg",LAN:"assets/nations/nation-florence.svg",BRA:"assets/nations/nation-brandebourg.svg",HAB:"assets/nations/nation-autriche.svg",TUR:"assets/nations/nation-ottomans.svg",MOS:"assets/nations/nation-moscovie.svg"};
const tagOrder=["CAS","ENG","LAN","BRA","HAB","TUR","MOS"];
const kindLabel={guerre:"Guerre",dynastie:"Dynastie",union_personnelle:"Union personnelle","désastre":"Désastre",religion:"Religion",politique:"Politique",autre:"Événement"};
const kindIcon={guerre:"⚔",dynastie:"♛",union_personnelle:"◆","désastre":"!",religion:"✝",politique:"✦",autre:"•"};
const diplomaticTypes=new Set(["diplomatie","congrès","traité","déclaration","correspondance"]);
const publicEndYear="1481";

const manualCastile=[
  {id:"cas-infantes-v52",entry_type:"politique",title:"Crise des Infants d’Aragon",world_year:null,world_date_label:"Session I · date exacte à consolider",summary:"Événement intérieur majeur signalé pendant la première session de la Castille. La date précise sera consolidée depuis la sauvegarde de fin de session.",sort_order:998,data:{participants:["CAS"]}},
  {id:"cas-coup-v52",entry_type:"politique",title:"Coup d’État / crise de cour en Castille",world_year:null,world_date_label:"Session I · événement à confirmer",summary:"Crise politique importante signalée pendant la première session. Elle reste affichée comme événement à confirmer afin de ne pas inventer de date ou d’intitulé mécanique.",sort_order:999,data:{participants:["CAS"]}}
];

function eventUrl(e){return e.slug==="ppo-europe"?"chroniques-europe/":`fiche/?slug=${encodeURIComponent(e.slug)}`}
function eventHref(e,fromHome=false){return fromHome?`evenements/${eventUrl(e)}`:eventUrl(e)}
function campaignTitle(e){return e.slug==="ppo-europe"?"Chroniques de l’Europe":(e.title||"Événement HALARYK")}
function campaignSubtitle(e){return e.slug==="ppo-europe"?"Campagne multijoueur RP sur Europa Universalis IV":(e.subtitle||e.game_name||"")}
function crest(p){const path=crestByTag[p?.participant_key];return path?asset(path):""}
function sessionsCount(e){const n=Number(e?.metadata?.current_session);return Number.isFinite(n)&&n>0?n:2}
function participantsFor(eventId){return participantMap.get(eventId)||[]}

function playerTile(p){const img=crest(p);return `<div class="v52-player">${img?`<img src="${img}" alt="${esc(p.title)}">`:""}<div><b>${esc(p.player_name||p.title)}</b><span>${esc(p.title)}</span></div></div>`}
function spotlight(e,fromHome=false){
  const players=participantsFor(e.id);
  return `<article class="v52-campaign-card ${e.slug==="ppo-europe"?"v52-map-card":""}">
    <div class="v52-campaign-card-copy">
      <p class="eyebrow">LE GRAND RENDEZ-VOUS DU MOMENT</p>
      <h3>${esc(campaignTitle(e))}</h3>
      <p class="v52-campaign-subtitle">${esc(campaignSubtitle(e))}</p>
      <p class="v52-campaign-summary">Sept joueurs réécrivent l’histoire de l’Europe dans une campagne vivante, entre guerres, alliances, crises et diplomatie. Une autre Europe est possible.</p>
      <div class="v52-campaign-pillars">
        <div><span>⚔</span><b>Grande stratégie</b><small>Diplomatie · guerre · économie</small></div>
        <div><span>♙</span><b>Campagne multijoueur RP</b><small>Sept joueurs, sept nations</small></div>
        <div><span>▣</span><b>1444 → 1821</b><small>Près de quatre siècles d’histoire</small></div>
        <div><span>✦</span><b>Europe alternative</b><small>Un monde façonné par vos choix</small></div>
      </div>
    </div>
    <div class="v52-campaign-card-bottom">
      <div class="v52-campaign-players"><p>LES 7 NATIONS EN JEU</p><div class="v52-player-row">${players.map(playerTile).join("")}</div></div>
      <div class="v52-campaign-metrics">
        <div><strong>1444 → ${year(e.world_current_date)}</strong><span>Période jouée</span></div>
        <div><strong>${sessionsCount(e)}</strong><span>Sessions terminées</span></div>
        <div><strong>${players.length||7}</strong><span>Nations jouées</span></div>
        <div><strong>${publicEndYear}</strong><span>Chronologie publique</span></div>
      </div>
      <a class="button button-primary v52-campaign-cta" href="${eventHref(e,fromHome)}">Découvrir la campagne →</a>
    </div>
  </article>`;
}

async function loadParticipantMap(events){
  const ids=(events||[]).map(e=>e.id);participantMap=new Map();if(!ids.length)return;
  const {data,error}=await db.from("site_event_participants").select("id,event_id,participant_key,player_name,title,sort_order").in("event_id",ids).eq("public",true).order("sort_order");
  if(error)return;
  for(const p of data||[]){if(!participantMap.has(p.event_id))participantMap.set(p.event_id,[]);participantMap.get(p.event_id).push(p)}
}

async function loadHomeFeature(){
  const box=$("#home-feature-event");if(!box)return;
  const {data,error}=await db.from("site_events").select("*").eq("featured",true).eq("status","active").order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(error||!data)return;
  await loadParticipantMap([data]);box.innerHTML=spotlight(data,true);
}

function renderEventsCarousel(){
  const stage=$("#events-active-grid");if(!stage)return;
  if(!activeEvents.length){stage.innerHTML='<div class="empty-state"><strong>Aucun événement actif</strong></div>';return}
  activeIndex=Math.max(0,Math.min(activeIndex,activeEvents.length-1));stage.innerHTML=spotlight(activeEvents[activeIndex],false);
  const prev=$("#events-prev"),next=$("#events-next"),counter=$("#events-carousel-counter");
  [prev,next].forEach(b=>b?.classList.toggle("hidden",activeEvents.length<2));if(counter)counter.textContent=activeEvents.length>1?`${activeIndex+1} / ${activeEvents.length}`:"";
}

async function loadEventsIndex(){
  const active=$("#events-active-grid"),archives=$("#events-archive-grid"),archiveSection=$("#events-archive-section");if(!active||!archives)return;
  const {data,error}=await db.from("site_events").select("*").in("status",["active","archived"]).order("featured",{ascending:false}).order("created_at",{ascending:false});if(error)return;
  const events=data||[];await loadParticipantMap(events);activeEvents=events.filter(e=>e.status==="active");renderEventsCarousel();
  $("#events-prev")?.addEventListener("click",()=>{activeIndex=(activeIndex-1+activeEvents.length)%activeEvents.length;renderEventsCarousel()});
  $("#events-next")?.addEventListener("click",()=>{activeIndex=(activeIndex+1)%activeEvents.length;renderEventsCarousel()});
  const old=events.filter(e=>e.status==="archived");if(!old.length){archiveSection?.classList.add("hidden");return}
  archiveSection?.classList.remove("hidden");archives.innerHTML=old.map(e=>`<article class="event-archive-card"><p class="eyebrow">ARCHIVE</p><h3>${esc(campaignTitle(e))}</h3><p>${esc(e.summary||"")}</p><a class="button button-ghost" href="${eventUrl(e)}">Revoir l’événement →</a></article>`).join("");
}

function nationStat(label,value,change=""){return `<div class="v52-nation-stat"><span>${label}</span><b>${value}</b>${change?`<small>${change}</small>`:""}</div>`}
function snapshotBadge(snapshot){
  const n=Number(snapshot?.session_number);
  if(n===0)return "DÉBUT DE CAMPAGNE";
  if(Number.isFinite(n)&&n>0)return `FIN SESSION ${["","I","II","III","IV","V"][n]||n}`;
  return snapshot?.label||"RELEVÉ";
}
function techDelta(a,b){
  const aa=a?.technologies||{},bb=b?.technologies||{};
  const d=k=>{const x=Number(aa[k]),y=Number(bb[k]);if(!Number.isFinite(x)||!Number.isFinite(y))return "—";const v=y-x;return `${v>=0?"+":""}${v}`};
  return `${d("administrative")} / ${d("diplomatic")} / ${d("military")}`;
}
function nationCard(p,start,end,startSnapshot,endSnapshot){
  const a=start?.stats||{},b=end?.stats||{},tech=b.technologies||{};const annualA=Number(a.annual_gross_income),annualB=Number(b.annual_gross_income),img=crest(p);
  const startYear=year(startSnapshot?.snapshot_date),endYear=year(endSnapshot?.snapshot_date);
  return `<article class="v52-nation-card" data-nation="${esc(p.participant_key||"")}">
    <div class="v52-nation-head">${img?`<img src="${img}" alt="Emblème de ${esc(p.title)}">`:""}<div><h3>${esc(p.title)}</h3><p>${esc(p.player_name||"")}</p></div></div>
    <div class="v52-nation-period"><strong>${startYear} → ${endYear}</strong><span>${esc(snapshotBadge(endSnapshot))}</span></div>
    <div class="v52-nation-stats">
      ${nationStat("Provinces",fmt(b.province_count),delta(a,b,"province_count"))}
      ${nationStat("Développement",fmt(b.development),delta(a,b,"development"))}
      ${nationStat("Revenu brut",`${fmt(annualB,1)} ¤`,pct(annualA,annualB))}
      ${nationStat("Manpower max",fmt(Number(b.max_manpower)*1000),delta({v:Number(a.max_manpower)*1000},{v:Number(b.max_manpower)*1000},"v"))}
      ${nationStat("Armée",`${fmt(b.regiment_count)} rég.`,delta(a,b,"regiment_count"))}
      ${nationStat("Flotte",`${fmt(b.ship_count)} nav.`,delta(a,b,"ship_count"))}
      ${nationStat("Technologies",`${tech.administrative??"—"} / ${tech.diplomatic??"—"} / ${tech.military??"—"}`,techDelta(a,b))}
      ${nationStat("Pertes cumulées",fmt(b.war_losses),delta(a,b,"war_losses"))}
      ${nationStat("Guerres",fmt(b.wars_participated),delta(a,b,"wars_participated"))}
    </div>
  </article>`;
}

function renderNationComparison(host,participants,snapshots,statsMap,startIndex,endIndex){
  const start=snapshots[startIndex],end=snapshots[endIndex];if(!start||!end)return;
  host.innerHTML=participants.map(p=>nationCard(p,statsMap.get(`${start.id}:${p.id}`),statsMap.get(`${end.id}:${p.id}`),start,end)).join("");
  initNationCarousel(host);
}
function initNationComparison(host,participants,snapshots,statsMap){
  if(!host||snapshots.length<2)return;
  let startIndex=0,endIndex=snapshots.length-1;
  let picker=host.previousElementSibling;
  if(!picker?.classList?.contains("v52-snapshot-compare")){
    picker=document.createElement("div");
    picker.className="v52-snapshot-compare";
    host.before(picker);
  }
  const draw=()=>{
    const buttons=(role,selected)=>snapshots.map((s,i)=>`<button type="button" data-snapshot-role="${role}" data-snapshot-index="${i}" class="${i===selected?"active":""}" ${role==="start"&&i>=endIndex?"disabled":role==="end"&&i<=startIndex?"disabled":""}><strong>${year(s.snapshot_date)}</strong><small>${esc(snapshotBadge(s))}</small></button>`).join("");
    picker.innerHTML=`<div class="v52-snapshot-compare-copy"><p class="eyebrow">ÉVOLUTION</p><h3>Comparer deux relevés</h3><p>Choisis un point de départ puis un point d’arrivée. Les écarts affichés dans chaque fiche sont recalculés entre ces deux dates.</p></div><div class="v52-snapshot-pickers"><div><span>DE</span><div>${buttons("start",startIndex)}</div></div><i>→</i><div><span>À</span><div>${buttons("end",endIndex)}</div></div></div>`;
    picker.querySelectorAll("[data-snapshot-role]").forEach(btn=>btn.addEventListener("click",()=>{
      const i=Number(btn.dataset.snapshotIndex);
      if(btn.dataset.snapshotRole==="start"){startIndex=i;if(startIndex>=endIndex)endIndex=Math.min(snapshots.length-1,startIndex+1)}
      else{endIndex=i;if(endIndex<=startIndex)startIndex=Math.max(0,endIndex-1)}
      draw();renderNationComparison(host,participants,snapshots,statsMap,startIndex,endIndex);
    }));
  };
  draw();renderNationComparison(host,participants,snapshots,statsMap,startIndex,endIndex);
}

function initNationCarousel(host){
  const cards=$$(".v52-nation-card",host);if(!cards.length)return;
  host.className="v52-nations-carousel";
  const prev=document.createElement("button"),next=document.createElement("button"),status=document.createElement("span");
  prev.type=next.type="button";prev.className="v52-nation-arrow v52-nation-prev";next.className="v52-nation-arrow v52-nation-next";prev.textContent="‹";next.textContent="›";prev.setAttribute("aria-label","Nations précédentes");next.setAttribute("aria-label","Nations suivantes");status.className="v52-nation-count";
  host.prepend(prev);host.append(next,status);
  let page=0;
  const pageSize=()=>innerWidth<650?1:innerWidth<1050?2:4;
  const render=()=>{const size=pageSize(),max=Math.max(0,Math.ceil(cards.length/size)-1);page=Math.min(page,max);cards.forEach((card,i)=>card.classList.toggle("v52-nation-hidden",i<page*size||i>=(page+1)*size));prev.disabled=page===0;next.disabled=page===max;status.textContent=`${page+1} / ${max+1}`};
  prev.addEventListener("click",()=>{page=Math.max(0,page-1);render()});next.addEventListener("click",()=>{page+=1;render()});addEventListener("resize",render,{passive:true});render();
}

function overviewMarkup(event,participants,chapters){
  const sessions=chapters.filter(c=>c.kind==="session"&&c.status==="complete").length||sessionsCount(event);
  return `<div class="v52-overview">
    <div class="v52-overview-title"><p class="eyebrow">APERÇU</p><h2>Comprendre la campagne</h2><p>Europa Universalis IV est un jeu de grande stratégie couvrant la période 1444–1821. Ici, sept joueurs incarnent chacun une puissance et écrivent une histoire commune faite de diplomatie, de guerres, d’économie et de décisions politiques.</p></div>
    <div class="v52-overview-stats">
      <div><span>Campagne</span><strong>1444 → ${year(event.world_current_date)}</strong><small>Période jouée</small></div>
      <div><span>Sessions</span><strong>${sessions}</strong><small>Sessions terminées</small></div>
      <div><span>Nations</span><strong>${participants.length||7}</strong><small>Puissances jouées</small></div>
      <div><span>Statistiques</span><strong>${year(event.public_snapshot_date)}</strong><small>Dernier relevé public</small></div>
    </div>
    <article class="v52-overview-story v52-overview-story-final">
      <div class="v52-overview-copy"><h3>Une grande stratégie, des histoires humaines</h3><p>La partie se déroule sur plusieurs sessions et se prolonge entre elles par un véritable RP diplomatique : alliances, rivalités, traités, congrès et négociations. Le but n’est pas d’afficher un simple ledger, mais de raconter l’évolution de cette Europe alternative.</p><p>Les relevés statistiques publics couvrent désormais <strong>1444</strong>, <strong>1481</strong> et <strong>${year(event.public_snapshot_date)}</strong>. L’onglet Nations permet de comparer librement deux de ces dates. La chronologie narrative reste publiée séparément afin de ne rendre visibles que les événements retenus.</p></div>
      <aside class="v52-publication-note"><strong>PUBLICATION DIFFÉRÉE</strong><span>Les données récentes restent cachées pour préserver la diplomatie, la découverte et la règle « no ledger ».</span></aside>
    </article>
  </div>`;
}

function entryTags(entry,participantsById){
  const tags=new Set();const owner=entry.participant_id?participantsById.get(entry.participant_id):null;if(owner?.participant_key)tags.add(owner.participant_key);(entry.data?.participants||[]).forEach(t=>tags.add(t));(entry.data?.subjects||[]).forEach(t=>tags.add(t));return[...tags]
}
function kindOf(entry){return kindLabel[entry.entry_type]?entry.entry_type:"autre"}
function countryNode(entry){const kind=kindOf(entry);const label=entry.world_year||entry.world_date_label||"Session I";return `<button type="button" class="v52-country-node" data-entry-id="${esc(entry.id)}"><span class="v52-country-year">${esc(label)}</span><span class="v52-country-dot">${kindIcon[kind]||"•"}</span><span class="v52-country-kind">${esc(kindLabel[kind]||"Événement")}</span><strong>${esc(entry.title)}</strong></button>`}
function countryDetail(entry,country){const kind=kindOf(entry);return `<div class="v52-country-detail-meta"><span>${kindIcon[kind]||"•"} ${esc(kindLabel[kind]||"Événement")}</span><span>${esc(entry.world_date_label||entry.world_year||"Session I")}</span><span>${esc(country.title)}</span></div><h3>${esc(entry.title)}</h3><p>${esc(entry.summary||entry.body||"Fait historique enregistré dans la campagne.")}</p>`}
function renderCountryTimeline(host,participants,entries){
  const ps=participants.filter(p=>tagOrder.includes(p.participant_key)).sort((a,b)=>tagOrder.indexOf(a.participant_key)-tagOrder.indexOf(b.participant_key));const byId=new Map(ps.map(p=>[p.id,p]));
  const publicEntries=entries.filter(e=>!diplomaticTypes.has(e.entry_type)&&Number(e.world_year||9999)<=1481);const all=[...publicEntries,...manualCastile];const entryMap=new Map(all.map(e=>[String(e.id),e]));let active="CAS";
  const render=()=>{const country=ps.find(p=>p.participant_key===active)||ps[0];if(!country)return;const filtered=all.filter(e=>entryTags(e,byId).includes(country.participant_key)).sort((a,b)=>(Number(a.world_year||9998)-Number(b.world_year||9998))||(Number(a.sort_order||0)-Number(b.sort_order||0)));
    host.className="v52-country-timeline";host.innerHTML=`<div class="v52-country-tabs">${ps.map(p=>`<button type="button" class="${p.participant_key===country.participant_key?"active":""}" data-country="${p.participant_key}"><img src="${crest(p)}" alt=""><span><b>${esc(p.title)}</b><small>${esc(p.player_name||"")}</small></span></button>`).join("")}</div><div class="v52-country-range"><strong>${esc(country.title)} · 1444 → 1481</strong><span>Seule la Session I est publique. La Session II sera ajoutée après la session suivante.</span></div>${filtered.length?`<div class="v52-country-timeline-shell"><div class="v52-country-track">${filtered.map(countryNode).join("")}</div></div><article class="v52-country-detail"></article>`:'<div class="empty-state"><strong>Aucun fait public enregistré pour cette nation avant 1481.</strong></div>'}`;
    $$(".v52-country-tabs button",host).forEach(btn=>btn.addEventListener("click",()=>{active=btn.dataset.country;render()}));const nodes=$$(".v52-country-node",host),detail=$(".v52-country-detail",host);const select=node=>{if(!node||!detail)return;nodes.forEach(n=>n.classList.toggle("active",n===node));detail.innerHTML=countryDetail(entryMap.get(node.dataset.entryId),country)};nodes.forEach(n=>n.addEventListener("click",()=>select(n)));select(nodes[0]);
  };render();
}

function diplomacyCard(e,participantsById){const p=e.participant_id?participantsById.get(e.participant_id):null,img=crest(p);return `<article class="v52-diplomacy-card"><div class="v52-diplomacy-head">${img?`<img src="${img}" alt="${esc(p.title)}">`:""}<div><b>${esc(p?.title||"Diplomatie")}</b><span>${esc((e.entry_type||"déclaration").replace("_"," "))}${e.world_date_label?` · ${esc(e.world_date_label)}`:""}</span></div></div><h3>${esc(e.title)}</h3><p>${esc(e.summary||"")}</p>${e.body?`<details><summary>Lire le texte complet</summary><p>${esc(e.body)}</p></details>`:""}</article>`}

async function loadEventDetail(){
  const slug=document.body.dataset.eventSlug||new URLSearchParams(location.search).get("slug");if(!slug)return;
  const {data:event,error}=await db.from("site_events").select("*").eq("slug",slug).maybeSingle();if(error||!event)return;
  const [pr,ch,sn,en,me]=await Promise.all([
    db.from("site_event_participants").select("*").eq("event_id",event.id).eq("public",true).order("sort_order"),
    db.from("site_event_chapters").select("*").eq("event_id",event.id).eq("public",true).order("sort_order"),
    db.from("site_event_snapshots").select("*").eq("event_id",event.id).eq("public",true).order("snapshot_date"),
    db.from("site_event_entries").select("*").eq("event_id",event.id).eq("public",true).order("world_year",{ascending:true,nullsFirst:false}).order("sort_order"),
    db.from("site_event_media").select("*").eq("event_id",event.id).eq("public",true).order("sort_order")
  ]);
  const participants=pr.data||[],chapters=ch.data||[],snapshots=sn.data||[],entries=en.data||[],media=me.data||[],participantsById=new Map(participants.map(p=>[p.id,p]));
  const hero=$(".event-hero");if(hero){hero.classList.add("v52-event-hero-clean");const inner=$(".event-hero-inner",hero);if(inner)inner.innerHTML=`<p class="eyebrow v52-event-hero-kicker">CAMPAGNE MULTIJOUEUR RP</p><p class="v52-event-game">EUROPA UNIVERSALIS IV</p><h1>${esc(campaignTitle(event))}</h1><p class="v52-event-hero-lead">Une campagne où chaque décision compte, mais où le temps lui-même garde ses secrets.</p>`}
  const overview=$("#apercu .section-shell");if(overview)overview.innerHTML=overviewMarkup(event,participants,chapters);
  const snapshotIds=snapshots.map(s=>s.id);let stats=[];if(snapshotIds.length){const r=await db.from("site_event_snapshot_stats").select("*").in("snapshot_id",snapshotIds);stats=r.data||[]}
  const statsMap=new Map(stats.map(s=>[`${s.snapshot_id}:${s.participant_id}`,s])),nations=$("#event-nations-grid");if(nations)initNationComparison(nations,participants,snapshots,statsMap)
  const timeline=$("#event-timeline");if(timeline)renderCountryTimeline(timeline,participants,entries);
  const diplomacy=$("#event-diplomacy"),diplomaticEntries=entries.filter(e=>diplomaticTypes.has(e.entry_type));if(diplomacy){diplomacy.className="v52-diplomacy-grid";diplomacy.innerHTML=diplomaticEntries.length?diplomaticEntries.map(e=>diplomacyCard(e,participantsById)).join(""):'<div class="empty-state"><strong>Aucune prise de parole publique pour le moment</strong><p>Les déclarations, traités et congrès apparaîtront ici une fois publiés.</p></div>'}
  const mediaBox=$("#event-media");if(mediaBox){mediaBox.innerHTML=media.length?media.map(m=>{const title=esc(m.title||"Média de campagne"),caption=m.caption?`<span>${esc(m.caption)}</span>`:"";if(m.media_type==="image")return `<figure class="event-media-card"><img src="${esc(m.url)}" alt="${title}"><figcaption><strong>${title}</strong>${caption}</figcaption></figure>`;if(m.media_type==="audio")return `<figure class="event-media-card event-media-audio"><figcaption><strong>${title}</strong>${caption}</figcaption><audio controls preload="metadata" src="${esc(m.url)}"></audio></figure>`;if(m.media_type==="video")return `<figure class="event-media-card event-media-video"><video controls preload="metadata" src="${esc(m.url)}"></video><figcaption><strong>${title}</strong>${caption}</figcaption></figure>`;return `<a class="event-media-card event-media-link" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer"><figcaption><strong>${title}</strong>${caption}<small>Ouvrir le lien ↗</small></figcaption></a>`}).join(""):'<div class="empty-state"><strong>Galerie à venir</strong><p>Images, cartes, fichiers audio et vidéos de la campagne apparaîtront ici.</p></div>'}
}

async function boot(){if(!BACKEND_CONFIGURED)return;db=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});await Promise.allSettled([loadHomeFeature(),loadEventsIndex(),loadEventDetail()])}
boot();
