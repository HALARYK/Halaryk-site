import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const num=(v,d=0)=>v===null||v===undefined||v===""?"—":Number.isFinite(Number(v))?new Intl.NumberFormat("fr-FR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(Number(v)):"—";
const pct=(a,b)=>{a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b)||a===0)return"—";const p=(b-a)/a*100;return`${p>=0?"+":""}${num(p,1)} %`};
const year=v=>v?String(v).slice(0,4):"—";
const ROOT=new URL("./",import.meta.url);
const asset=p=>new URL(p,ROOT).href;

let db=null;
let activeEvents=[];
let activeIndex=0;
let participantMap=new Map();

const crestByTag={
  CAS:"assets/nations/nation-castille.svg",
  ENG:"assets/nations/nation-angleterre.svg",
  LAN:"assets/nations/nation-florence.svg",
  BRA:"assets/nations/nation-brandebourg.svg",
  HAB:"assets/nations/nation-autriche.svg",
  TUR:"assets/nations/nation-ottomans.svg",
  MOS:"assets/nations/nation-moscovie.svg"
};

const categoryLabel={
  guerre:"Guerre",
  dynastie:"Dynastie",
  union_personnelle:"Union personnelle",
  "désastre":"Désastre",
  religion:"Religion",
  politique:"Politique",
  autre:"Événement"
};
const categoryIcon={guerre:"⚔",dynastie:"♛",union_personnelle:"◆","désastre":"!",religion:"✝",politique:"✦",autre:"•"};
const diplomaticTypes=new Set(["diplomatie","congrès","traité","déclaration","correspondance"]);

function eventUrl(e){
  return e.slug==="ppo-europe"?"grande-campagne-eu4/":`fiche/?slug=${encodeURIComponent(e.slug)}`;
}
function eventHref(e,fromHome=false){
  return fromHome?`evenements/${eventUrl(e)}`:eventUrl(e);
}
function campaignTitle(e){
  return e.slug==="ppo-europe"?"Grande campagne Europa Universalis IV":(e.title||"Événement HALARYK");
}
function campaignSubtitle(e){
  return e.slug==="ppo-europe"?"Campagne multijoueur RP · 7 joueurs":(e.subtitle||e.game_name||"");
}
function crest(p){
  const path=crestByTag[p?.participant_key];
  return path?asset(path):"";
}
function participantsFor(eventId){
  return participantMap.get(eventId)||[];
}
function coverStyle(e){
  return e.hero_image_url?` style="--cover:url('${esc(e.hero_image_url)}')"`:"";
}

function playerTile(p){
  const img=crest(p);
  return `<div class="v52-player">
    ${img?`<img src="${img}" alt="Emblème de ${esc(p.title)}" loading="lazy">`:""}
    <div>
      <b>${esc(p.player_name||p.title)}</b>
      <span>${esc(p.title)}</span>
      <span class="v52-player-tag">${esc(p.participant_key||"")}</span>
    </div>
  </div>`;
}

function spotlight(e,fromHome=false){
  const players=participantsFor(e.id);
  const hasCover=e.hero_image_url?" has-cover":"";
  const href=eventHref(e,fromHome);
  const current=year(e.world_current_date);
  const cutoff=year(e.public_chronicle_cutoff_date);
  return `<article class="v52-feature-card${hasCover}"${coverStyle(e)}>
    <div class="v52-feature-inner">
      <div class="v52-feature-copy">
        <p class="eyebrow">EUROPA UNIVERSALIS IV</p>
        <h3>${esc(campaignTitle(e))}</h3>
        <p class="v52-feature-subtitle">${esc(campaignSubtitle(e))}</p>
        <p class="v52-feature-summary">Sept joueurs dirigent chacun une puissance dans une partie de grande stratégie où la diplomatie RP, les alliances et les guerres écrivent une Europe alternative.</p>
        <div class="v52-feature-facts">
          <div class="v52-feature-fact"><b>Grande stratégie</b><small>Diplomatie · guerre · économie</small></div>
          <div class="v52-feature-fact"><b>1444 → 1821</b><small>Près de quatre siècles d’histoire</small></div>
          <div class="v52-feature-fact"><b>${players.length||7} joueurs</b><small>Sept puissances européennes</small></div>
          <div class="v52-feature-fact"><b>Partie : ${current}</b><small>Chronologie publique jusqu’en ${cutoff}</small></div>
        </div>
        <a class="button button-primary v52-feature-cta" href="${href}">Découvrir la campagne →</a>
      </div>
      <aside class="v52-feature-players">
        <p>Les nations en jeu</p>
        <div class="v52-player-grid">${players.map(playerTile).join("")}</div>
      </aside>
    </div>
  </article>`;
}

