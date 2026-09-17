const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

const iconByType={
  guerre:"⚔",bataille:"⚔",dynastie:"♛",désastre:"!",crise:"!",politique:"✦",
  exploration:"✧",événement:"◆",religion:"✝",empire:"♜",puissance:"★",capitale:"◆",
  population:"◈",révolte:"⚑",culture:"◉"
};

function norm(v=""){return String(v).trim().toLowerCase()}
function formatDateValue(value=""){
  return String(value).replace(/\b(\d{4})\.(\d{1,2})\.(\d{1,2})\b/g,(_,y,m,d)=>{
    const date=new Date(Date.UTC(Number(y),Number(m)-1,Number(d)));
    return new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(date);
  });
}
function isTechnical(label=""){return /trace de save|flag|modificateur|drapeau|progression conservée/i.test(label)}
function getFact(map,...keys){for(const k of keys){const hit=map.get(norm(k));if(hit)return hit}return ""}
function factCard(label,value,cls=""){return `<div class="v52-dossier-fact ${cls}"><span>${esc(label)}</span><strong>${esc(formatDateValue(value))}</strong></div>`}
function sectionTitle(label){return `<h4 class="v52-dossier-section-title">${esc(label)}</h4>`}

function parseLosses(raw=""){
  return String(raw).split("|").map(x=>x.trim()).filter(Boolean).map(item=>{
    const i=item.indexOf(":");
    return i>0?[item.slice(0,i).trim(),item.slice(i+1).trim()]:["Pertes",item];
  });
}

function warLayout(facts,map){
  const attacker=getFact(map,"Camp attaquant");
  const defender=getFact(map,"Camp défenseur");
  const issue=getFact(map,"Issue");
  const period=getFact(map,"Période");
  const battles=getFact(map,"Batailles enregistrées");
  const own=[...facts].find(([k])=>/^pertes de /i.test(k));
  const losses=parseLosses(getFact(map,"Pertes enregistrées"));
  const used=new Set(["camp attaquant","camp défenseur","issue","période","batailles enregistrées","pertes enregistrées"]);
  if(own)used.add(norm(own[0]));
  const rest=facts.filter(([k])=>!used.has(norm(k))&&!isTechnical(k));
  const technical=facts.filter(([k])=>isTechnical(k));
  return `
    <div class="v52-dossier-warboard">
      <div class="v52-dossier-side v52-dossier-side-attack"><span>Camp attaquant</span><strong>${esc(attacker||"—")}</strong></div>
      <div class="v52-dossier-outcome"><span>${esc(iconByType.guerre)}</span><b>${esc(issue||"Conflit en cours")}</b></div>
      <div class="v52-dossier-side v52-dossier-side-defense"><span>Camp défenseur</span><strong>${esc(defender||"—")}</strong></div>
    </div>
    <div class="v52-dossier-keyfacts">
      ${period?factCard("Période",period,"is-wide"):""}
      ${battles?factCard("Batailles enregistrées",battles):""}
      ${own?factCard(own[0],own[1],"is-accent"):""}
    </div>
    ${losses.length?`${sectionTitle("Pertes enregistrées")}<div class="v52-dossier-losses">${losses.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}
    ${rest.length?`${sectionTitle("Autres informations")}<div class="v52-dossier-facts">${rest.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}
    ${technical.length?sourceBlock(technical):""}`;
}

function dynastyLayout(facts,map){
  const predecessor=getFact(map,"Prédécesseur","Souverain avant le basculement","Dynastie en place");
  const successor=getFact(map,"Nouveau souverain","Nouveau dirigeant","Nouvelle héritière","Héritière");
  const used=new Set(["prédécesseur","souverain avant le basculement","dynastie en place","nouveau souverain","nouveau dirigeant","nouvelle héritière","héritière"]);
  const technical=facts.filter(([k])=>isTechnical(k));
  const rest=facts.filter(([k])=>!used.has(norm(k))&&!isTechnical(k));
  return `
    ${(predecessor||successor)?`<div class="v52-dossier-succession"><div><span>Avant</span><strong>${esc(predecessor||"—")}</strong></div><i>→</i><div><span>Après</span><strong>${esc(successor||"—")}</strong></div></div>`:""}
    ${rest.length?`${sectionTitle("Profil dynastique")}<div class="v52-dossier-facts">${rest.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}
    ${technical.length?sourceBlock(technical):""}`;
}

function profileLayout(facts){
  const technical=facts.filter(([k])=>isTechnical(k));
  const rest=facts.filter(([k])=>!isTechnical(k));
  return `${rest.length?`<div class="v52-dossier-profile">${rest.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}${technical.length?sourceBlock(technical):""}`;
}

function genericLayout(facts){
  const technical=facts.filter(([k])=>isTechnical(k));
  const main=facts.filter(([k])=>!isTechnical(k));
  const keyLabels=/conséquence|résultat observable|situation en 1481|issue|effet encore visible|suite/i;
  const key=main.filter(([k])=>keyLabels.test(k));
  const rest=main.filter(([k])=>!keyLabels.test(k));
  return `${key.length?`<div class="v52-dossier-callouts">${key.map(([k,v])=>factCard(k,v,"is-highlight")).join("")}</div>`:""}${rest.length?`${sectionTitle("Informations")}<div class="v52-dossier-facts">${rest.map(([k,v])=>factCard(k,v)).join("")}</div>`:""}${technical.length?sourceBlock(technical):""}`;
}

function sourceBlock(items){
  return `<details class="v52-dossier-source"><summary>Données de sauvegarde</summary><div>${items.map(([k,v])=>factCard(k,v)).join("")}</div></details>`;
}

function enhanceDossier(box){
  if(!box||box.dataset.v52DossierEnhanced==="1")return;
  const grid=$(".v52-fact-grid",box);if(!grid)return;
  const meta=$$(".v52-detail-meta span",box).map(x=>x.textContent.trim());
  const country=meta[0]||"";
  const type=meta[1]||"Événement";
  const date=meta[2]||"";
  const title=$("h3",box)?.textContent?.trim()||"Événement";
  const summary=$(".v52-detail-summary",box)?.textContent?.trim()||"";
  const facts=$$(":scope > div",grid).map(cell=>[$("span",cell)?.textContent?.trim()||"",$("strong",cell)?.textContent?.trim()||""]).filter(([k,v])=>k&&v);
  const map=new Map(facts.map(([k,v])=>[norm(k),v]));
  const t=norm(type);
  let body;
  if(t.includes("guerre")||t.includes("bataille"))body=warLayout(facts,map);
  else if(t.includes("dynast"))body=dynastyLayout(facts,map);
  else if(t.includes("exploration"))body=profileLayout(facts);
  else body=genericLayout(facts);

  box.innerHTML=`
    <header class="v52-dossier-header" data-type="${esc(t)}">
      <div class="v52-dossier-icon">${esc(iconByType[t]||"◆")}</div>
      <div class="v52-dossier-heading">
        <div class="v52-detail-meta"><span>${esc(country)}</span><span>${esc(type)}</span><span>${esc(date)}</span></div>
        <h3>${esc(title)}</h3>
        ${summary?`<p class="v52-detail-summary">${esc(summary)}</p>`:""}
      </div>
    </header>
    <div class="v52-dossier-body">${body}</div>`;
  box.dataset.v52DossierEnhanced="1";
}

function scan(){enhanceDossier($("#v52-detail-modal .v52-detail-content"))}
const observer=new MutationObserver(()=>requestAnimationFrame(scan));
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan,{once:true});else scan();
