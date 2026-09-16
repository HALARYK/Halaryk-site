import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const CFG=globalThis.HALARYK_CONFIG||{};
const BACKEND=Boolean(CFG.SUPABASE_URL&&CFG.SUPABASE_PUBLISHABLE_KEY);
const db=BACKEND?createClient(CFG.SUPABASE_URL,CFG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,detectSessionInUrl:false}}):null;
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const year=v=>v?String(v).slice(0,4):"—";
const n=(v,d=0)=>v===null||v===undefined||v===""?"—":new Intl.NumberFormat("fr-FR",{maximumFractionDigits:d,minimumFractionDigits:d}).format(Number(v));
const pct=(a,b)=>{a=Number(a);b=Number(b);if(!Number.isFinite(a)||!Number.isFinite(b)||a===0)return"—";const p=(b-a)/a*100;return`${p>=0?"+":""}${n(p,1)} %`};
const rootUrl=new URL("./",import.meta.url);
const asset=name=>new URL(`assets/${name}`,rootUrl).href;

function injectCss(){
  if(document.querySelector('link[data-v52]'))return;
  const l=document.createElement("link");l.rel="stylesheet";l.href=new URL("./v5.2.css",import.meta.url).href;l.dataset.v52="1";document.head.appendChild(l);
}

const ICONS={
 twitch:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h16v11l-5 5h-4l-3 3v-3H5V3Zm2 2v12h4v2l2-2h3l3-3V5H7Zm5 3h2v5h-2V8Zm4 0h2v5h-2V8Z"/></svg>`,
 discord:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 5.4a15 15 0 0 0-3.7-1.2l-.5 1a14 14 0 0 0-5.6 0l-.5-1A15 15 0 0 0 5 5.4C2.7 8.8 2.1 12 2.4 15.2A15 15 0 0 0 7 17.5l1.1-1.5a9 9 0 0 1-1.8-.9l.4-.3c3.5 1.6 7.2 1.6 10.7 0l.4.3a9 9 0 0 1-1.8.9l1.1 1.5a15 15 0 0 0 4.6-2.3c.4-3.8-.7-7-2.7-9.8ZM8.8 13.6c-1 0-1.9-.9-1.9-2s.8-2 1.9-2c1 0 1.9.9 1.9 2s-.9 2-1.9 2Zm6.4 0c-1 0-1.9-.9-1.9-2s.8-2 1.9-2 1.9.9 1.9 2-.9 2-1.9 2Z"/></svg>`,
 instagram:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm10.5 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>`,
 youtube:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12c0 1.3.1 2.6.4 3.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8 0-1.3-.1-2.6-.4-3.8ZM10 15V9l5 3-5 3Z"/></svg>`,
 tiktok:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3c.4 2.3 1.7 3.7 4 4v3a8 8 0 0 1-4-1.2V15a6 6 0 1 1-6-6h1v3a3 3 0 1 0 2 2.8V3h3Z"/></svg>`,
 x:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h4.7l4.1 5.5L17.5 3H20l-6 7.4L21 21h-4.7l-4.7-6.3L6.4 21H4l6.5-8L4 3Zm3.5 2 10.2 14h1.1L8.6 5H7.5Z"/></svg>`,
 twitter:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 7.2v.5c0 5-3.8 10.7-10.7 10.7-2.1 0-4.1-.6-5.8-1.7h.9c1.8 0 3.4-.6 4.7-1.6a3.8 3.8 0 0 1-3.5-2.6 4 4 0 0 0 1.7-.1 3.8 3.8 0 0 1-3-3.7 3.8 3.8 0 0 0 1.7.5 3.8 3.8 0 0 1-1.2-5 10.7 10.7 0 0 0 7.8 4 3.8 3.8 0 0 1 6.4-3.4 7 7 0 0 0 2.4-.9 3.8 3.8 0 0 1-1.7 2.1 7 7 0 0 0 2.2-.6 8 8 0 0 1-1.9 1.8Z"/></svg>`,
 bluesky:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11c-1-2-3.8-5.6-6.4-7.5C3.1 1.8 2 2.1 1.4 2.4.7 2.8.5 3.8.5 4.5c0 .8.4 6.4.7 7.3.9 2.9 4.1 3.9 6.9 3.4-4.9.8-6.2 3.5-3.5 6.2 5.1 5.2 7.1-1.1 7.4-2 .3.9 2.3 7.2 7.4 2 2.7-2.7 1.4-5.4-3.5-6.2 2.8.5 6-.5 6.9-3.4.3-.9.7-6.5.7-7.3 0-.7-.2-1.7-.9-2.1-.6-.3-1.7-.6-4.2 1.1C15.8 5.4 13 9 12 11Z"/></svg>`,
 github:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.8 8.7c-.1-.3-.5-1.3.1-2.7 0 0 .8-.3 2.8 1a9.7 9.7 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1.1 2.7c0 3.9-2.4 4.7-4.7 5 .4.3.7 1 .7 2V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z"/></svg>`,
 link:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2A5 5 0 0 0 12 3.9l-1.1 1.1 1.4 1.4 1.1-1.1a3 3 0 1 1 4.2 4.2l-2 2a3 3 0 0 1-4.2 0L10 13Zm4-2a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1-1.4-1.4-1.1 1.1a3 3 0 0 1-4.2-4.2l2-2a3 3 0 0 1 4.2 0L14 11Z"/></svg>`
};
const iconFor=p=>ICONS[String(p||"").toLowerCase()]||ICONS.link;

