import { WAR_EVENT_DATA } from "./v5.2-war-save-data.js";
import { EVENT_CONTEXT } from "./v5.2-event-context.js";
import { renderRichText } from "./v5.2-richtext.js";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ROOT=new URL("./",import.meta.url);
if(!document.querySelector('link[href$="v5.2-dossiers.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href=new URL("v5.2-dossiers.css",ROOT).href;document.head.appendChild(l)}

const iconByType={guerre:"⚔",bataille:"⚔",dynastie:"♛",désastre:"!",crise:"!",politique:"✦",exploration:"✧",événement:"◆",religion:"✝",empire:"♜",puissance:"★",capitale:"◆",population:"◈",révolte:"⚑",culture:"◉",diplomatie:"✉"};
const tagByCountry={"espagne":"CAS","castille":"CAS","grande-bretagne":"ENG","angleterre":"ENG","florence":"LAN","prusse":"BRA","brandebourg":"BRA","autriche":"HAB","autriche-hongrie":"HAB","empire ottoman":"TUR","russie":"MOS","moscovie":"MOS"};
function norm(v=""){return String(v).trim().toLowerCase()}
function isoFromFr(v=""){const m=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:""}
function longDate(iso=""){const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return iso||"—";return new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(+m[1],+m[2]-1,+m[3])))}
function n(v){return new Intl.NumberFormat("fr-FR").format(Number(v||0))}
function plural(v,sing,plur){return `${n(v)} ${Number(v)>1?plur:sing}`}
function isTechnical(label="",value=""){return /(?:source|trace de|données techniques|flag|modificateur|drapeau|progression conservée|limite de la sauvegarde|preuve|code de|décision eu4|mesure eu4|type d’unités)/i.test(label)||/(?:\.eu4\b|\.sav\b|_flag\b|_modifier\b|[a-z]{2,}(?:_[a-z0-9]+){2,}|changed_tag_from=|elector=no|government_rank=|^national_focus=)/i.test(String(value))}
function factCard(label,value,cls=""){return `<div class="v52-dossier-fact ${cls}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`}
function sectionTitle(label){return `<h4 class="v52-dossier-section-title">${esc(label)}</h4>`}
function sourceBlock(items){return ""} // Métadonnées de sauvegarde réservées à l’administration.

