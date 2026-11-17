/* HALARYK Noël 2026 — Sapin réaliste 2D et décorations interactives.
   Connexion Twitch et droits gérés côté Supabase. */
(() => {
  'use strict';
  const root=document.querySelector('[data-christmas-root]');
  if(!root)return;
  const stage=root.querySelector('[data-tree-stage]');
  const form=root.querySelector('[data-tree-form]'),fieldset=root.querySelector('[data-tree-fieldset]');
  const login=root.querySelector('[data-tree-login]'),signin=root.querySelector('[data-tree-signin]');
  const feedback=root.querySelector('[data-tree-feedback]');
  const modelsRoot=root.querySelector('[data-tree-models]');
  const previewBall=root.querySelector('[data-tree-preview-ornament]');
  const previewLabel=root.querySelector('[data-tree-preview-label]');
  const previewDescription=root.querySelector('[data-tree-preview-description]');
  const chars=root.querySelector('[data-tree-chars]');
  const bubble=document.querySelector('[data-tree-message-bubble]');
  // Collection HALARYK — dix modèles dessinés pour cette édition,
  // chacun avec un motif et une silhouette, sans déclinaison artificielle de teinte.
  const models=[
    {id:"herbier",name:"Herbier sous verre",description:"Fleurs séchées et feuillage délicat dans un globe translucide."},
    {id:"celeste",name:"Nuit céleste",description:"Bleu nuit, constellations et croissant de lune doré."},
    {id:"ancien",name:"Verre ancien",description:"Verre patiné, argent vieilli et éclats de lumière."},
    {id:"monde",name:"Petit monde miniature",description:"Un cerf dans une forêt enneigée, enfermé sous verre."},
    {id:"baroque",name:"Joyau baroque",description:"Grenat profond, arabesques d’or et petites perles."},
    {id:"velours",name:"Ruban de velours",description:"Boule bordeaux satinée et grand nœud de velours."},
    {id:"tartan",name:"Tartan écossais",description:"Carreaux écossais vert sapin, rouge sombre et or."},
    {id:"roses",name:"Roses anciennes",description:"Porcelaine ivoire et roses fanées peintes à la main."},
    {id:"oeuf",name:"Œuf précieux",description:"Œuf émaillé inspiré de l’orfèvrerie ancienne."},
    {id:"maison",name:"Petite maison d’hiver",description:"Un chalet aux fenêtres dorées sous une neige douce."}
  ];
  const modelById=id=>models.find(m=>m.id===id)||models[0];
  // Un même visuel HD pour la sélection, l'aperçu et le sapin.
  // Les dix IDs sont définis localement, jamais fournis par un visiteur.
  function ornamentMarkup(modelId){
    const model=modelById(modelId);
    return '<span class="halaryk-tree-ornament-photo" aria-hidden="true" data-model="'+model.id+'"></span>';
  }
  const SEASON_OPEN=Date.parse('2026-11-21T09:00:00+01:00');
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
  let selectedModel=0,db=null,user=null,readyToPost=false,hasPlaced=false,totalUsed=0,ornamentRows=[],lastFingerprint='';
  let sceneApi=null;
  const setStatus=(s,error=false)=>{feedback.textContent=s;feedback.classList.toggle('is-error',error);};
  function updateSelection(){
    const chosen=models[selectedModel];
    [...modelsRoot.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selectedModel)));
    if(previewBall)previewBall.innerHTML=ornamentMarkup(chosen.id);
    if(previewLabel)previewLabel.textContent=chosen.name;
    if(previewDescription)previewDescription.textContent=chosen.description;
  }
  function initModels(){
    models.forEach((model,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='halaryk-tree-model-option';
      button.setAttribute('aria-label','Choisir '+model.name);
      button.setAttribute('aria-pressed',String(index===selectedModel));
      const picture=document.createElement('span');
      picture.className='halaryk-tree-model-option-image';
      picture.innerHTML=ornamentMarkup(model.id);
      const title=document.createElement('span');
      title.className='halaryk-tree-model-option-title';
      title.textContent=model.name;
      button.append(picture,title);
      button.addEventListener('click',()=>{selectedModel=index;updateSelection();});
      modelsRoot.append(button);
    });
    root.querySelector('[data-tree-model-prev]')?.addEventListener('click',()=>modelsRoot.scrollBy({left:-280,behavior:'smooth'}));
    root.querySelector('[data-tree-model-next]')?.addEventListener('click',()=>modelsRoot.scrollBy({left:280,behavior:'smooth'}));
    form.elements.message.addEventListener('input',()=>chars.textContent=form.elements.message.value.length+' / 180');
    updateSelection();
  }
  initModels();
  const canPost=()=>isDemo
    ? demoRows.length<SLOT_COUNT
    : !!user&&Date.now()>=SEASON_OPEN&&readyToPost&&!hasPlaced&&totalUsed<SLOT_COUNT&&location.protocol!=='file:';
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
    if(signed&&hasPlaced)setStatus('Ta décoration est déjà accrochée au sapin. Merci pour ta participation.');
    else if(totalUsed>=SLOT_COUNT)setStatus('Le sapin est complet : les 40 emplacements sont réservés.');
    else if(signed&&!readyToPost)setStatus('Publication indisponible : service sécurisé à vérifier dans l’administration.');
    else if(signed&&Date.now()<SEASON_OPEN)setStatus('Tu es connecté à Twitch. Ouverture le 21 novembre à 9 h (heure de Paris).');
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
      const decoration=modelById(row.model);
      button.setAttribute('aria-label','Lire un message déposé sur le sapin');
      const orb=document.createElement('span');
      orb.className='bauble halaryk-tree-model-orb';
      orb.innerHTML=ornamentMarkup(decoration.id);
      button.append(orb);
      button.addEventListener('click',e=>{
        e.stopPropagation();
        showMessage(String(row.message||''),String(row.author||'Anonyme'),button);
      });
      button.addEventListener('pointerenter',()=>cancelHideMessage());
      button.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')scheduleHideMessage();});
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
  // Une bulle de message non modale, placée à côté de la boule cliquée.
  // Souris : elle disparaît quand on quitte la boule/la bulle.
  // Tactile ou clavier : fermer avec la croix, Échap ou un clic extérieur.
  let activeOrnament=null,hideTimer=null;
  function cancelHideMessage(){
    if(hideTimer!==null){clearTimeout(hideTimer);hideTimer=null;}
  }
  function closeMessage(){
    cancelHideMessage();
    if(bubble)bubble.hidden=true;
    activeOrnament=null;
  }
  function scheduleHideMessage(){
    cancelHideMessage();
    hideTimer=setTimeout(closeMessage,200);
  }
  function showMessage(message,author,button){
    if(!bubble)return;
    if(activeOrnament===button&&!bubble.hidden){closeMessage();return;}
    cancelHideMessage();
    activeOrnament=button;
    bubble.querySelector('[data-tree-message-text]').textContent=message;
    bubble.querySelector('[data-tree-message-author]').textContent=author;
    bubble.hidden=false;
    const buttonRect=button.getBoundingClientRect();
    const pop=bubble.getBoundingClientRect();
    const gap=11,margin=12;
    const availableRight=window.innerWidth-buttonRect.right-gap-margin;
    let left=availableRight>=pop.width
      ?buttonRect.right+gap
      :buttonRect.left-pop.width-gap;
    left=Math.max(margin,Math.min(left,window.innerWidth-pop.width-margin));
    let top=buttonRect.top+buttonRect.height/2-pop.height/2;
    top=Math.max(margin,Math.min(top,window.innerHeight-pop.height-margin));
    bubble.style.left=Math.round(left)+'px';
    bubble.style.top=Math.round(top)+'px';
  }
  bubble?.querySelector('[data-tree-close]')?.addEventListener('click',closeMessage);
  bubble?.addEventListener('pointerenter',cancelHideMessage);
  bubble?.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')scheduleHideMessage();});
  document.addEventListener('pointerdown',e=>{
    if(bubble&&!bubble.hidden&&!bubble.contains(e.target)
       &&!e.target.closest('[data-tree-fallback-ornaments]'))closeMessage();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMessage();});
  window.addEventListener('resize',closeMessage);
  window.addEventListener('scroll',closeMessage,{passive:true});
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
    hasPlaced=false;
    if(user){
      const {data,error}=await db.rpc('christmas_tree_has_placed_2026');
      if(!error)hasPlaced=Boolean(data);
      else console.warn('Contrôle des participations indisponible :',error.message);
    }
    updateAuthState();
  }
  async function loadOrnaments(animateId=null){
    if(!db||isDemo)return;
    try{
      const [publicResult,usedResult]=await Promise.all([
        db.rpc('christmas_tree_public_2026'),
        db.rpc('christmas_tree_used_slots_2026')
      ]);
      if(publicResult.error)throw publicResult.error;
      if(usedResult.error)throw usedResult.error;
      const nextRows=Array.isArray(publicResult.data)?publicResult.data:[];
      const fingerprint=JSON.stringify(nextRows.map(row=>[row.id,row.model,row.message,row.author,row.position_index]));
      if(fingerprint!==lastFingerprint||animateId){
        sceneApi?.removeAll();
        closeMessage();
        sceneApi?.setOrnaments(nextRows,{animateId});
        lastFingerprint=fingerprint;
      }
      ornamentRows=nextRows;
      totalUsed=Number(usedResult.data)||0;
      readyToPost=totalUsed<SLOT_COUNT;
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
  function demoPlace(message,model,anonymous=false,animate=true){
    if(demoRows.length>=SLOT_COUNT)return null;
    const slot=slotForSubmission(demoRows.length+1);
    const row={
      id:'demo-'+(demoRows.length+1),
      model,message,author:anonymous?'Anonyme':'Visiteur test',
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
    const message=form.elements.message.value.trim(),model=models[selectedModel].id;
    if(!message||message.length>180)return setStatus('Le message doit contenir entre 1 et 180 caractères.',true);
    const anonymous=!!form.elements.anonymous.checked;
    if(isDemo){
      demoPlace(message,model,anonymous);
      form.reset();chars.textContent='0 / 180';
      return;
    }
    const submit=form.querySelector('[data-tree-submit]');submit.disabled=true;
    try{
      const {data,error}=await db.rpc('christmas_tree_place_2026',{p_model:model,p_message:message,p_anonymous:anonymous});
      if(error)throw error;
      form.reset();chars.textContent='0 / 180';
      hasPlaced=true;
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
        demoPlace('Un souhait pour Noël — visiteur '+n,models[(n-1)%models.length].id,n%3===0,i===total-1);
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
  window.addEventListener('halaryk:christmas-open',()=>{
    updateAuthState();
    if(db&&!isDemo)loadOrnaments().catch(()=>{});
  });
  // Synchroniser les messages masqués ou ajoutés par d'autres visiteurs.
  if(!isDemo)setInterval(()=>{
    if(db&&!document.hidden&&!root.hidden)loadOrnaments().catch(()=>{});
  },30000);
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