function resolveHref(path){
  return new URL(path,rootUrl).href;
}

function navDefinition(){
  return {
    "Événements":[
      ["Tous les événements",resolveHref("evenements/")],
      ["Chroniques de l’Europe",resolveHref("evenements/chroniques-europe/")],
      ["Règles de la campagne",resolveHref("evenements/chroniques-europe/regles/")]
    ],
    "Contenu":[
      ["Vue d’ensemble",resolveHref("contenu/")],
      ["Planning",resolveHref("contenu/#planning")],
      ["Ludothèque",resolveHref("contenu/#ludotheque")],
      ["Clips",resolveHref("contenu/#clips")]
    ],
    "Communauté":[
      ["Vue d’ensemble",resolveHref("communaute/")],
      ["Cabinet des idées",resolveHref("communaute/#cabinet")],
      ["Réputation",resolveHref("communaute/#reputation")],
      ["Collaborateurs",resolveHref("communaute/#collaborateurs")]
    ],
    "Infos":[
      ["Vue d’ensemble",resolveHref("infos/")],
      ["Règlement",resolveHref("infos/#reglement")],
      ["Commandes",resolveHref("infos/#commandes")],
      ["Configuration",resolveHref("infos/#config")],
      ["FAQ",resolveHref("infos/#faq")],
      ["Partenaires",resolveHref("infos/#partenaires")]
    ]
  };
}

function enhanceNav(){
  const nav=$(".nav");if(!nav||nav.dataset.v52)return;
  nav.dataset.v52="1";
  const defs=navDefinition();
  [...nav.children].filter(el=>el.matches("a")).forEach(a=>{
    const key=a.textContent.trim();if(!defs[key])return;
    const group=document.createElement("div");group.className="v52-nav-group";
    const btn=document.createElement("button");btn.type="button";btn.className=`v52-nav-trigger ${a.classList.contains("active")?"active":""}`;btn.setAttribute("aria-expanded","false");btn.innerHTML=`${esc(key)} <span>⌄</span>`;
    const menu=document.createElement("div");menu.className="v52-nav-menu";
    menu.innerHTML=defs[key].map(([label,href])=>`<a href="${href}">${esc(label)}</a>`).join("");
    a.replaceWith(group);group.append(btn,menu);
    btn.addEventListener("click",e=>{e.stopPropagation();const open=group.classList.toggle("open");btn.setAttribute("aria-expanded",String(open));$$(".v52-nav-group.open",nav).filter(g=>g!==group).forEach(g=>{g.classList.remove("open");g.querySelector("button")?.setAttribute("aria-expanded","false")})});
  });
  document.addEventListener("click",e=>{if(!e.target.closest(".v52-nav-group"))$$(".v52-nav-group.open").forEach(g=>{g.classList.remove("open");g.querySelector("button")?.setAttribute("aria-expanded","false")})});
}

