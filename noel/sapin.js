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
  const dialog=document.querySelector('[data-tree-message-dialog]');
  // Collection HALARYK — dix modèles dessinés pour cette édition,
  // chacun avec un motif et une silhouette, sans déclinaison artificielle de teinte.
  const models=[
    {id:'herbier',name:'Herbier sous verre',description:'Fleurs séchées et feuillage délicat dans un globe translucide.',top:'#c7d6c7',base:'#365e53',transparent:true,art:`
      <g stroke="#b18a62" stroke-width="1.8" fill="none" stroke-linecap="round">
        <path d="M60 113Q48 88 56 45M60 110Q77 90 78 52M57 94Q40 75 39 61"/>
      </g>
      <g fill="#6d8762"><ellipse cx="49" cy="78" rx="4" ry="9" transform="rotate(-38 49 78)"/><ellipse cx="64" cy="87" rx="4" ry="10" transform="rotate(48 64 87)"/><ellipse cx="75" cy="70" rx="4" ry="8" transform="rotate(34 75 70)"/><ellipse cx="44" cy="66" rx="3" ry="7" transform="rotate(-45 44 66)"/></g>
      <g fill="#d2a0a1" stroke="#f5d4bc" stroke-width=".6">
        <ellipse cx="55" cy="49" rx="7" ry="4" transform="rotate(12 55 49)"/><ellipse cx="55" cy="49" rx="7" ry="4" transform="rotate(78 55 49)"/><ellipse cx="55" cy="49" rx="7" ry="4" transform="rotate(144 55 49)"/><ellipse cx="55" cy="49" rx="7" ry="4" transform="rotate(210 55 49)"/><circle cx="55" cy="49" r="3" fill="#d3ae68"/>
        <ellipse cx="78" cy="52" rx="6" ry="3.2"/><ellipse cx="78" cy="52" rx="6" ry="3.2" transform="rotate(72 78 52)"/><ellipse cx="78" cy="52" rx="6" ry="3.2" transform="rotate(144 78 52)"/><circle cx="78" cy="52" r="2.6" fill="#e9c68b"/>
      </g>
      <g fill="#efe0c5" opacity=".85"><circle cx="39" cy="61" r="2"/><circle cx="42" cy="56" r="1.5"/><circle cx="36" cy="65" r="1.7"/><circle cx="68" cy="59" r="1.3"/></g>`},
    {id:'celeste',name:'Nuit céleste',description:'Bleu nuit, constellations et croissant de lune doré.',top:'#344562',base:'#091522',art:`
      <g fill="#d9bc7d"><path d="M64 48A22 22 0 1 0 83 88A25 25 0 1 1 64 48Z"/><path d="M38 47l2.4 6.3 6.3 2.4-6.3 2.2-2.4 6.4-2.2-6.4-6.3-2.2 6.3-2.4z"/><path d="M85 45l1.7 4.4 4.4 1.8-4.4 1.5-1.7 4.5-1.6-4.5-4.5-1.5 4.5-1.8z"/><path d="M88 94l1.6 4.3 4.4 1.6-4.4 1.6-1.6 4.4-1.7-4.4-4.3-1.6 4.3-1.6z"/></g>
      <g fill="#f8e9c7"><circle cx="48" cy="84" r="1.8"/><circle cx="43" cy="100" r="1.4"/><circle cx="76" cy="41" r="1.5"/><circle cx="83" cy="74" r="1.8"/><circle cx="67" cy="105" r="1.4"/></g><path d="M48 84L43 100L67 105L83 74" stroke="#c5b9a2" stroke-width=".7" opacity=".5" fill="none"/>`},
    {id:'ancien',name:'Verre ancien',description:'Verre patiné, argent vieilli et éclats de lumière.',top:'#bca98c',base:'#50534c',art:`
      <g fill="none" stroke="#efdbab" opacity=".82"><circle cx="60" cy="78" r="37" stroke-width="1.4" stroke-dasharray="4 3"/><path d="M28 77Q57 39 92 75M30 88Q59 111 91 86" stroke-width="2"/><path d="M43 49q13 13 18 25q16-18 19-25M45 106q14-16 18-28q16 14 18 27" stroke-width="1.2"/></g>
      <g fill="#e1c994" opacity=".8"><circle cx="60" cy="77" r="5"/><circle cx="44" cy="77" r="2.2"/><circle cx="76" cy="77" r="2.2"/><circle cx="60" cy="53" r="2"/><circle cx="60" cy="102" r="2"/></g>
      <g fill="#243b37" opacity=".42"><path d="M30 64l10-8 12 3-5 9-12 6z"/><path d="M70 97l9-15 12 8-4 13-11 8z"/><path d="M46 104l8-4 2 14-14-7z"/></g>`},
    {id:'monde',name:'Petit monde miniature',description:'Un cerf dans une forêt enneigée, enfermé sous verre.',top:'#a5c5bd',base:'#203e40',transparent:true,art:`
      <path d="M17 96Q60 77 104 95V130H17Z" fill="#cbd9c7"/><path d="M19 103Q62 92 105 107V130H19Z" fill="#e5e9dc"/>
      <g fill="#24493f"><path d="M36 92l12-34 12 34h-7l8 10H27l8-10z"/><path d="M74 95l11-38 12 38h-7l8 11H67l8-11z"/><path d="M23 99l10-29 9 29z"/></g>
      <g fill="#8b6b51"><path d="M54 105Q63 94 71 104L68 112H58Z"/><path d="M58 105l-2-18 6 12m3 3 7-11-3 12" fill="none" stroke="#bba282" stroke-width="1.7"/><path d="M58 109v13m10-13v13" stroke="#6a503a" stroke-width="2.5"/></g>
      <g fill="#fff9e7" opacity=".9"><circle cx="43" cy="53" r="2"/><circle cx="71" cy="51" r="1.4"/><circle cx="90" cy="80" r="1.8"/><circle cx="54" cy="70" r="1.5"/><circle cx="26" cy="77" r="1.2"/><circle cx="81" cy="43" r="2"/></g>`},
    {id:'baroque',name:'Joyau baroque',description:'Grenat profond, arabesques d’or et petites perles.',top:'#a24453',base:'#4c1326',art:`
      <g fill="none" stroke="#e9c582" stroke-width="2.3" stroke-linecap="round">
        <path d="M60 39Q25 41 29 67Q36 88 53 75Q63 60 47 55Q36 52 39 65"/><path d="M60 39Q95 41 91 67Q84 88 67 75Q57 60 73 55Q84 52 81 65"/><path d="M60 112Q31 112 31 91Q34 80 48 83Q54 92 43 97"/><path d="M60 112Q89 112 89 91Q86 80 72 83Q66 92 77 97"/>
        <path d="M60 45V107M41 76h38"/>
      </g><path d="M60 61L74 77L60 94L46 77Z" fill="#e9b8a4" stroke="#efcf92" stroke-width="3"/><path d="M60 66L69 77L60 89L51 77Z" fill="#953047"/>
      <g fill="#fff1d7" stroke="#b59b72" stroke-width=".5"><circle cx="60" cy="47" r="3"/><circle cx="60" cy="109" r="3"/><circle cx="35" cy="78" r="3"/><circle cx="85" cy="78" r="3"/></g>`},
    {id:'velours',name:'Ruban de velours',description:'Boule bordeaux satinée et grand nœud de velours.',top:'#a24d58',base:'#3e1122',art:`
      <path d="M51 37V116M69 37V116" stroke="#c48083" stroke-width="9" opacity=".86"/>
      <path d="M55 47Q32 26 22 46Q26 65 54 58L60 50Q86 25 99 46Q92 65 66 58Z" fill="#8f293d" stroke="#d7a5a0" stroke-width="2"/>
      <path d="M51 56L39 83L56 73L62 60M68 59L81 83L65 71" fill="#7c1d34" stroke="#d7a5a0" stroke-width="1.8"/>
      <path d="M48 42Q36 37 30 47Q40 52 53 54M72 44Q83 37 91 46Q84 54 69 55" stroke="#e2b6ae" stroke-width="2" opacity=".7" fill="none"/>
      <ellipse cx="60" cy="54" rx="9" ry="7" fill="#67202e" stroke="#d2a89a" stroke-width="2"/>`},
    {id:'tartan',name:'Tartan écossais',description:'Carreaux écossais vert sapin, rouge sombre et or.',top:'#3d6356',base:'#19382e',art:`
      <g opacity=".95"><path d="M27 35H42V125H27ZM72 34H89V125H72Z" fill="#742e3b"/><path d="M17 58H103V73H17ZM17 96H103V111H17Z" fill="#742e3b"/>
      <path d="M36 32V125M82 32V125M18 66H104M18 104H104" stroke="#dfc58a" stroke-width="2"/>
      <path d="M41 33V125M87 33V125M18 72H104M18 110H104" stroke="#e9d7aa" stroke-width=".9"/>
      <g stroke="#102a25" stroke-width="1" opacity=".6"><path d="M49 33V125M63 33V125M19 82H105M19 91H105"/></g></g>
      <path d="M28 75h65" stroke="#f0d19b" stroke-width="1" opacity=".4"/>`},
    {id:'roses',name:'Roses anciennes',description:'Porcelaine ivoire et roses fanées peintes à la main.',top:'#fff0d8',base:'#b2a99c',art:`
      <g stroke="#a37c54" stroke-width="1.5" fill="none"><path d="M35 98Q55 80 82 54M39 64Q53 68 60 81"/></g>
      <g fill="#59755d"><ellipse cx="42" cy="91" rx="5" ry="10" transform="rotate(-48 42 91)"/><ellipse cx="70" cy="70" rx="5" ry="10" transform="rotate(49 70 70)"/><ellipse cx="79" cy="90" rx="4" ry="8" transform="rotate(32 79 90)"/></g>
      <g fill="#c9828c" stroke="#f0c4b7" stroke-width="1.4"><path d="M60 62C41 45 34 67 47 77C54 92 80 82 79 64C79 47 63 47 60 62Z"/><path d="M60 65C48 54 43 69 51 75C57 85 73 76 71 67C71 58 60 57 60 65Z" fill="#dca1a4"/><path d="M60 68q-6-8-9 0q-2 8 8 8q11-1 7-10q-3-6-8-2" fill="#be717a"/></g>
      <g fill="#d5a1a4" stroke="#f0c4b7" stroke-width=".8"><circle cx="35" cy="65" r="6"/><circle cx="82" cy="92" r="5"/></g>
      <path d="M33 43Q60 31 88 43M35 108Q60 119 86 108" stroke="#b79560" stroke-width="2" fill="none" opacity=".6"/>`},
    {id:'oeuf',name:'Œuf précieux',description:'Œuf émaillé inspiré de l’orfèvrerie ancienne.',top:'#ae5361',base:'#3d182d',egg:true,art:`
      <g fill="none" stroke="#e6c184" stroke-width="2.2"><path d="M60 34Q29 50 28 86Q33 119 60 125Q87 119 92 86Q91 49 60 34Z"/><path d="M60 45L76 63L60 81L44 63ZM60 80L77 98L60 115L43 98Z"/><path d="M34 77Q60 95 86 77"/></g>
      <path d="M60 53L71 65L60 78L49 65Z" fill="#2e6259" stroke="#f0d9ad" stroke-width="2.8"/>
      <path d="M60 91L69 101L60 111L51 101Z" fill="#f1dcb5" stroke="#ae8b54" stroke-width="2"/>
      <g fill="#f7e8ca" stroke="#a88153" stroke-width=".6"><circle cx="60" cy="40" r="3"/><circle cx="33" cy="88" r="3"/><circle cx="87" cy="88" r="3"/><circle cx="60" cy="123" r="3"/></g>`},
    {id:'maison',name:'Petite maison d’hiver',description:'Un chalet aux fenêtres dorées sous une neige douce.',top:'#9ab8b8',base:'#2b4647',transparent:true,art:`
      <path d="M18 103Q60 89 102 103V128H18Z" fill="#d9e4df"/>
      <g fill="#25473c"><path d="M24 106l10-32 11 32H24zm58 0l10-32 11 32H82z"/></g>
      <path d="M38 79L60 57L83 79V109H38Z" fill="#8a634e" stroke="#e5d7bf" stroke-width="1.8"/><path d="M31 80L60 49L89 80" stroke="#f2eee3" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M43 74V108M77 74V108" stroke="#563e37" stroke-width="3"/>
      <rect x="51" y="83" width="17" height="25" rx="1" fill="#382c29"/><rect x="54" y="88" width="11" height="12" fill="#f5bf65"/><path d="M59.5 88V100M54 94h11" stroke="#6b4938" stroke-width="1.6"/>
      <g fill="#fffaf1"><circle cx="33" cy="50" r="2"/><circle cx="79" cy="42" r="1.5"/><circle cx="88" cy="65" r="2.3"/><circle cx="50" cy="46" r="1.1"/><circle cx="66" cy="38" r="1.7"/></g>`}
  ];
  const modelById=id=>models.find(m=>m.id===id)||models[0];
  let svgSerial=0;
  // 10 ornements photographiques d'un même atlas 5 × 2, sans chargement externe.
  function ornamentMarkup(modelId){
    let index=models.findIndex(m=>m.id===modelId);
    if(index<0)index=0;
    const col=(index%5)*25, row=Math.floor(index/5)*100;
    return '<span class="halaryk-tree-ornament-photo" aria-hidden="true" style="--orn-x:'+col+'%;--orn-y:'+row+'%"></span>';
  }
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
  let selectedModel=0,db=null,user=null,readyToPost=false,ornamentRows=[];
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
      const decoration=modelById(row.model);
      button.setAttribute('aria-label','Lire un message déposé sur le sapin');
      const orb=document.createElement('span');
      orb.className='bauble halaryk-tree-model-orb';
      orb.innerHTML=ornamentMarkup(decoration.id);
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