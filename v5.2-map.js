const ROOT=new URL('./',import.meta.url);
const page=document.body?.dataset?.page||'';
if(['home','events','event'].includes(page)){
  const parts=[
    'assets/eu4/europe-1444-political-v52.b64.001a1','assets/eu4/europe-1444-political-v52.b64.001a2','assets/eu4/europe-1444-political-v52.b64.001a3','assets/eu4/europe-1444-political-v52.b64.001a4_1','assets/eu4/europe-1444-political-v52.b64.001a4_2','assets/eu4/europe-1444-political-v52.b64.001a4_3_1','assets/eu4/europe-1444-political-v52.b64.001a4_3_2','assets/eu4/europe-1444-political-v52.b64.001a4_3_3','assets/eu4/europe-1444-political-v52.b64.001a4_3_4','assets/eu4/europe-1444-political-v52.b64.001a4_3_5','assets/eu4/europe-1444-political-v52.b64.001a4_4','assets/eu4/europe-1444-political-v52.b64.001b','assets/eu4/europe-1444-political-v52.b64.002','assets/eu4/europe-1444-political-v52.b64.003','assets/eu4/europe-1444-political-v52.b64.004'
  ];
  try{
    const responses=await Promise.all(parts.map(p=>fetch(new URL(p,ROOT),{cache:'no-store'})));
    if(responses.some(r=>!r.ok))throw new Error('fragment missing');
    const base64=(await Promise.all(responses.map(r=>r.text()))).map(x=>x.trim()).join('');
    if(!base64.startsWith('UklGR')||base64.length<50000)throw new Error('invalid EU4 map payload');
    document.documentElement.style.setProperty('--v52-eu4-map',`url("data:image/webp;base64,${base64}")`);
    document.documentElement.classList.add('v52-eu4-map-ready');
  }catch(error){console.error('EU4 map load failed',error)}
}