function socialMarkup(rows,cls=""){
  return `<div class="v52-socials ${cls}">${rows.map(r=>`<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(r.label||r.platform)}" title="${esc(r.label||r.platform)}">${iconFor(r.platform)}</a>`).join("")}</div>`;
}
async function loadSocials(){
  if(!db)return;
  const {data}=await db.from("site_social_links").select("platform,label,url,sort_order").eq("enabled",true).order("sort_order");
  const rows=data||[];if(!rows.length)return;
  const brand=$(".topbar .brand");
  if(brand&&!$(".topbar .v52-socials"))brand.insertAdjacentHTML("afterend",socialMarkup(rows,"v52-socials-top"));
  const footer=$(".footer-content");
  if(footer&&!footer.querySelector(".v52-socials"))footer.insertAdjacentHTML("beforeend",socialMarkup(rows,"v52-socials-footer"));
  const mobile=$(".mobile-nav-footer");
  if(mobile&&!mobile.querySelector(".v52-socials"))mobile.insertAdjacentHTML("beforeend",socialMarkup(rows,"v52-socials-mobile"));
}
function removeLegacyNetworks(){
  $("#reseaux")?.remove();
  $$('a[href*="#reseaux"]').forEach(a=>{if(a.closest(".mobile-nav-footer"))a.remove()});
}

const FLAGS={
  CAS:["#8e1d1d","#d8b35d","♜"],ENG:["#f0e7d9","#b02020","✚"],LAN:["#b98b45","#721919","⚜"],BRA:["#d6b94f","#151515","♛"],HAB:["#b51f2e","#f2e8df","◆"],TUR:["#9d1720","#efe5d6","☾"],MOS:["#244f78","#d5b15d","✦"]
};
function flag(tag){
  const [a,b,s]=FLAGS[tag]||["#463a33","#b79364",tag?.[0]||"•"];
  return `<span class="v52-flag" style="--fa:${a};--fb:${b}"><i>${esc(s)}</i></span>`;
}
function gameFacts(){
  return `<div class="v52-game-facts">
    <span><b>Grande stratégie</b><small>Diplomatie · guerre · économie</small></span>
    <span><b>Multijoueur RP</b><small>Sept joueurs, sept puissances</small></span>
    <span><b>1444 → 1821</b><small>Près de quatre siècles d’histoire</small></span>
    <span><b>Europe alternative</b><small>Les choix des joueurs écrivent la suite</small></span>
  </div>`;
}
function playerStrip(players){
  return `<div class="v52-player-strip"><p>Les 7 nations en jeu</p><div>${players.map(p=>`<span class="v52-player">${flag(p.participant_key)}<b>${esc(p.player_name||"Joueur")}</b><small>${esc(p.title||p.participant_key)}</small></span>`).join("")}</div></div>`;
}
function eventCard(event,players,href){
  const map=event.hero_image_url||asset("eu4-europe-map-v52.webp");
  return `<article class="v52-event-card" style="--v52-event-map:url('${esc(map)}')">
    <div class="v52-event-map" aria-hidden="true"></div>
    <div class="v52-event-overlay"></div>
    <div class="v52-event-copy">
      <p class="eyebrow">LE GRAND RENDEZ-VOUS DU MOMENT</p>
      <h2>${esc(event.title||"Chroniques de l’Europe")}</h2>
      <h3>Campagne multijoueur RP sur <strong>Europa Universalis IV</strong></h3>
      <p>${esc(event.summary||"Sept joueurs réécrivent l’histoire de l’Europe au fil des guerres, alliances, crises et négociations.")}</p>
      ${gameFacts()}
      ${playerStrip(players)}
      <div class="v52-event-bottom">
        <div class="v52-event-numbers">
          <span><b>${year(event.world_start_date)} → ${year(event.world_current_date)}</b><small>Période jouée</small></span>
          <span><b>${Number(event.metadata?.current_session||2)}</b><small>Sessions terminées</small></span>
          <span><b>${players.length}</b><small>Nations jouées</small></span>
          <span><b>${year(event.public_chronicle_cutoff_date)}</b><small>Chronologie publique</small></span>
        </div>
        <a class="button button-primary" href="${href}">Découvrir la campagne →</a>
      </div>
    </div>
  </article>`;
}
async function renderFeatured(){
  if(!db)return;
  const home=$("#home-feature-event"),stage=$("#events-active-grid");
  if(!home&&!stage)return;
  const {data:events}=await db.from("site_events").select("*").eq("status","active").order("featured",{ascending:false}).order("created_at",{ascending:false});
  if(!events?.length)return;
  const ids=events.map(e=>e.id);
  const {data:ps}=await db.from("site_event_participants").select("event_id,participant_key,player_name,title,sort_order").in("event_id",ids).eq("public",true).order("sort_order");
  const grouped=new Map();(ps||[]).forEach(p=>{if(!grouped.has(p.event_id))grouped.set(p.event_id,[]);grouped.get(p.event_id).push(p)});
  if(home){
    const e=events.find(e=>e.featured)||events[0];
    home.innerHTML=eventCard(e,grouped.get(e.id)||[],resolveHref("evenements/chroniques-europe/"));
  }
  if(stage){
    let index=0;
    const render=()=>{
      const e=events[index];stage.innerHTML=eventCard(e,grouped.get(e.id)||[],e.slug==="ppo-europe"?"chroniques-europe/":`fiche/?slug=${encodeURIComponent(e.slug)}`);
      const prev=$("#events-prev"),next=$("#events-next"),count=$("#events-carousel-counter");
      [prev,next].forEach(b=>b?.classList.toggle("hidden",events.length<2));
      if(count)count.textContent=events.length>1?`${index+1} / ${events.length}`:"";
    };
    const prev=$("#events-prev"),next=$("#events-next");
    if(prev&&!prev.dataset.v52){prev.dataset.v52="1";prev.addEventListener("click",()=>{index=(index-1+events.length)%events.length;render()})}
    if(next&&!next.dataset.v52){next.dataset.v52="1";next.addEventListener("click",()=>{index=(index+1)%events.length;render()})}
    render();
  }
}

