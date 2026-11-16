/* HALARYK Noël 2026 — Sapin réaliste 2D et décorations interactives.
   Connexion Twitch et droits gérés côté Supabase. */
(() => {
  'use strict';
  const root=document.querySelector('[data-christmas-root]');
  if(!root)return;
  const stage=root.querySelector('[data-tree-stage]');
  const form=root.querySelector('[data-tree-form]'),fieldset=root.querySelector('[data-tree-fieldset]');
  const login=root.querySelector('[data-tree-login]'),signin=root.querySelector('[data-tree-signin]');
  const feedback=root.querySelector('[data-tree-feedback]'),swatches=root.querySelector('[data-tree-swatches]');
  const chars=root.querySelector('[data-tree-chars]');
  const dialog=document.querySelector('[data-tree-message-dialog]');
  const palette=[
    ['Bordeaux','#8b283b'],['Ivoire','#e8dccb'],['Doré','#c4a66d'],
    ['Rose','#bd8b8b'],['Cuivre','#ae714f'],['Vert','#31594d']
  ];
  const SEASON_OPEN=Date.parse('2026-11-30T23:00:00Z');
  const TAU=Math.PI*2;
  let selected=0,db=null,user=null,readyToPost=false,ornamentRows=[];
  let sceneApi=null;
  const colorChoice=(name)=>palette.find(p=>p[0]===name)||palette[0];
  const setStatus=(s,error=false)=>{feedback.textContent=s;feedback.classList.toggle('is-error',error);};
  function initSwatches(){
    palette.forEach(([name,color],index)=>{
      const button=document.createElement('button');button.type='button';button.className='halaryk-tree-swatch';
      button.innerHTML='<span class="sample-ball"></span><span></span>';
      button.querySelector('.sample-ball').style.background=color;
      button.lastChild.textContent=name;
      button.setAttribute('aria-pressed',String(index===selected));
      button.addEventListener('click',()=>{
        selected=index;
        [...swatches.children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
      });
      swatches.append(button);
    });
    form.elements.message.addEventListener('input',()=>chars.textContent=form.elements.message.value.length+' / 180');
  }
  initSwatches();
  const canPost=()=>!!user&&Date.now()>=SEASON_OPEN&&readyToPost&&location.protocol!=='file:';
  function updateAuthState(){
    const signed=!!user;
    signin.hidden=signed;
    fieldset.disabled=!canPost();
    if(signed&&!readyToPost)setStatus('Le sapin ouvre le 1er décembre. La publication sera activée après installation du service sécurisé.');
    else if(signed&&Date.now()<SEASON_OPEN)setStatus('Tu es connecté à Twitch. Les décorations ouvrent le 1er décembre.');
    else if(signed)setStatus('Une boule par compte Twitch. Ton message pourra être anonyme pour les autres visiteurs.');
    else setStatus('Connecte-toi avec Twitch pour laisser ton message.');
  }
  function createFallback(){
    const plane=stage.querySelector('[data-tree-fallback-ornaments]');
    const shown=new Set();

    return {
      removeAll(){if(plane)plane.replaceChildren();shown.clear();},
      setOrnaments(rows){
        if(!plane)return;
        for(const row of rows){
          if(shown.has(row.id))continue;
          shown.add(row.id);
          const idx=Math.max(0,Number(row.position_index)||0);
          const progress=((idx*97)%367)/367;
          const angle=(idx*2.39996323)%TAU;
          const top=79-progress*64;
          const width=31*(1-progress);
          const left=50+Math.cos(angle)*width;
          const button=document.createElement('button');
          button.type='button';
          button.className='halaryk-tree-fallback-ornament';
          button.style.left=left.toFixed(2)+'%';
          button.style.top=top.toFixed(2)+'%';
          button.style.setProperty('--ornament-color',colorChoice(row.style)[1]);
          button.setAttribute('aria-label','Lire un message sur le sapin');
          const orb=document.createElement('span');orb.className='bauble';
          button.append(orb);
          button.addEventListener('click',()=>showMessage(String(row.message||''),String(row.author||'Anonyme')));
          plane.append(button);
        }
      }
    };
  }
  let lastFocus=null;
  function showMessage(message,author){
    if(!dialog)return;
    lastFocus=document.activeElement;
    dialog.querySelector('[data-tree-message-text]').textContent=message;
    dialog.querySelector('[data-tree-message-author]').textContent=author;
    dialog.hidden=false;
    dialog.querySelector('[data-tree-close]').focus();
  }
  function closeMessage(){
    if(!dialog)return;
    dialog.hidden=true;lastFocus?.focus?.();
  }
  dialog?.querySelector('[data-tree-close]')?.addEventListener('click',closeMessage);
  dialog?.addEventListener('click',e=>{if(e.target===dialog)closeMessage();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog&&!dialog.hidden)closeMessage();});
  async function getDb(){
    if(db)return db;
    const config=await import(new URL('config.js',document.baseURI).href);
    const lib=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm');
    db=lib.createClient(config.CONFIG.SUPABASE_URL,config.CONFIG.SUPABASE_PUBLISHABLE_KEY,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return db;
  }
  async function refreshUser(){
    if(!db)return;
    try{
      const {data}=await db.auth.getUser();
      const u=data?.user||null;
      const providers=u?.app_metadata?.providers||[];
      user=u&&(u.app_metadata?.provider==='twitch'||providers.includes('twitch'))?u:null;
    }catch{user=null;}
    updateAuthState();
  }
  async function loadOrnaments(){
    if(!db)return;
    try{
      const {data,error}=await db.rpc('christmas_tree_public_2026');
      if(error)throw error;
      ornamentRows=Array.isArray(data)?data:[];
      sceneApi?.setOrnaments(ornamentRows);
      readyToPost=true;
    }catch{
      readyToPost=false;
    }
    updateAuthState();
  }
  login?.addEventListener('click',async()=>{
    if(location.protocol==='file:')return setStatus('La connexion Twitch fonctionne sur le site hébergé, pas dans cet aperçu local.',true);
    const top=document.querySelector('#login-button');
    if(top&&!top.classList.contains('hidden')){top.click();return;}
    try{
      const client=await getDb();
      const {error}=await client.auth.signInWithOAuth({provider:'twitch',options:{redirectTo:location.origin+location.pathname+'#sapin-communautaire'}});
      if(error)throw error;
    }catch(e){setStatus('Connexion Twitch indisponible : '+e.message,true);}
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!canPost())return setStatus('Connexion Twitch obligatoire. Participation ouverte le 1er décembre.',true);
    const message=form.elements.message.value.trim(),style=palette[selected][0];
    if(!message||message.length>180)return setStatus('Le message doit contenir entre 1 et 180 caractères.',true);
    const submit=form.querySelector('[data-tree-submit]');submit.disabled=true;
    try{
      const {data,error}=await db.rpc('christmas_tree_place_2026',{p_style:style,p_message:message,p_anonymous:!!form.elements.anonymous.checked});
      if(error)throw error;
      setStatus('Ta boule est accrochée au sapin.');
      form.reset();chars.textContent='0 / 180';await loadOrnaments();
      fieldset.disabled=true;
    }catch(err){setStatus('Publication impossible : '+err.message,true);}
    finally{submit.disabled=false;}
  });
  // Sapin photoréaliste fixe ; les décorations restent interactives.
  sceneApi=createFallback();
  updateAuthState();
  if(location.protocol!=='file:'){
    getDb().then(async client=>{
      await refreshUser();await loadOrnaments();
      client.auth.onAuthStateChange(()=>setTimeout(refreshUser,0));
    }).catch(err=>console.warn('Sapin communauté : backend indisponible',err));
  }else setStatus('Aperçu local : connexion et publication Twitch disponibles uniquement sur le site hébergé.');
})();