async function loadParticipantMap(events){
  const ids=(events||[]).map(e=>e.id);
  participantMap=new Map();
  if(!ids.length)return;
  const {data,error}=await db.from("site_event_participants")
    .select("id,event_id,participant_key,player_name,title,sort_order")
    .in("event_id",ids).eq("public",true).order("sort_order");
  if(error)return;
  for(const p of data||[]){
    if(!participantMap.has(p.event_id))participantMap.set(p.event_id,[]);
    participantMap.get(p.event_id).push(p);
  }
}

async function loadHomeFeature(){
  const box=$("#home-feature-event");
  if(!box)return;
  const {data,error}=await db.from("site_events").select("*")
    .eq("featured",true).eq("status","active")
    .order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(error||!data)return;
  await loadParticipantMap([data]);
  box.innerHTML=spotlight(data,true);
}

function renderCarousel(){
  const stage=$("#events-active-grid");
  if(!stage)return;
  if(!activeEvents.length){
    stage.innerHTML='<div class="empty-state"><strong>Aucun événement actif</strong></div>';
    return;
  }
  activeIndex=Math.max(0,Math.min(activeIndex,activeEvents.length-1));
  stage.innerHTML=spotlight(activeEvents[activeIndex],false);
  const prev=$("#events-prev"),next=$("#events-next"),counter=$("#events-carousel-counter");
  [prev,next].forEach(b=>b?.classList.toggle("hidden",activeEvents.length<2));
  if(counter)counter.textContent=activeEvents.length>1?`${activeIndex+1} / ${activeEvents.length}`:"";
}

async function loadEventsIndex(){
  const active=$("#events-active-grid");
  const archives=$("#events-archive-grid");
  const archiveSection=$("#events-archive-section");
  if(!active||!archives)return;
  const {data,error}=await db.from("site_events").select("*")
    .in("status",["active","archived"])
    .order("featured",{ascending:false}).order("created_at",{ascending:false});
  if(error)return;
  const events=data||[];
  await loadParticipantMap(events);
  activeEvents=events.filter(e=>e.status==="active");
  renderCarousel();

  $("#events-prev")?.addEventListener("click",()=>{
    if(!activeEvents.length)return;
    activeIndex=(activeIndex-1+activeEvents.length)%activeEvents.length;
    renderCarousel();
  });
  $("#events-next")?.addEventListener("click",()=>{
    if(!activeEvents.length)return;
    activeIndex=(activeIndex+1)%activeEvents.length;
    renderCarousel();
  });

  const old=events.filter(e=>e.status==="archived");
  if(!old.length){
    archiveSection?.classList.add("hidden");
    return;
  }
  archiveSection?.classList.remove("hidden");
  archives.innerHTML=old.map(e=>`<article class="event-archive-card">
    <p class="eyebrow">ARCHIVE</p>
    <h3>${esc(campaignTitle(e))}</h3>
    <p>${esc(e.summary||"")}</p>
    <a class="button button-ghost" href="${eventUrl(e)}">Revoir l’événement →</a>
  </article>`).join("");
}

function delta(a,b,key,d=0){
  const x=Number(a?.[key]),y=Number(b?.[key]);
  if(!Number.isFinite(x)||!Number.isFinite(y))return"";
  const v=y-x;
  return`${v>=0?"+":""}${num(v,d)}`;
}
function stat(label,value,change="",neutral=false){
  return `<div class="v52-stat">
    <span>${label}</span><b>${value}</b>
    ${change?`<small class="${neutral?"is-neutral":""}">${change}</small>`:""}
  </div>`;
}
function nationCard(p,start,end,startYear,endYear){
  const a=start?.stats||{},b=end?.stats||{},tech=b.technologies||{};
  const annualA=Number(a.annual_gross_income),annualB=Number(b.annual_gross_income);
  const img=crest(p);
  return `<article class="v52-nation-card">
    <div class="v52-nation-head">
      ${img?`<img src="${img}" alt="Emblème de ${esc(p.title)}" loading="lazy">`:""}
      <div><span class="event-tag">${esc(p.participant_key)}</span><h3>${esc(p.title)}</h3><p>${esc(p.player_name||"")}</p></div>
      <div class="v52-nation-period"><b>Fin Session I</b><span>${startYear} → ${endYear}</span></div>
    </div>
    <div class="v52-nation-stats">
      ${stat("Provinces",num(b.province_count),delta(a,b,"province_count"))}
      ${stat("Développement",num(b.development),delta(a,b,"development"))}
      ${stat("Revenu brut annuel",`${num(annualB,1)} ¤`,pct(annualA,annualB))}
      ${stat("Manpower maximal",num(Number(b.max_manpower)*1000),delta({v:Number(a.max_manpower)*1000},{v:Number(b.max_manpower)*1000},"v"))}
      ${stat("Armée",`${num(b.regiment_count)} régiments`,delta(a,b,"regiment_count"))}
      ${stat("Flotte",`${num(b.ship_count)} navires`,delta(a,b,"ship_count"))}
      ${stat("Technologies",`${tech.administrative??"—"} / ${tech.diplomatic??"—"} / ${tech.military??"—"}`,"Adm · Dip · Mil",true)}
      ${stat("Pertes cumulées",num(b.war_losses),delta(a,b,"war_losses"))}
      ${stat("Guerres disputées",num(b.wars_participated),delta(a,b,"wars_participated"))}
    </div>
  </article>`;
}