function simplifyEventHero(event){
  const hero=$(".event-hero");if(!hero)return;
  hero.classList.add("v52-event-hero");
  $("#event-title")&&( $("#event-title").textContent=event.title||"Chroniques de l’Europe" );
  $("#event-game-name")&&( $("#event-game-name").textContent="EUROPA UNIVERSALIS IV" );
  const sub=$("#event-subtitle");if(sub)sub.textContent="Une campagne multijoueur RP où sept nations écrivent ensemble une autre histoire de l’Europe.";
  const summary=$("#event-summary");if(summary)summary.textContent="Guerres, alliances, crises, congrès et ambitions nationales — avec une partie de l’information volontairement gardée secrète pour préserver la diplomatie.";
  $(".event-hero-facts")?.classList.add("hidden");
  $(".event-confidentiality")?.classList.add("hidden");
  const flor=$(".event-hero-floral");if(flor)flor.style.backgroundImage=`url("${event.hero_image_url||asset("eu4-europe-map-v52.webp")}")`;
}

function overviewMarkup(event,players){
  const current=year(event.world_current_date),start=year(event.world_start_date),cutoff=year(event.public_chronicle_cutoff_date),snap=year(event.public_snapshot_date);
  return `<div class="v52-overview">
    <div class="v52-overview-metrics">
      <span><b>${start} → ${current}</b><small>Période jouée</small></span>
      <span><b>${Number(event.metadata?.current_session||2)}</b><small>Sessions terminées</small></span>
      <span><b>${players.length}</b><small>Nations jouées</small></span>
      <span><b>${cutoff}</b><small>Chronologie publique</small></span>
    </div>
    <div class="v52-overview-story">
      <div>
        <p class="eyebrow">COMPRENDRE LA CAMPAGNE</p>
        <h3>Une grande stratégie, des histoires humaines</h3>
        <p><strong>Europa Universalis IV</strong> est un jeu de grande stratégie historique qui commence en 1444 et peut mener jusqu’en 1821. Chaque joueur dirige un État : économie, diplomatie, armées, commerce, expansion et alliances évoluent en permanence.</p>
        <p>Sur HALARYK, cette partie est jouée à sept en multijoueur et accompagnée d’un <strong>RP diplomatique</strong> entre les sessions. Les déclarations, traités, congrès et rivalités donnent une continuité à la campagne au-delà du simple gameplay.</p>
        <p>La campagne est diffusée en stream. Pour préserver la règle sans registre et les négociations secrètes, les statistiques publiques sont volontairement retardées : <strong>dernier relevé statistique public ${snap}</strong>, alors que la partie est actuellement en ${current}.</p>
      </div>
      <aside><span>Une règle simple</span><b>La diplomatie doit rester jouable même hors stream.</b><small>Les informations contemporaines ne sont donc pas toutes exposées sur le site.</small></aside>
    </div>
  </div>`;
}
function statCell(label,value,small=""){return `<span><small>${esc(label)}</small><b>${value}</b>${small?`<em>${small}</em>`:""}</span>`}
function nationCard(p,a,b,start,end){
  const sa=a?.stats||{},sb=b?.stats||{},tech=sb.technologies||{};
  const deltaDev=Number(sb.development)-Number(sa.development);
  return `<article class="v52-nation-card">
    <header>${flag(p.participant_key)}<div><p>${esc(p.participant_key)}</p><h3>${esc(p.title)}</h3><small>${esc(p.player_name||"")}</small></div><strong>${start} → ${end}<em>FIN SESSION I</em></strong></header>
    <div class="v52-nation-stats">
      ${statCell("Provinces",n(sb.province_count),`${Number(sb.province_count)-Number(sa.province_count)>=0?"+":""}${n(Number(sb.province_count)-Number(sa.province_count))}`)}
      ${statCell("Développement",n(sb.development),`${deltaDev>=0?"+":""}${n(deltaDev)}`)}
      ${statCell("Revenu brut annuel",`${n(sb.annual_gross_income,1)} ¤`,pct(sa.annual_gross_income,sb.annual_gross_income))}
      ${statCell("Armée",`${n(sb.regiment_count)} régiments`,`${Number(sb.regiment_count)-Number(sa.regiment_count)>=0?"+":""}${n(Number(sb.regiment_count)-Number(sa.regiment_count))}`)}
      ${statCell("Flotte",`${n(sb.ship_count)} navires`,`${Number(sb.ship_count)-Number(sa.ship_count)>=0?"+":""}${n(Number(sb.ship_count)-Number(sa.ship_count))}`)}
      ${statCell("Manpower maximal",n(Number(sb.max_manpower)*1000),`${Number(sb.max_manpower)>=Number(sa.max_manpower)?"+":""}${n((Number(sb.max_manpower)-Number(sa.max_manpower))*1000)}`)}
      ${statCell("Technologies",`${tech.administrative??"—"} / ${tech.diplomatic??"—"} / ${tech.military??"—"}`,"Adm · Dip · Mil")}
      ${statCell("Conflits",`${n(sb.wars_participated)} guerres`,`${n(sb.war_losses)} pertes cumulées`)}
    </div>
  </article>`;
}
async function renderNations(event,players){
  const box=$("#event-nations-grid");if(!box)return;
  const {data:snaps}=await db.from("site_event_snapshots").select("*").eq("event_id",event.id).eq("public",true).order("snapshot_date");
  if(!snaps?.length)return;
  const ids=snaps.map(s=>s.id);
  const {data:stats}=await db.from("site_event_snapshot_stats").select("*").in("snapshot_id",ids);
  const map=new Map((stats||[]).map(x=>[`${x.snapshot_id}:${x.participant_id}`,x]));
  const start=snaps[0],end=snaps.at(-1);
  box.classList.add("v52-nation-grid");
  box.innerHTML=players.map(p=>nationCard(p,map.get(`${start.id}:${p.id}`),map.get(`${end.id}:${p.id}`),year(start.snapshot_date),year(end.snapshot_date))).join("");
  $(".event-data-note")?.remove();
}

