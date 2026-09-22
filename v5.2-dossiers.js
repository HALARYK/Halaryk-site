import { WAR_EVENT_DATA } from "./v5.2-war-save-data.js";
import { EVENT_CONTEXT } from "./v5.2-event-context.js";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const ROOT=new URL("./",import.meta.url);
if(!document.querySelector('link[href$="v5.2-dossiers.css"]')){const l=document.createElement("link");l.rel="stylesheet";l.href=new URL("v5.2-dossiers.css",ROOT).href;document.head.appendChild(l)}

const iconByType={guerre:"⚔",bataille:"⚔",dynastie:"♛",désastre:"!",crise:"!",politique:"✦",exploration:"✧",événement:"◆",religion:"✝",empire:"♜",puissance:"★",capitale:"◆",population:"◈",révolte:"⚑",culture:"◉",diplomatie:"✉"};
const tagByCountry={"castille":"CAS","angleterre":"ENG","florence":"LAN","brandebourg":"BRA","autriche":"HAB","empire ottoman":"TUR","moscovie":"MOS"};
function norm(v=""){return String(v).trim().toLowerCase()}
function isoFromFr(v=""){const m=String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`:""}
function longDate(iso=""){const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return iso||"—";return new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(+m[1],+m[2]-1,+m[3])))}
function n(v){return new Intl.NumberFormat("fr-FR").format(Number(v||0))}
function plural(v,sing,plur){return `${n(v)} ${Number(v)>1?plur:sing}`}
function isTechnical(label=""){return /trace de save|flag|modificateur|drapeau|progression conservée|limite de la sauvegarde/i.test(label)}
function factCard(label,value,cls=""){return `<div class="v52-dossier-fact ${cls}"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`}
function sectionTitle(label){return `<h4 class="v52-dossier-section-title">${esc(label)}</h4>`}
function sourceBlock(items){if(!items.length)return"";return `<details class="v52-dossier-source"><summary>Données techniques de la sauvegarde</summary><div>${items.map(([k,v])=>factCard(k,v)).join("")}</div></details>`}

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
  if(w.mode==="start")return `<div class="v52-war-opening"><p class="v52-dossier-kicker">DÉCLENCHEMENT DU CONFLIT</p><div class="v52-war-intro">${factCard("Casus belli",w.casusBelli,"is-accent")}${factCard("Objectif de guerre",w.warGoal)}${factCard("Déclaration",longDate(w.start))}</div>${camps}<p class="v52-dossier-note">Ce dossier décrit la situation au déclenchement. L’issue, les pertes finales et la paix sont réservées au jalon de fin de guerre.</p></div>`;
  if(w.mode==="join")return `<div class="v52-war-opening"><p class="v52-dossier-kicker">ENTRÉE DANS UNE GUERRE EN COURS</p><div class="v52-war-intro">${factCard("Casus belli",w.casusBelli,"is-accent")}${factCard("Objectif de guerre",w.warGoal)}${factCard("Guerre déclenchée",longDate(w.start))}${factCard("Entrée dans le conflit",longDate(w.joinDate),"is-highlight")}</div>${camps}<div class="v52-war-status"><b>Situation au 16 janvier 1481</b><span>${esc(w.winner)}</span></div></div>`;
  const attackerLosses=Object.entries(w.losses).filter(([name])=>w.attackers.includes(name));
  const defenderLosses=Object.entries(w.losses).filter(([name])=>w.defenders.includes(name));
  const lossSide=(label,total,rows)=>`<article class="v52-war-loss-side"><div class="v52-war-loss-head"><span>${esc(label)}</span><strong>${n(total)} pertes</strong></div>${rows.length?`<div>${rows.map(([name,val])=>`<p><span>${esc(name)}</span><b>${n(val)}</b></p>`).join("")}</div>`:"<p class=\"v52-muted\">Détail non conservé dans la sauvegarde.</p>"}</article>`;
  return `<div class="v52-war-end"><div class="v52-war-result"><span>ISSUE DU CONFLIT</span><strong>${esc(w.winner)}</strong></div>${camps}<div class="v52-war-intro">${factCard("Période",`${longDate(w.start)} → ${longDate(w.end)}`,"is-wide")}${factCard("Batailles enregistrées",plural(w.battles,"bataille","batailles"))}${factCard("Casus belli",w.casusBelli)}${factCard("Objectif",w.warGoal)}</div>${(w.lossesAttackers||w.lossesDefenders)?`${sectionTitle("Pertes par camp")}<div class="v52-war-losses">${lossSide("Camp attaquant",w.lossesAttackers,attackerLosses)}${lossSide("Camp défenseur",w.lossesDefenders,defenderLosses)}</div>`:""}${w.peace?`<div class="v52-peace-box"><span>RÈGLEMENT / PAIX</span><strong>${esc(w.peace)}</strong></div>`:""}</div>`;
}
function battleLayout(facts,map){
  const war=map.get("guerre")||"Conflit non renseigné",place=map.get("lieu")||"—",terrain=map.get("terrain")||"—",att=map.get("attaquant")||"—",def=map.get("défenseur")||"—",loss=map.get("pertes de la bataille")||"—",winner=map.get("vainqueur")||"—";
  const used=new Set(["guerre","lieu","terrain","attaquant","défenseur","pertes de la bataille","vainqueur"]);const rest=facts.filter(([k])=>!used.has(norm(k))&&!isTechnical(k));const tech=facts.filter(([k])=>isTechnical(k));
  return `<div class="v52-battle-file"><p class="v52-dossier-kicker">AFFRONTEMENT</p><div class="v52-battle-context">${factCard("Guerre",war,"is-wide")}${factCard("Lieu",place)}${factCard("Terrain",terrain)}</div><div class="v52-battle-camps"><article><span>Attaquant</span><strong>${esc(att)}</strong></article><div><b>${esc(winner)}</b><span>vainqueur</span></div><article><span>Défenseur</span><strong>${esc(def)}</strong></article></div><div class="v52-battle-loss"><span>Pertes de la bataille</span><strong>${esc(loss)}</strong></div>${rest.length?`<div class="v52-dossier-facts">${rest.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}${sourceBlock(tech)}</div>`;
}
function contextLayout(ctx,facts){
  const tech=facts.filter(([k])=>isTechnical(k));const useful=facts.filter(([k])=>!isTechnical(k)&&!/conséquence|résultat observable/i.test(k));
  return `<div class="v52-context-file"><div class="v52-context-status">${esc(ctx.status||"Repère de campagne")}</div><div class="v52-context-columns"><article><span>REPÈRE HISTORIQUE</span><p>${esc(ctx.history||"")}</p></article><article><span>DANS LA CAMPAGNE</span><p>${esc(ctx.campaign||"")}</p></article></div>${ctx.game?`<aside class="v52-context-game"><span>LECTURE JEU / SOURCE</span><p>${esc(ctx.game)}</p></aside>`:""}${useful.length?`${sectionTitle("Données utiles de la partie")}<div class="v52-dossier-facts">${useful.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}${sourceBlock(tech)}</div>`;
}
function genericLayout(facts){const tech=facts.filter(([k])=>isTechnical(k));const main=facts.filter(([k])=>!isTechnical(k));return `${main.length?`<div class="v52-dossier-facts">${main.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}${sourceBlock(tech)}`}
function enhanceDossier(box){
  if(!box)return;const grid=$(".v52-fact-grid",box);if(!grid)return;
  const meta=$$(".v52-detail-meta span",box).map(x=>x.textContent.trim());const country=meta[0]||"",type=meta[1]||"Événement",dateFr=meta[2]||"",iso=isoFromFr(dateFr),tag=tagByCountry[norm(country)]||"",key=tag&&iso?`${tag}|${iso}`:"";const title=$("h3",box)?.textContent?.trim()||"Événement";
  const facts=$$(":scope > div",grid).map(cell=>[$("span",cell)?.textContent?.trim()||"",$("strong",cell)?.textContent?.trim()||""]).filter(([k,v])=>k&&v);const map=new Map(facts.map(([k,v])=>[norm(k),v]));const t=norm(type),war=WAR_EVENT_DATA[key],ctx=EVENT_CONTEXT[key];const signature=`${key}|${title}`;if(box.dataset.v52DossierSignature===signature)return;
  let body;if(war)body=warLayout(war);else if(t.includes("bataille"))body=battleLayout(facts,map);else if(ctx)body=contextLayout(ctx,facts);else body=genericLayout(facts);
  box.innerHTML=`<header class="v52-dossier-header" data-type="${esc(t)}"><div class="v52-dossier-icon">${esc(iconByType[t]||"◆")}</div><div class="v52-dossier-heading"><div class="v52-detail-meta"><span>${esc(country)}</span><span>${esc(type)}</span><span>${esc(dateFr)}</span></div><h3>${esc(title)}</h3></div></header><div class="v52-dossier-body">${body}</div>`;box.dataset.v52DossierSignature=signature;
}
function scan(){const box=$("#v52-detail-modal .v52-detail-content");if(box?.querySelector('.v52-fact-grid')){delete box.dataset.v52DossierSignature;enhanceDossier(box)}}
const observer=new MutationObserver(()=>requestAnimationFrame(scan));observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener("click",e=>{if(e.target.closest(".v52-curated-node"))setTimeout(scan,0)},true);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();