function chapterRange(c){
  if(c.world_start_date)return`${year(c.world_start_date)}${c.world_end_date?` → ${year(c.world_end_date)}`:""}`;
  if(c.real_start_date)return`${c.real_start_date}${c.real_end_date&&c.real_end_date!==c.real_start_date?` → ${c.real_end_date}`:""}`;
  return c.metadata?.display_label||"";
}
function normalizeKind(k="autre"){
  return categoryLabel[k]?k:"autre";
}
function eventDetails(e,participantsById){
  const kind=normalizeKind(e.entry_type);
  const owner=e.participant_id?participantsById.get(e.participant_id):null;
  const date=e.world_date_label||(e.world_year?String(e.world_year):"Date non précisée");
  const involved=(e.data?.participants||[]).map(tag=>`<span class="v52-timeline-country">${esc(tag)}</span>`).join("");
  return `<details class="v52-timeline-event" data-kind="${esc(kind)}">
    <summary>
      <span class="v52-timeline-date">${esc(date)}</span>
      <span class="v52-timeline-kind"><i>${categoryIcon[kind]||"•"}</i>${categoryLabel[kind]||"Événement"}</span>
      <strong class="v52-timeline-title">${esc(e.title)}</strong>
      <span class="v52-timeline-plus">+</span>
    </summary>
    <div class="v52-timeline-body">
      ${owner?`<span class="v52-timeline-country">${esc(owner.title)}</span>`:""}${involved}
      <p>${esc(e.summary||e.body||"Fait historique enregistré dans la sauvegarde de campagne.")}</p>
    </div>
  </details>`;
}
function timelineMarkup(chapters,entries,participantsById){
  let html=`<div class="v52-timeline-toolbar">
    <button class="v52-timeline-filter active" data-filter="all">Tout</button>
    <button class="v52-timeline-filter" data-filter="guerre">⚔ Guerres</button>
    <button class="v52-timeline-filter" data-filter="power">♛ Dynasties & UP</button>
    <button class="v52-timeline-filter" data-filter="désastre">! Désastres</button>
    <button class="v52-timeline-filter" data-filter="politique">✦ Politique</button>
  </div><div class="v52-timeline">`;
  const used=new Set();

  for(const chapter of chapters){
    const related=entries
      .filter(e=>e.chapter_id===chapter.id&&!diplomaticTypes.has(e.entry_type))
      .sort((a,b)=>(Number(a.world_year||9999)-Number(b.world_year||9999))||(Number(a.sort_order||0)-Number(b.sort_order||0)));
    html+=`<div class="v52-chapter-marker" data-chapter="${chapter.id}">
      <b>${esc(chapter.title)}</b>
      <span>${esc(chapterRange(chapter))}${chapter.subtitle?` · ${esc(chapter.subtitle)}`:""}</span>
    </div>`;
    if(related.length){
      for(const e of related){used.add(e.id);html+=eventDetails(e,participantsById)}
    }
  }

  const orphan=entries
    .filter(e=>!used.has(e.id)&&!diplomaticTypes.has(e.entry_type))
    .sort((a,b)=>(Number(a.world_year||9999)-Number(b.world_year||9999))||(Number(a.sort_order||0)-Number(b.sort_order||0)));
  if(orphan.length){
    html+='<div class="v52-chapter-marker"><b>Autres repères</b><span>Événements datés hors chapitre</span></div>';
    html+=orphan.map(e=>eventDetails(e,participantsById)).join("");
  }
  return html+"</div>";
}
function bindTimelineFilters(){
  const buttons=$$(".v52-timeline-filter");
  const events=$$(".v52-timeline-event");
  buttons.forEach(button=>button.addEventListener("click",()=>{
    buttons.forEach(x=>x.classList.toggle("active",x===button));
    const filter=button.dataset.filter;
    events.forEach(event=>{
      const kind=event.dataset.kind;
      const show=filter==="all"||kind===filter||(filter==="power"&&(kind==="dynastie"||kind==="union_personnelle"));
      event.classList.toggle("is-hidden",!show);
    });
    $$(".v52-chapter-marker").forEach(marker=>{
      let n=marker.nextElementSibling,visible=false;
      while(n&&!n.classList.contains("v52-chapter-marker")){
        if(n.classList.contains("v52-timeline-event")&&!n.classList.contains("is-hidden"))visible=true;
        n=n.nextElementSibling;
      }
      marker.classList.toggle("is-empty",!visible);
    });
  }));
}