const TYPE_LABEL={guerre:"Guerre",politique:"Politique",dynastie:"Dynastie",union_personnelle:"Union personnelle",désastre:"Désastre",religion:"Religion",session:"Session",autre:"Événement"};
const TYPE_ICON={guerre:"⚔",politique:"◆",dynastie:"♛",union_personnelle:"♔",désastre:"!",religion:"✦",session:"◉",autre:"•"};
function timelineCard(e){
  const type=e.entry_type||"autre";
  return `<article class="v52-time-event type-${type.replace(/[^\w-]/g,"")} ${e.importance==="turning_point"?"is-major":""}" tabindex="0">
    <button type="button" aria-expanded="false">
      <span class="v52-time-icon">${TYPE_ICON[type]||"•"}</span>
      <small>${esc(e.world_date_label||String(e.world_year||""))}</small>
      <em>${esc(TYPE_LABEL[type]||type)}</em>
      <strong>${esc(e.title)}</strong>
    </button>
    <div class="v52-time-detail"><p>${esc(e.summary||"")}</p>${Array.isArray(e.data?.participants)?`<span>Pays concernés : ${e.data.participants.map(esc).join(" · ")}</span>`:""}</div>
  </article>`;
}
async function renderTimeline(event){
  const box=$("#event-timeline");if(!box)return;
  const {data:entries}=await db.from("site_event_entries").select("*").eq("event_id",event.id).eq("public",true).eq("review_status","approved").not("entry_type","in","(diplomatie,congrès,traité,déclaration,correspondance)").order("world_year",{ascending:true,nullsFirst:false}).order("sort_order",{ascending:true});
  const {data:chapters}=await db.from("site_event_chapters").select("*").eq("event_id",event.id).eq("public",true).order("sort_order");
  const chapterMarks=(chapters||[]).filter(c=>c.kind==="session").map(c=>({entry_type:"session",title:c.title,summary:c.subtitle||"",world_date_label:c.world_start_date?`${year(c.world_start_date)} → ${year(c.world_end_date)}`:(c.real_start_date||""),world_year:Number(year(c.world_start_date))||9998,importance:"major",data:{}}));
  const all=[...(entries||[]),...chapterMarks].sort((a,b)=>(Number(a.world_year||9999)-Number(b.world_year||9999))||Number(a.sort_order||0)-Number(b.sort_order||0));
  box.className="v52-timeline";
  box.innerHTML=`<div class="v52-timeline-filters">${["Toutes","Guerre","Dynastie","Union personnelle","Désastre","Politique","Session"].map((x,i)=>`<button type="button" data-filter="${i?"type-"+x.toLowerCase().replaceAll(" ","_").replace("union_personnelle","union_personnelle"):"all"}" class="${i?"":"active"}">${x}</button>`).join("")}</div><div class="v52-timeline-track">${all.map(timelineCard).join("")}</div><p class="v52-timeline-hint">Clique sur un événement pour ouvrir son détail. Fais défiler horizontalement pour parcourir les décennies.</p>`;
  $$(".v52-time-event",box).forEach(card=>{const btn=$("button",card);const toggle=()=>{const open=card.classList.toggle("open");btn.setAttribute("aria-expanded",String(open))};btn.addEventListener("click",toggle);card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggle()}})});
  $$(".v52-timeline-filters button",box).forEach(btn=>btn.addEventListener("click",()=>{$$(".v52-timeline-filters button",box).forEach(x=>x.classList.remove("active"));btn.classList.add("active");const f=btn.dataset.filter;$$(".v52-time-event",box).forEach(c=>c.classList.toggle("filtered",f!=="all"&&!c.classList.contains(f))) }));
}

