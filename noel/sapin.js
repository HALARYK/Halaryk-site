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
  const finishesRoot=root.querySelector('[data-tree-finishes]');
  const previewBall=root.querySelector('[data-tree-preview-ball]'),previewLabel=root.querySelector('[data-tree-preview-label]');
  const chars=root.querySelector('[data-tree-chars]');
  const dialog=document.querySelector('[data-tree-message-dialog]');
  const palette=[
    ['Bordeaux','#8b283b'],['Ivoire','#e8dccb'],['Doré','#c4a66d'],
    ['Rose','#bd8b8b'],['Cuivre','#ae714f'],['Vert','#31594d']
  ];
  const finishes=[
    ['mat','Mat'],['satin','Satiné'],['laque','Laqué brillant'],
    ['metal','Métallisé'],['nacre','Nacré'],['givre','Givré'],
    ['paillete','Paillettes fines'],['velours','Velours'],
    ['cannele','Cannelé'],['facette','Facetté'],
    ['mercurise','Verre mercurisé'],['craquele','Craquelé'],
    ['martele','Martelé'],['marbre','Marbré']
  ];
  const finishChoice=code=>finishes.some(f=>f[0]===code)?code:'mat';
  const SEASON_OPEN=Date.parse('2026-11-30T23:00:00Z');
  // Coordonnées fixes et volontairement irrégulières dans la silhouette du sapin.
  // Les 40 identifiants restent ordonnés du haut vers le bas, mais aucune rangée n'est rectiligne.
  const SLOT_POSITIONS=[
    [46.5,18],[56.7,22.1],[44.8,24.4],[52.3,27.2],[44.9,30.6],
[60.7,32.9],[53.6,34.6],[36.7,35.8],[42.2,40],[52.6,40],
[60.6,41.4],[31.8,45.3],[69.6,46.2],[40.3,48.1],[50.3,48.5],
[64.4,50],[31,50.5],[44.9,52.3],[59.8,54.1],[25.4,54.8],
[69.4,55.3],[31.1,58.4],[74.8,59.7],[48.7,60.2],[59.7,60.6],
[42.2,63.8],[49.3,65.4],[22.7,65.8],[72.6,66.4],[37.7,68.4],
[28.6,69.4],[59.2,69.4],[45.8,70],[80.3,72.3],[34.2,73.2],
[50.4,74.5],[23.2,75.3],[67.2,76.6],[41,77.3],[75,77.8]
  ].map(([left,top])=>({left,top}));
  const SLOT_COUNT=SLOT_POSITIONS.length;
  // 7 et 40 sont premiers entre eux : chaque place est visitée une seule fois.
  const slotForSubmission=number=>((number*7-1)%SLOT_COUNT)+1;
  const isDemo=root.hasAttribute('data-tree-demo');
  const demoRows=[];
  let selectedColor=0,selectedFinish=0,db=null,user=null,readyToPost=false,ornamentRows=[];
  let sceneApi=null;
  const colorChoice=(name)=>palette.find(p=>p[0]===name)||palette[0];
  const setStatus=(s,error=false)=>{feedback.textContent=s;feedback.classList.toggle('is-error',error);};
  function updateSelections(){
    const [name,color]=palette[selectedColor], [code,label]=finishes[selectedFinish];
    [...swatches.children].forEach((button,i)=>{
      button.setAttribute('aria-pressed',String(i===selectedColor));
      button.querySelector('.sample-ball').dataset.finish=code;
    });
    [...finishesRoot.children].forEach((button,i)=>{
      button.setAttribute('aria-pressed',String(i===selectedFinish));
      button.querySelector('.sample-ball').style.setProperty('--ornament-color',color);
    });
    if(previewBall){previewBall.dataset.finish=code;previewBall.style.setProperty('--ornament-color',color);}
    if(previewLabel)previewLabel.textContent=name+' · '+label;
  }
  function initSelectors(){
    palette.forEach(([name,color],i)=>{
      const button=document.createElement('button');button.type='button';button.className='halaryk-tree-swatch';
      button.innerHTML='<span class="sample-ball halaryk-tree-ball-surface"></span><span></span>';
      button.querySelector('.sample-ball').style.setProperty('--ornament-color',color);
      button.lastChild.textContent=name;
      button.setAttribute('aria-label','Couleur '+name);
      button.addEventListener('click',()=>{selectedColor=i;updateSelections();});
      swatches.append(button);
    });
    finishes.forEach(([code,label],i)=>{
      const button=document.createElement('button');button.type='button';button.className='halaryk-tree-finish';
      button.innerHTML='<span class="sample-ball halaryk-tree-ball-surface"></span><span></span>';
      button.querySelector('.sample-ball').dataset.finish=code;button.lastChild.textContent=label;
      button.setAttribute('aria-label','Finition '+label);
      button.addEventListener('click',()=>{selectedFinish=i;updateSelections();});
      finishesRoot.append(button);
    });
    root.querySelector('[data-tree-finish-prev]')?.addEventListener('click',()=>finishesRoot.scrollBy({left:-260,behavior:'smooth'}));
    root.querySelector('[data-tree-finish-next]')?.addEventListener('click',()=>finishesRoot.scrollBy({left:260,behavior:'smooth'}));
    form.elements.message.addEventListener('input',()=>chars.textContent=form.elements.message.value.length+' / 180');
    updateSelections();
  }
  initSelectors();
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
      button.dataset.finish=finishChoice(row.finish);
      button.setAttribute('aria-label','Lire un message déposé sur le sapin');
      const orb=document.createElement('span');
      orb.className='bauble halaryk-tree-ball-surface';
      orb.dataset.finish=button.dataset.finish;
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
  function demoPlace(message,style,finish,anonymous=false,animate=true){
    if(demoRows.length>=SLOT_COUNT)return null;
    const slot=slotForSubmission(demoRows.length+1);
    const row={
      id:'demo-'+(demoRows.length+1),
      style,finish,message,author:anonymous?'Anonyme':'Visiteur test',
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
    const message=form.elements.message.value.trim(),style=palette[selectedColor][0],finish=finishes[selectedFinish][0];
    if(!message||message.length>180)return setStatus('Le message doit contenir entre 1 et 180 caractères.',true);
    const anonymous=!!form.elements.anonymous.checked;
    if(isDemo){
      demoPlace(message,style,finish,anonymous);
      form.reset();chars.textContent='0 / 180';
      return;
    }
    const submit=form.querySelector('[data-tree-submit]');submit.disabled=true;
    try{
      const {data,error}=await db.rpc('christmas_tree_place_2026',{p_style:style,p_finish:finish,p_message:message,p_anonymous:anonymous});
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
        demoPlace('Un souhait pour Noël — visiteur '+n,palette[(n-1)%palette.length][0],finishes[(n-1)%finishes.length][0],n%3===0,i===total-1);
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