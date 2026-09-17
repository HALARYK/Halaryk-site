const FLAG_URLS={
  Castille:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Castile.svg",
  Angleterre:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_England.svg",
  Florence:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Florence.svg",
  Brandebourg:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Brandenburg_(1340-1657).svg",
  Autriche:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Flag_of_Austria.svg",
  "Empire ottoman":"https://commons.wikimedia.org/wiki/Special:Redirect/file/Ottoman_flag_c.1490-1701.png",
  Moscovie:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Blason_Moscovie.svg"
};

const MAP_PARTS=[
  'assets/eu4/europe-1444-political-v52.b64.001a1','assets/eu4/europe-1444-political-v52.b64.001a2','assets/eu4/europe-1444-political-v52.b64.001a3','assets/eu4/europe-1444-political-v52.b64.001a4_1','assets/eu4/europe-1444-political-v52.b64.001a4_2','assets/eu4/europe-1444-political-v52.b64.001a4_3_1','assets/eu4/europe-1444-political-v52.b64.001a4_3_2','assets/eu4/europe-1444-political-v52.b64.001a4_3_3','assets/eu4/europe-1444-political-v52.b64.001a4_3_4','assets/eu4/europe-1444-political-v52.b64.001a4_3_5','assets/eu4/europe-1444-political-v52.b64.001a4_4','assets/eu4/europe-1444-political-v52.b64.001b','assets/eu4/europe-1444-political-v52.b64.002','assets/eu4/europe-1444-political-v52.b64.003','assets/eu4/europe-1444-political-v52.b64.004'
];
const ROOT=new URL('./',import.meta.url);
let mapDataUrl='';

function cleanText(v=''){return String(v).replace(/\s+/g,' ').trim().toLowerCase()}
function nationFromNode(img){
  const alt=cleanText(img.alt);
  for(const nation of Object.keys(FLAG_URLS)) if(alt.includes(cleanText(nation))) return nation;
  const player=img.closest('.v52-player');
  const nationLabel=player?.querySelector('span')?.textContent;
  if(nationLabel&&FLAG_URLS[nationLabel.trim()])return nationLabel.trim();
  const card=img.closest('.v52-nation-card');
  const cardTitle=card?.querySelector('h3')?.textContent;
  if(cardTitle&&FLAG_URLS[cardTitle.trim()])return cardTitle.trim();
  const tab=img.closest('.v52-country-tabs button');
  const tabTitle=tab?.querySelector('b')?.textContent;
  if(tabTitle&&FLAG_URLS[tabTitle.trim()])return tabTitle.trim();
  return '';
}
function patchFlags(){
  document.querySelectorAll('.v52-player img,.v52-nation-head img,.v52-country-tabs img,.v52-diplomacy-head img').forEach(img=>{
    const nation=nationFromNode(img); if(!nation)return;
    const target=FLAG_URLS[nation];
    if(img.dataset.v52Historical==='1'&&img.src===target)return;
    img.dataset.v52Historical='1';
    img.src=target;
    img.referrerPolicy='no-referrer';
    img.decoding='async';
  });
}
function applyMap(){
  if(!mapDataUrl)return;
  const bg=`linear-gradient(90deg,rgba(5,4,4,.98) 0%,rgba(5,4,4,.93) 25%,rgba(5,4,4,.72) 43%,rgba(5,4,4,.38) 62%,rgba(5,4,4,.12) 100%),linear-gradient(180deg,rgba(0,0,0,.06),rgba(0,0,0,.10) 55%,rgba(0,0,0,.72) 100%),url("${mapDataUrl}")`;
  document.querySelectorAll('.v52-campaign-card.v52-map-card').forEach(card=>{
    card.style.setProperty('background-image',bg,'important');
    card.style.setProperty('background-size','cover,cover,cover','important');
    card.style.setProperty('background-position','center,center,72% 48%','important');
    card.style.setProperty('background-repeat','no-repeat','important');
  });
}
async function loadMap(){
  try{
    const responses=await Promise.all(MAP_PARTS.map(p=>fetch(new URL(p,ROOT),{cache:'no-store'})));
    if(responses.some(r=>!r.ok))throw new Error('EU4 map fragment missing');
    const b64=(await Promise.all(responses.map(r=>r.text()))).map(x=>x.trim()).join('');
    if(!b64.startsWith('UklGR')||b64.length<50000)throw new Error('Invalid EU4 map data');
    mapDataUrl=`data:image/webp;base64,${b64}`;
    document.documentElement.style.setProperty('--v52-eu4-map',`url("${mapDataUrl}")`);
    applyMap();
  }catch(err){console.error('V5.2 visual map fix failed',err)}
}
function patchAll(){patchFlags();applyMap()}

const observer=new MutationObserver(()=>requestAnimationFrame(patchAll));
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchAll,{once:true});else patchAll();
loadMap();