async function renderEventDetail(){
  if(!db||document.body.dataset.page!=="event")return;
  const slug=document.body.dataset.eventSlug||"ppo-europe";
  const {data:event}=await db.from("site_events").select("*").eq("slug",slug).maybeSingle();if(!event)return;
  const {data:players}=await db.from("site_event_participants").select("*").eq("event_id",event.id).eq("public",true).order("sort_order");
  const ps=players||[];
  simplifyEventHero(event);
  const overview=$("#apercu .section-shell");if(overview)overview.innerHTML=overviewMarkup(event,ps);
  await Promise.all([renderNations(event,ps),renderTimeline(event)]);
}

function pagePolish(){
  $$(".page-intro").forEach(x=>x.classList.add("v52-page-intro"));
  $$(".footer").forEach(x=>x.classList.add("v52-footer"));
  $(".home-hero")?.classList.add("v52-home-hero");
  $(".home-event-section")?.classList.add("v52-home-event");
  const title=$(".events-page-intro");if(title)title.classList.add("v52-page-intro-major");
}

async function boot(){
  injectCss();
  enhanceNav();
  removeLegacyNetworks();
  pagePolish();
  if(document.body.classList.contains("admin-body")){
    import("./admin/admin-v52.js").catch(console.error);
    return;
  }
  await Promise.allSettled([loadSocials(),renderFeatured(),renderEventDetail()]);
  setTimeout(()=>{enhanceNav();removeLegacyNetworks();pagePolish()},600);
}
boot();
