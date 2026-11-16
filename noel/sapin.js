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
  // Numérotation discrète de haut en bas et de gauche à droite.
  // Neuf rangs de 1, 2, 3, 4, 5, 6, 6, 6 et 7 boules = 40 places.
  // Les positions 1 à 40 sont stables, quel que soit le nombre de visiteurs.
  const SLOT_ROWS=[
    [20,0,1],[27,9,2],[34,15,3],[41,21,4],[48,25,5],
    [55,29,6],[62,31,6],[69,33,6],[76,34,7]
  ];
  const SLOT_POSITIONS=SLOT_ROWS.flatMap(([top,extent,quantity])=>
    Array.from({length:quantity},(_,i)=>({
      left:50+(quantity===1?0:(-extent+(2*extent*i)/(quantity-1))),
      top
    }))
  );
  const SLOT_COUNT=SLOT_POSITIONS.length;
  // 7 et 40 sont premiers entre eux : chaque place est visitée une seule fois.
  const slotForSubmission=number=>((number*7-1)%SLOT_COUNT)+1;
  const isDemo=root.hasAttribute('data-tree-demo');
  const demoRows=[];
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
  const canPost=()=>isDemo
    ? demoRows.length<SLOT_COUNT
    : !!user&&Date.now()>=SEASON_OPEN&&readyToPost&&location.protocol!=='file:';
  function updateAuthState(){
    if(isDemo){
      signin.hidden=true;
      fieldset.disabled=!canPost();
      setStatus(demoRows.length>=SLOT_COUNT
        ? 'Les 40 places sont occupées. Efface les essais pour recommencer.'
        : 'Aperçu interactif : '+demoRows.length+' / 40 boules. Aucun message n’est envoyé.');
      return;
    }
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
    function addOrnament(row,animated){
      if(!plane||!row||shown.has(row.id))return;
      const position=Number(row.position_index);
      const slot=SLOT_POSITIONS[position-1];
      if(!slot)return;
      shown.add(row.id);
      const button=document.createElement('button');
      button.type='button';
      button.className='halaryk-tree-fallback-ornament';
      button.style.left=slot.left.toFixed(2)+'%';
      button.style.top=slot.top.toFixed(2)+'%';
      button.style.setProperty('--ornament-color',colorChoice(row.style)[1]);
      button.setAttribute('aria-label','Lire un message déposé sur le sapin');
      const orb=document.createElement('span');
      orb.className='bauble';
      button.append(orb);
      button.addEventListener('click',()=>showMessage(String(row.message||''),String(row.author||'Anonyme')));
      if(animated && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        button.classList.add('is-landing');
        button.addEventListener('animationend',()=>button.classList.remove('is-landing'),{once:true});
      }
      plane.append(button);
    }
    return {
      removeAll(){if(plane)plane.replaceChildren();shown.clear();},
      setOrnaments(rows,{animateId=null}={}){
        for(const row of rows)addOrnament(row,animateId===row.id);
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
  async function loadOrnaments(animateId=null){
    if(!db||isDemo)return;
    try{
      const {data,error}=await db.rpc('christmas_tree_public_2026');
      if(error)throw error;
      ornamentRows=Array.isArray(data)?data:[];
      sceneApi?.setOrnaments(ornamentRows,{animateId});
      readyToPost=ornamentRows.length<SLOT_COUNT;
    }catch(error){
      console.warn('Sapin HALARYK : lecture des décorations impossible',error);
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
  function demoPlace(message,style,anonymous=false,animate=true){
    if(demoRows.length>=SLOT_COUNT)return null;
    const slot=slotForSubmission(demoRows.length+1);
    const row={
      id:'demo-'+(demoRows.length+1),
      style,message,author:anonymous?'Anonyme':'Visiteur test',
      position_index:slot
    };
    demoRows.push(row);
    sceneApi?.setOrnaments([row],{animateId:animate?row.id:null});
    updateAuthState();
    return row;
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!canPost())return setStatus('Connexion Twitch obligatoire ou sapin complet.',true);
    const message=form.elements.message.value.trim(),style=palette[selected][0];
    if(!message||message.length>180)return setStatus('Le message doit contenir entre 1 et 180 caractères.',true);
    const anonymous=!!form.elements.anonymous.checked;
    if(isDemo){
      demoPlace(message,style,anonymous);
      form.reset();chars.textContent='0 / 180';
      return;
    }
    const submit=form.querySelector('[data-tree-submit]');submit.disabled=true;
    try{
      const {data,error}=await db.rpc('christmas_tree_place_2026',{p_style:style,p_message:message,p_anonymous:anonymous});
      if(error)throw error;
      form.reset();chars.textContent='0 / 180';
      await loadOrnaments(String(data));
      fieldset.disabled=true;
      setStatus('Ta boule est accrochée au sapin.');
    }catch(err){setStatus('Publication impossible : '+err.message,true);}
    finally{submit.disabled=false;}
  });
  if(isDemo){
    const addFive=root.querySelector('[data-tree-demo-five]');
    const reset=root.querySelector('[data-tree-demo-reset]');
    addFive?.addEventListener('click',()=>{
      const total=Math.min(5,SLOT_COUNT-demoRows.length);
      for(let i=0;i<total;i++){
        const n=demoRows.length+1;
        // La dernière boule recule vers sa place ; les quatre autres sont posées sans animation.
        demoPlace('Un souhait pour Noël — visiteur '+n,palette[(n-1)%palette.length][0],n%3===0,i===total-1);
      }
      updateAuthState();
    });
    reset?.addEventListener('click',()=>{
      demoRows.length=0;
      sceneApi?.removeAll();
      form.reset();chars.textContent='0 / 180';
      updateAuthState();
    });
  }
  // Sapin photoréaliste fixe ; les décorations restent interactives.
  sceneApi=createFallback();
  updateAuthState();
  if(!isDemo && location.protocol!=='file:'){
    getDb().then(async client=>{
      await refreshUser();await loadOrnaments();
      client.auth.onAuthStateChange(()=>setTimeout(refreshUser,0));
    }).catch(err=>console.warn('Sapin communauté : backend indisponible',err));
  } else if(!isDemo){
    setStatus('Aperçu local : connexion et publication Twitch disponibles uniquement sur le site hébergé.');
  }
})();