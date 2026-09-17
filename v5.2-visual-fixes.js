const FLAG_URLS={
  Castille:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Castile.svg",
  Angleterre:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_England.svg",
  Florence:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Florence.svg",
  Brandebourg:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Brandenburg_(1340-1657).svg",
  Autriche:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Austria.svg",
  "Empire ottoman":"https://commons.wikimedia.org/wiki/Special:Redirect/file/Ottoman_flag_c.1490-1701.png",
  Moscovie:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Blason_Moscovie.svg"
};
const MAP_URL=new URL("assets/eu4/9cd54619-9278-4953-825c-336a809cf04b.png",import.meta.url).href;
function cleanText(v=""){return String(v).replace(/\s+/g," ").trim().toLowerCase()}
function nationFromNode(img){
  const alt=cleanText(img.alt);
  for(const nation of Object.keys(FLAG_URLS))if(alt.includes(cleanText(nation)))return nation;
  const player=img.closest(".v52-player")?.querySelector("span")?.textContent?.trim();if(player&&FLAG_URLS[player])return player;
  const card=img.closest(".v52-nation-card")?.querySelector("h3")?.textContent?.trim();if(card&&FLAG_URLS[card])return card;
  const tab=img.closest(".v52-country-tabs button")?.querySelector("b")?.textContent?.trim();if(tab&&FLAG_URLS[tab])return tab;
  return "";
}
function patchFlags(){
  document.querySelectorAll(".v52-player img,.v52-nation-head img,.v52-country-tabs img,.v52-diplomacy-head img").forEach(img=>{
    const nation=nationFromNode(img);if(!nation)return;
    const target=FLAG_URLS[nation];if(img.dataset.v52Historical==="1"&&img.src===target)return;
    img.dataset.v52Historical="1";img.src=target;img.referrerPolicy="no-referrer";img.decoding="async";
  });
}
function applyMap(){
  document.documentElement.style.setProperty("--v52-eu4-map",`url("${MAP_URL}")`);
  document.documentElement.classList.add("v52-eu4-map-ready");
  const bg=`linear-gradient(90deg,rgba(5,4,4,.99) 0%,rgba(5,4,4,.97) 18%,rgba(5,4,4,.88) 34%,rgba(5,4,4,.60) 50%,rgba(5,4,4,.27) 68%,rgba(5,4,4,.08) 100%),linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.04) 58%,rgba(0,0,0,.50) 100%),url("${MAP_URL}")`;
  document.querySelectorAll(".v52-campaign-card.v52-map-card").forEach(card=>{
    card.style.setProperty("background-color","#070606","important");
    card.style.setProperty("background-image",bg,"important");
    card.style.setProperty("background-size","cover,cover,auto 130%","important");
    card.style.setProperty("background-position","center,center,100% 50%","important");
    card.style.setProperty("background-repeat","no-repeat","important");
    card.dataset.v52MapApplied="1";
  });
}
function patchAll(){patchFlags();applyMap()}
let raf=0;const observer=new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(patchAll)});
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",patchAll,{once:true});else patchAll();