function fullWarSummaryLayout(w){
  const attackerLosses=Object.entries(w.losses||{}).filter(([name])=>(w.attackers||[]).includes(name));
  const defenderLosses=Object.entries(w.losses||{}).filter(([name])=>(w.defenders||[]).includes(name));
  const lossSide=(label,total,rows)=>`<article class="v52-war-loss-side"><div class="v52-war-loss-head"><span>${esc(label)}</span><strong>${n(total)} pertes</strong></div>${rows.length?`<div>${rows.map(([name,val])=>`<p><span>${esc(name)}</span><b>${n(val)}</b></p>`).join("")}</div>`:""}</article>`;
  const attackerLabel=w.attackerLabel||"Coalition menée par l’Angleterre",defenderLabel=w.defenderLabel||"Camp ottoman";
  const camps=`<div class="v52-war-camps"><article><span>${esc(attackerLabel)}</span><strong>${esc((w.attackers||[]).join(" · "))}</strong></article><div class="v52-war-versus">VS</div><article><span>${esc(defenderLabel)}</span><strong>${esc((w.defenders||[]).join(" · "))}</strong></article></div>`;
  return `<div class="v52-war-end"><div class="v52-war-result"><span>${esc(w.rpNature||"GUERRE DE COALITION")}</span><strong>${esc(w.war)}</strong></div><div class="v52-war-intro">${factCard("Objectif RP",w.warGoal,"is-accent")}${factCard("Casus belli mécanique",w.casusBelli)}${w.mechanicalWar?factCard("Nom mécanique EU4",w.mechanicalWar):""}${factCard("Période",`${longDate(w.start)} → ${longDate(w.end)}`,"is-wide")}${factCard("Batailles enregistrées",plural(w.battles,"bataille","batailles"))}</div>${camps}${sectionTitle("Pertes par camp")}<div class="v52-war-losses">${lossSide(attackerLabel,w.lossesAttackers,attackerLosses)}${lossSide(defenderLabel,w.lossesDefenders,defenderLosses)}</div><div class="v52-war-status"><b>Issue enregistrée</b><span>${esc(w.winner)}</span></div>${w.peace?`<div class="v52-war-intro">${factCard("Résultat",w.peace,"is-wide")}</div>`:""}</div>`;
}
function warLayout(w){
  if(w.showFullSummary)return fullWarSummaryLayout(w);
  const camps=`<div class="v52-war-camps"><article><span>Camp attaquant</span><strong>${esc(w.attackers.join(" · "))}</strong></article><div class="v52-war-versus">VS</div><article><span>Camp défenseur</span><strong>${esc(w.defenders.join(" · "))}</strong></article></div>`;
  if(w.mode==="start")return `<div class="v52-war-opening"><p class="v52-dossier-kicker">GUERRE</p><div class="v52-war-intro">${factCard("Casus belli",w.casusBelli,"is-accent")}${factCard("Objectif",w.warGoal)}${factCard("Période",`${longDate(w.start)} → ${longDate(w.end)}`)}</div>${camps}${w.winner&&!/en cours|toujours actif/i.test(w.winner)?`<div class="v52-war-status"><b>Issue</b><span>${esc(w.winner)}</span></div>`:""}${(Number(w.lossesAttackers)||Number(w.lossesDefenders))?`<div class="v52-war-losses">${factCard("Pertes du camp attaquant",`${n(w.lossesAttackers)} hommes`)}${factCard("Pertes du camp défenseur",`${n(w.lossesDefenders)} hommes`)}</div>`:""}${w.peace?factCard("Conséquence",w.peace,"is-wide"):""}</div>`;
  if(w.mode==="join")return `<div class="v52-war-opening"><p class="v52-dossier-kicker">ENTRÉE EN GUERRE</p><div class="v52-war-intro">${factCard("Casus belli",w.casusBelli,"is-accent")}${factCard("Objectif",w.warGoal)}${factCard("Déclaration",longDate(w.start))}${factCard("Intervention",longDate(w.joinDate),"is-highlight")}</div>${camps}${w.winner&&!/en cours|toujours actif/i.test(w.winner)?`<div class="v52-war-status"><b>Issue</b><span>${esc(w.winner)}</span></div>`:""}${(Number(w.lossesAttackers)||Number(w.lossesDefenders))?`<div class="v52-war-losses">${factCard("Pertes du camp attaquant",`${n(w.lossesAttackers)} hommes`)}${factCard("Pertes du camp défenseur",`${n(w.lossesDefenders)} hommes`)}</div>`:""}</div>`;
  const attackerLosses=Object.entries(w.losses).filter(([name])=>w.attackers.includes(name));
  const defenderLosses=Object.entries(w.losses).filter(([name])=>w.defenders.includes(name));
  const lossSide=(label,total,rows)=>`<article class="v52-war-loss-side"><div class="v52-war-loss-head"><span>${esc(label)}</span><strong>${n(total)} pertes</strong></div>${rows.length?`<div>${rows.map(([name,val])=>`<p><span>${esc(name)}</span><b>${n(val)}</b></p>`).join("")}</div>`:"<p class=\"v52-muted\">Détail non conservé dans la sauvegarde.</p>"}</article>`;
  return `<div class="v52-war-end"><div class="v52-war-result"><span>ISSUE DU CONFLIT</span><strong>${esc(w.winner)}</strong></div>${camps}<div class="v52-war-intro">${factCard("Période",`${longDate(w.start)} → ${longDate(w.end)}`,"is-wide")}${factCard("Batailles enregistrées",plural(w.battles,"bataille","batailles"))}${factCard("Casus belli",w.casusBelli)}${factCard("Objectif",w.warGoal)}</div>${(w.lossesAttackers||w.lossesDefenders)?`${sectionTitle("Pertes par camp")}<div class="v52-war-losses">${lossSide("Camp attaquant",w.lossesAttackers,attackerLosses)}${lossSide("Camp défenseur",w.lossesDefenders,defenderLosses)}</div>`:""}${w.peace?`<div class="v52-peace-box"><span>RÈGLEMENT / PAIX</span><strong>${esc(w.peace)}</strong></div>`:""}</div>`;
}
function battleLayout(facts,map){
  if(!map.has("attaquant")&&!map.has("défenseur")){
    const useful=facts.filter(([k,v])=>!isTechnical(k,v));
    return `<div class="v52-battle-file"><div class="v52-dossier-facts">${useful.map(([k,v])=>factCard(k,v)).join("")}</div></div>`;
  }
  const naval=map.has("navires engagés")||map.has("navires perdus");
  const war=map.get("guerre")||"Conflit",place=map.get("lieu")||"—";
  const att=map.get("attaquant")||"—",def=map.get("défenseur")||"—";
  const winner=map.get("vainqueur")||"—";
  const losses=naval?(map.get("navires perdus")||"—"):(map.get("pertes de la bataille")||map.get("pertes")||"—");
  const troops=naval?map.get("navires engagés"):map.get("effectifs engagés");
  const used=new Set(["guerre","lieu","terrain","attaquant","défenseur","effectifs engagés","navires engagés","navires perdus","pertes de la bataille","pertes","vainqueur"]);
  const rest=facts.filter(([k,v])=>!used.has(norm(k))&&!isTechnical(k,v));
  return `<div class="v52-battle-file">
    <p class="v52-dossier-kicker">${naval?"BATAILLE NAVALE":"BATAILLE TERRESTRE"}</p>
    <div class="v52-battle-context">${factCard("Guerre",war,"is-wide")}${factCard("Lieu",place)}${map.has("terrain")?factCard("Terrain",map.get("terrain")):""}</div>
    <div class="v52-battle-camps"><article><span>Attaquant</span><strong>${esc(att)}</strong></article><div><b>${esc(winner)}</b><span>vainqueur</span></div><article><span>Défenseur</span><strong>${esc(def)}</strong></article></div>
    ${troops?`<div class="v52-dossier-facts">${factCard(naval?"Flottes engagées":"Hommes engagés",troops,"is-wide")}</div>`:""}
    <div class="v52-battle-loss"><span>${naval?"Navires perdus":"Pertes humaines"}</span><strong>${esc(losses)}</strong></div>
    ${rest.length?`<div class="v52-dossier-facts">${rest.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}
  </div>`;
}
function cleanHistoricalParagraph(value){
  return String(value||"").split(/(?<=[.!?])\s+/u)
    .filter(sentence=>!/(?:\.eu4\b|_flag\b|_modifier\b|changed_tag_from=|elector=no|government_rank=|source\s*:\s*mp_|trace de sauvegarde)/i.test(sentence))
    .join(" ").trim();
}
function contextLayout(ctx,facts){
  const tech=facts.filter(([k,v])=>isTechnical(k,v));const useful=facts.filter(([k,v])=>!isTechnical(k,v)&&!/conséquence|résultat observable/i.test(k));
  return `<div class="v52-context-file"><div class="v52-context-status">${esc(ctx.status||"Repère de campagne")}</div><div class="v52-context-columns"><article><span>REPÈRE HISTORIQUE</span><p>${esc(cleanHistoricalParagraph(ctx.history))}</p></article><article><span>DANS LA CAMPAGNE</span><p>${esc(cleanHistoricalParagraph(ctx.campaign))}</p></article></div>${useful.length?`${sectionTitle("Données utiles de la partie")}<div class="v52-dossier-facts">${useful.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}${sourceBlock(tech)}</div>`;
}
function editorialWarLayout(facts){
  const list=facts.filter(([k,v])=>!isTechnical(k,v)&&!/situation|en cours/i.test(k));
  const weight=k=>/issue|résultat|vainqueur|victoire|défaite|pertes|batailles/i.test(k)?0:/conflit|guerre|adversaire|allié/i.test(k)?1:2;
  list.sort((a,b)=>weight(a[0])-weight(b[0]));
  return list.length?`<div class="v52-war-opening"><p class="v52-dossier-kicker">${list.some(([k])=>/issue|résultat|paix/i.test(k))?"BILAN DU CONFLIT":"GUERRE ET COMBATS"}</p><div class="v52-war-intro">${list.map(([k,v])=>factCard(k,v)).join("")}</div></div>`:"";
}
function genericLayout(facts){const tech=facts.filter(([k,v])=>isTechnical(k,v));const main=facts.filter(([k,v])=>!isTechnical(k,v));return `${main.length?`<div class="v52-dossier-facts">${main.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}${sourceBlock(tech)}`}
function enhanceDossier(box){
  if(!box)return;const grid=$(".v52-fact-grid",box);if(!grid)return;
  const meta=$$(".v52-detail-meta span",box).map(x=>x.textContent.trim());const country=meta[0]||"",type=meta[1]||"Événement",dateFr=meta[2]||"",iso=isoFromFr(dateFr),tag=tagByCountry[norm(country)]||"",key=tag&&iso?`${tag}|${iso}`:"";const title=$("h3",box)?.textContent?.trim()||"Événement";
  const facts=$(":scope > div",grid).map(cell=>[$("span",cell)?.textContent?.trim()||"",$("strong",cell)?.textContent?.trim()||""]).filter(([k,v])=>k&&v&&!isTechnical(k,v));const map=new Map(facts.map(([k,v])=>[norm(k),v]));const t=norm(type),eventData=box._v52Event||{},war=eventData.war||WAR_EVENT_DATA[key],ctx=eventData.context||EVENT_CONTEXT[key];const signature=`${key}|${title}`;if(box.dataset.v52DossierSignature===signature)return;
  let body;if(war)body=`${ctx?contextLayout(ctx,[]):""}${warLayout(war)}`;else if(t.includes("guerre"))body=`${ctx?contextLayout(ctx,[]):""}${editorialWarLayout(facts)}`;else if(t.includes("bataille"))body=`${ctx?contextLayout(ctx,[]):""}${battleLayout(facts,map)}`;else if(ctx)body=contextLayout(ctx,facts);else body=genericLayout(facts);
  const treaty=eventData.treatyBody?`<details class="v52-treaty-details"><summary>Lire le Traité de Trente — texte intégral des dix articles</summary><div class="v52-document-body v52-rich-document">${renderRichText(eventData.treatyBody)}</div></details>`:"";
  box.innerHTML=`<header class="v52-dossier-header" data-type="${esc(t)}"><div class="v52-dossier-icon">${esc(iconByType[t]||"◆")}</div><div class="v52-dossier-heading"><div class="v52-detail-meta"><span>${esc(country)}</span><span>${esc(type)}</span><span>${esc(dateFr)}</span></div><h3>${esc(title)}</h3></div></header><div class="v52-dossier-body">${body}</div>${treaty}`;box.dataset.v52DossierSignature=signature;
}
function scan(){const box=$("#v52-detail-modal .v52-detail-content");if(box?.querySelector('.v52-fact-grid')){delete box.dataset.v52DossierSignature;enhanceDossier(box)}}
const observer=new MutationObserver(()=>requestAnimationFrame(scan));observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener("click",e=>{if(e.target.closest(".v52-curated-node"))setTimeout(scan,0)},true);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();