function diplomacyCard(e,participantsById){
  const p=e.participant_id?participantsById.get(e.participant_id):null;
  const img=crest(p);
  return `<article class="v52-diplomacy-card">
    <div class="v52-diplomacy-head">
      ${img?`<img src="${img}" alt="${esc(p.title)}" loading="lazy">`:""}
      <div><b>${esc(p?.title||"Diplomatie")}</b><span>${esc((e.entry_type||"déclaration").replace("_"," "))}${e.world_date_label?` · ${esc(e.world_date_label)}`:""}</span></div>
    </div>
    <h3>${esc(e.title)}</h3>
    <p>${esc(e.summary||"")}</p>
    ${e.body?`<details><summary>Lire le texte complet</summary><p>${esc(e.body)}</p></details>`:""}
  </article>`;
}

function overviewMarkup(event,participants,chapters){
  const sessions=chapters.filter(c=>c.kind==="session"&&c.status==="complete").length||Number(event.metadata?.current_session||0);
  return `<div class="v52-overview">
    <div class="v52-overview-head">
      <p class="eyebrow">APERÇU DE LA CAMPAGNE</p>
      <h2>Sept puissances font vivre une Europe alternative</h2>
      <p>Europa Universalis IV est un jeu de grande stratégie couvrant la période 1444–1821. Dans cette campagne, ${participants.length||7} joueurs incarnent chacun une puissance et jouent autant la diplomatie que la guerre : alliances, congrès, traités, rivalités et négociations entre les sessions.</p>
    </div>
    <div class="v52-overview-stats">
      <div><span>Situation actuelle</span><strong>${year(event.world_current_date)}</strong><small>Date atteinte dans la partie</small></div>
      <div><span>Sessions terminées</span><strong>${sessions}</strong><small>Sessions multijoueur achevées</small></div>
      <div><span>Dernier relevé public</span><strong>${year(event.public_snapshot_date)}</strong><small>Statistiques volontairement retardées</small></div>
      <div><span>Chronologie publique</span><strong>${year(event.public_chronicle_cutoff_date)}</strong><small>Faits déclassifiés jusqu’à cette date</small></div>
    </div>
    <div class="v52-overview-grid">
      <article class="v52-overview-card"><p class="eyebrow">LE FORMAT</p><h3>Multijoueur, RP et diffusé en stream</h3><p>Les décisions militaires comptent, mais les relations entre joueurs, les déclarations publiques et les accords diplomatiques font partie intégrante de la partie.</p></article>
      <article class="v52-overview-card"><p class="eyebrow">RÈGLE SANS REGISTRE</p><h3>Les données récentes restent cachées</h3><p>Le site publie volontairement les statistiques avec retard afin de ne pas offrir aux joueurs des informations qu’ils ne devraient pas connaître en jeu.</p></article>
    </div>
  </div>`;
}

