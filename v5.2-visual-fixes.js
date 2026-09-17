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
  const bg=`linear-gradient(90deg,rgba(5,4,4,.98) 0%,rgba(5,4,4,.92) 23%,rgba(5,4,4,.68) 40%,rgba(5,4,4,.30) 60%,rgba(5,4,4,.05) 100%),linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.08) 58%,rgba(0,0,0,.66) 100%),url("${mapDataUrl}")`;
  document.querySelectorAll('.v52-campaign-card.v52-map-card').forEach(card=>{
    card.style.setProperty('background-color','#070606','important');
    card.style.setProperty('background-image',bg,'important');
    card.style.setProperty('background-size','cover,cover,cover','important');
    card.style.setProperty('background-position','center,center,70% 50%','important');
    card.style.setProperty('background-repeat','no-repeat','important');
    card.dataset.v52MapApplied='1';
  });
}

async function fetchPart(path){
  const url=new URL(path,ROOT);
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{cache:'no-store',credentials:'same-origin'});
      if(!response.ok)throw new Error(`${response.status} ${path}`);
      const text=(await response.text()).trim();
      if(!text)throw new Error(`empty ${path}`);
      return text;
    }catch(error){
      lastError=error;
      await new Promise(resolve=>setTimeout(resolve,120*(attempt+1)));
    }
  }
  throw lastError||new Error(`failed ${path}`);
}

async function loadMap(){
  try{
    const chunks=[];
    /* RawGitHack can intermittently refuse a burst of many extensionless
       fragment requests. Loading sequentially keeps the preview reliable. */
    for(const path of MAP_PARTS) chunks.push(await fetchPart(path));
    const b64=chunks.join('').replace(/\s+/g,'');
    if(!b64.startsWith('UklGR'))throw new Error(`Invalid EU4 map header: ${b64.slice(0,8)}`);
    if(b64.length<50000)throw new Error(`EU4 map payload too short: ${b64.length}`);
    mapDataUrl=`data:image/webp;base64,${b64}`;
    document.documentElement.style.setProperty('--v52-eu4-map',`url("${mapDataUrl}")`);
    document.documentElement.classList.add('v52-eu4-map-ready');
    applyMap();
  }catch(err){
    console.error('V5.2 visual map fix failed',err);
    document.documentElement.classList.add('v52-eu4-map-failed');
  }
}
function patchAll(){patchFlags();applyMap()}

const observer=new MutationObserver(()=>requestAnimationFrame(patchAll));
observer.observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patchAll,{once:true});else patchAll();
loadMap();