async function loadEventDetail(){
  const slug=document.body.dataset.eventSlug||new URLSearchParams(location.search).get("slug");
  if(!slug)return;

  const {data:event,error}=await db.from("site_events").select("*").eq("slug",slug).maybeSingle();
  if(error||!event)return;

  const [pr,ch,sn,en,me]=await Promise.all([
    db.from("site_event_participants").select("*").eq("event_id",event.id).eq("public",true).order("sort_order"),
    db.from("site_event_chapters").select("*").eq("event_id",event.id).eq("public",true).order("sort_order"),
    db.from("site_event_snapshots").select("*").eq("event_id",event.id).eq("public",true).order("snapshot_date"),
    db.from("site_event_entries").select("*").eq("event_id",event.id).order("world_year",{ascending:true,nullsFirst:false}).order("sort_order"),
    db.from("site_event_media").select("*").eq("event_id",event.id).eq("public",true).order("sort_order")
  ]);

  const participants=pr.data||[];
  const chapters=ch.data||[];
  const snapshots=sn.data||[];
  const entries=en.data||[];
  const media=me.data||[];
  const participantsById=new Map(participants.map(p=>[p.id,p]));

  const hero=$(".event-hero");
  if(hero){
    hero.classList.add("v52-event-hero-clean");
    const inner=$(".event-hero-inner",hero);
    if(inner)inner.innerHTML=`<p class="eyebrow v52-event-hero-kicker">EUROPA UNIVERSALIS IV · CAMPAGNE MULTIJOUEUR RP</p>
      <h1>${esc(campaignTitle(event))}</h1>
      <p class="v52-event-hero-lead">Sept joueurs, sept puissances et une campagne où la diplomatie RP compte autant que les armées.</p>`;
  }

  const overview=$("#apercu .section-shell");
  if(overview)overview.innerHTML=overviewMarkup(event,participants,chapters);

  const snapshotIds=snapshots.map(s=>s.id);
  let stats=[];
  if(snapshotIds.length){
    const response=await db.from("site_event_snapshot_stats").select("*").in("snapshot_id",snapshotIds);
    stats=response.data||[];
  }
  const statsMap=new Map(stats.map(s=>[`${s.snapshot_id}:${s.participant_id}`,s]));
  const start=snapshots[0],end=snapshots.at(-1);
  const nations=$("#event-nations-grid");
  if(nations){
    nations.className="v52-nations-grid";
    nations.innerHTML=participants.map(p=>nationCard(
      p,
      statsMap.get(`${start?.id}:${p.id}`),
      statsMap.get(`${end?.id}:${p.id}`),
      year(start?.snapshot_date),
      year(end?.snapshot_date)
    )).join("");
  }
  $(".event-data-note")?.remove();

  const timeline=$("#event-timeline");
  if(timeline){
    timeline.className="";
    timeline.innerHTML=timelineMarkup(chapters,entries,participantsById);
    bindTimelineFilters();
  }

  const diplomacy=$("#event-diplomacy");
  const diplomaticEntries=entries.filter(e=>diplomaticTypes.has(e.entry_type));
  if(diplomacy){
    diplomacy.className="v52-diplomacy-grid";
    diplomacy.innerHTML=diplomaticEntries.length
      ? diplomaticEntries.map(e=>diplomacyCard(e,participantsById)).join("")
      : '<div class="empty-state"><strong>Aucune déclaration publique pour le moment</strong><p>Les grandes prises de position RP seront publiées ici.</p></div>';
  }

  const mediaBox=$("#event-media");
  if(mediaBox){
    mediaBox.innerHTML=media.length?media.map(m=>{
      const title=esc(m.title||"Média de campagne");
      const caption=m.caption?`<span>${esc(m.caption)}</span>`:"";
      if(m.media_type==="image")return`<figure class="event-media-card"><img src="${esc(m.url)}" alt="${title}" loading="lazy"><figcaption><strong>${title}</strong>${caption}</figcaption></figure>`;
      if(m.media_type==="audio")return`<figure class="event-media-card event-media-audio"><figcaption><strong>${title}</strong>${caption}</figcaption><audio controls preload="metadata" src="${esc(m.url)}"></audio></figure>`;
      if(m.media_type==="video")return`<figure class="event-media-card event-media-video"><video controls preload="metadata" src="${esc(m.url)}"></video><figcaption><strong>${title}</strong>${caption}</figcaption></figure>`;
      return`<a class="event-media-card event-media-link" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer"><figcaption><strong>${title}</strong>${caption}<small>Ouvrir le lien ↗</small></figcaption></a>`;
    }).join(""):'<div class="empty-state"><strong>Galerie à venir</strong><p>Images, cartes, fichiers audio et vidéos de la campagne apparaîtront ici.</p></div>';
  }
}

async function boot(){
  if(!BACKEND_CONFIGURED)return;
  db=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});
  await Promise.all([loadHomeFeature(),loadEventsIndex(),loadEventDetail()]);
}
boot();
