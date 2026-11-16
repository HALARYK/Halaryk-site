/* HALARYK — Sapin Noël 2026 : moteur léger Three.js (r149 UMD).
   Arbre en 3D, lumières et cadeaux ; 0 décoration avant participation.
   L'identité et les droits d'écriture sont contrôlés côté Supabase via RPC. */
(() => {
  'use strict';
  const root=document.querySelector('[data-christmas-root]');
  if(!root)return;
  const stage=root.querySelector('[data-tree-stage]'),loading=root.querySelector('[data-tree-loading]');
  const form=root.querySelector('[data-tree-form]'),fieldset=root.querySelector('[data-tree-fieldset]');
  const login=root.querySelector('[data-tree-login]'),signin=root.querySelector('[data-tree-signin]');
  const feedback=root.querySelector('[data-tree-feedback]'),swatches=root.querySelector('[data-tree-swatches]');
  const count=root.querySelector('[data-tree-count]'),chars=root.querySelector('[data-tree-chars]');
  const dialog=document.querySelector('[data-tree-message-dialog]');
  const palette=[
    ['Bordeaux','#8b283b'],['Ivoire','#e8dccb'],['Doré','#c4a66d'],
    ['Rose','#bd8b8b'],['Cuivre','#ae714f'],['Vert','#31594d']
  ];
  const SEASON_OPEN=Date.parse('2026-11-30T23:00:00Z');
  const TAU=Math.PI*2;
  let selected=0,db=null,user=null,readyToPost=false,ornamentRows=[];
  let sceneApi=null;
  const rng=(seed)=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};
  const rnd=rng(20261201);
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
  function makePineTexture(){
    // Une texture d'aiguilles 256 px partagée entre ~1000 rameaux en 3D.
    const c=document.createElement('canvas');c.width=c.height=256;
    const x=c.getContext('2d');x.clearRect(0,0);
    const r=rng(54011);
    x.lineCap='round';
    x.strokeStyle='rgba(65,82,49,.98)';x.lineWidth=2.6;
    x.beginPath();x.moveTo(128,255);x.quadraticCurveTo(126,136,128,15);x.stroke();
    for(let j=0;j<130;j++){
      const y=20+r()*226,t=(255-y)/255, side=j%2?1:-1;
      const breadth=(22+65*Math.sin(Math.PI*t))*(.62+r()*.6);
      const dy=(14+r()*32);
      const bx=128+(r()-.5)*8;
      x.strokeStyle=['rgba(38,76,44,.96)','rgba(70,99,55,.96)','rgba(29,68,45,.96)','rgba(110,125,74,.9)'][Math.floor(r()*4)];
      x.lineWidth=1.2+r()*1.9;x.beginPath();x.moveTo(bx,y);x.lineTo(bx+side*breadth,y-dy);x.stroke();
      if(j%3===0){x.strokeStyle='rgba(138,153,98,.7)';x.lineWidth=.8;x.beginPath();x.moveTo(bx+side*12,y-2);x.lineTo(bx+side*breadth*.85,y-dy-4);x.stroke();}
    }
    const texture=new THREE.CanvasTexture(c);texture.anisotropy=2;return texture;
  }
  function createFoliage(group){
    const H=6.35, radius=y=>Math.max(.06,2.36*Math.pow(Math.max(0,1-y/H),.86));
    const bark=new THREE.MeshLambertMaterial({color:0x4b3425});
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.045,.18,H,7,1),bark);
    trunk.position.y=H/2;group.add(trunk);
    const branches=new THREE.InstancedMesh(new THREE.CylinderGeometry(.015,.048,1,5),bark,470);
    const branchDummy=new THREE.Object3D(),branchA=new THREE.Vector3(),branchB=new THREE.Vector3();
    let bIndex=0;
    const texture=makePineTexture();
    const needleMaterial=new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.13,depthWrite:true});
    const sprayGeo=new THREE.PlaneGeometry(1.0,1.12);
    const countSprays=1280;
    const needles=new THREE.InstancedMesh(sprayGeo,needleMaterial,countSprays);
    const sprig=new THREE.Object3D(), tint=new THREE.Color();
    for(let i=0;i<countSprays;i++){
      const y=.42+rnd()*5.78;
      const theta=rnd()*TAU, R=radius(y);
      const reach=R*(.43+rnd()*.61);
      sprig.position.set(Math.sin(theta)*reach,y+(rnd()-.5)*.08,Math.cos(theta)*reach);
      sprig.rotation.set((rnd()-.5)*.24,theta+(rnd()-.5)*.85,(rnd()-.5)*.35);
      const near=1.0-y/H;
      sprig.scale.set(.45+rnd()*.5,(.48+rnd()*.53)*Math.max(.45,near),1);
      sprig.updateMatrix();needles.setMatrixAt(i,sprig.matrix);
      tint.setRGB(.60+rnd()*.30,.68+rnd()*.24,.58+rnd()*.24);
      needles.setColorAt(i,tint);
      if(i%3===0&&bIndex<470){
        branchA.set(Math.sin(theta)*.07,y+.12,Math.cos(theta)*.07);
        branchB.set(Math.sin(theta)*reach,y-.06,Math.cos(theta)*reach);
        const dir=branchB.clone().sub(branchA);
        branchDummy.position.copy(branchA).add(branchB).multiplyScalar(.5);
        branchDummy.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
        branchDummy.scale.setScalar(1);branchDummy.scale.y=dir.length();branchDummy.updateMatrix();
        branches.setMatrixAt(bIndex++,branchDummy.matrix);
      }
    }
    needles.instanceMatrix.needsUpdate=true;
    if(needles.instanceColor)needles.instanceColor.needsUpdate=true;
    branches.count=bIndex;branches.instanceMatrix.needsUpdate=true;
    group.add(branches,needles);
    return {H,radius};
  }
  function addLights(group,tree){
    const points=[],bulbs=[],N=92,samples=260;
    for(let i=0;i<=samples;i++){
      const t=i/samples,y=.64+5.35*t,angle=TAU*7.4*t+.4;
      const r=tree.radius(y)*1.075;
      points.push(new THREE.Vector3(Math.sin(angle)*r,y,Math.cos(angle)*r));
    }
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x6d5a36,transparent:true,opacity:.45}));
    group.add(line);
    const ball=new THREE.InstancedMesh(new THREE.SphereGeometry(.039,7,5),new THREE.MeshBasicMaterial({color:0xffd7a1}),N);
    const d=new THREE.Object3D(), positions=[];
    for(let j=0;j<N;j++){
      const p=points[Math.min(samples,Math.floor(j*samples/N))];
      d.position.copy(p);d.scale.setScalar(j%6===0?1.28:1);d.updateMatrix();
      ball.setMatrixAt(j,d.matrix);positions.push(p.x,p.y,p.z);
    }
    ball.instanceMatrix.needsUpdate=true;group.add(ball);
    // Petites halos : un unique système de points, sans 92 vraies sources lumineuses.
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
    const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0,'rgba(255,246,215,1)');grad.addColorStop(.16,'rgba(255,225,159,.8)');grad.addColorStop(1,'rgba(255,220,150,0)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const halo=new THREE.Points(geom,new THREE.PointsMaterial({map:new THREE.CanvasTexture(canvas),size:.34,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xffe4b9}));
    group.add(halo);return halo;
  }
  function addGifts(group){
    const gifts=[
      [-1.85,.64,.62,.55,0x853843,0xc5a776],[-1.0,.95,.73,.42,0xc8b3a0,0x977045],
      [1.62,.72,.67,.55,0x725453,0xd1b489],[2.04,-.36,.5,.40,0x9e8477,0xe5cba8],
      [-.26,1.44,.66,.52,0x71303a,0xd5b581],[-1.93,-.73,.51,.43,0xb08d72,0xf1dab0],[.96,-1.25,.64,.47,0x9a6572,0xc1a07b]
    ];
    gifts.forEach(([x,z,w,h,col,rib],index)=>{
      const g=new THREE.Group();g.position.set(x,h/2+.03,z);g.rotation.y=index*.37;
      const mat=new THREE.MeshLambertMaterial({color:col}),rMat=new THREE.MeshStandardMaterial({color:rib,metalness:.48,roughness:.36});
      const box=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),mat);
      const strip1=new THREE.Mesh(new THREE.BoxGeometry(w+.012,h+.014,w*.14),rMat);
      const strip2=new THREE.Mesh(new THREE.BoxGeometry(w*.14,h+.014,w+.012),rMat);
      const lid=new THREE.Mesh(new THREE.BoxGeometry(w*1.035,.06,w*1.035),mat);lid.position.y=h/2+.015;
      const knot=new THREE.Mesh(new THREE.TorusGeometry(w*.10,w*.018,5,12),rMat);knot.rotation.x=Math.PI/2;knot.position.y=h/2+.08;
      g.add(box,strip1,strip2,lid,knot);group.add(g);
    });
  }
  function addGround(scene){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d'),grad=ctx.createRadialGradient(64,64,5,64,64,64);
    grad.addColorStop(0,'rgba(0,0,0,.55)');grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(8.4,8.4),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,opacity:.9}));
    ground.rotation.x=-Math.PI/2;ground.position.y=-.015;scene.add(ground);
  }

  // Mode secours : la photo réaliste reste visible même lorsque WebGL est bloqué.
  function createFallback(){
    const plane=stage.querySelector('[data-tree-fallback-ornaments]');
    const shown=new Set();
    const instructions=stage.querySelector('.halaryk-tree-scene-footer span');
    if(instructions)instructions.textContent='Clique sur une boule pour lire son message';
    loading.hidden=true;
    return {
      setPaused(){},
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
  function create3D(){
    if(!globalThis.THREE)throw new Error('Three.js est indisponible.');
    let renderer;
    try {
      renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'default'});
    } catch(firstError) {
      renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'default'});
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.2));
    renderer.setClearColor(0x000000,0);
    renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.38;
    stage.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);
    scene.add(new THREE.HemisphereLight(0xcbd8c8,0x352b26,1.85));
    const key=new THREE.DirectionalLight(0xffefdb,1.8);key.position.set(-6,9,8);scene.add(key);
    const fill=new THREE.DirectionalLight(0x8faba0,.85);fill.position.set(6,4,-7);scene.add(fill);
    const amber=new THREE.PointLight(0xffca91,1.1,12);amber.position.set(0,3,4);scene.add(amber);
    const group=new THREE.Group();scene.add(group);
    const info=createFoliage(group),halo=addLights(group,info);
    addGifts(group);addGround(scene);
    const ornaments=[],raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();
    const matCap=new THREE.MeshStandardMaterial({color:0xc6a16b,metalness:.70,roughness:.32});
    function appendOrnament(row){
      if(ornaments.some(e=>e.id===row.id))return;
      const style=colorChoice(row.style),container=new THREE.Group();
      const sphere=new THREE.Mesh(new THREE.SphereGeometry(.135,14,10),new THREE.MeshStandardMaterial({color:style[1],metalness:.47,roughness:.21}));
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.040,.043,.050,8),matCap);cap.position.y=.145;
      const loop=new THREE.Mesh(new THREE.TorusGeometry(.032,.009,5,11),matCap);loop.position.y=.184;
      container.add(sphere,cap,loop);
      const index=Math.max(0,Number(row.position_index)||0);
      const y=.85+((index*97)%367)/367*4.75;
      const a=(index*2.39996323)%TAU;
      const r=info.radius(y)*1.10;
      container.position.set(Math.cos(a)*r,y,Math.sin(a)*r);
      container.userData={id:row.id,message:String(row.message||''),author:row.author||'Anonyme'};
      group.add(container);ornaments.push(container);
    }
    let dragging=false,moved=false,lastX=0,downX=0,downY=0,paused=false;
    const canvas=renderer.domElement;
    canvas.setAttribute('tabindex','0');
    canvas.setAttribute('aria-label','Sapin 3D. Glissez pour tourner, cliquez sur une boule pour lire le message.');
    canvas.addEventListener('pointerdown',e=>{
      dragging=true;moved=false;downX=lastX=e.clientX;downY=e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove',e=>{
      if(!dragging)return;
      if(Math.abs(e.clientX-downX)+Math.abs(e.clientY-downY)>5)moved=true;
      const dx=e.clientX-lastX;lastX=e.clientX;group.rotation.y+=dx*.006;
    });
    canvas.addEventListener('pointerup',e=>{
      if(!dragging)return;dragging=false;
      if(moved||!ornaments.length)return;
      const b=canvas.getBoundingClientRect();
      mouse.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height*2-1));
      raycaster.setFromCamera(mouse,camera);
      const hits=raycaster.intersectObjects(ornaments,true);
      if(!hits.length)return;
      let n=hits[0].object;while(n&&!n.userData?.message)n=n.parent;
      if(n?.userData?.message)showMessage(n.userData.message,n.userData.author);
    });
    canvas.addEventListener('pointercancel',()=>dragging=false);
    canvas.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
        e.preventDefault();group.rotation.y+=e.key==='ArrowLeft'?.16:-.16;
      }
    });
    const resize=()=>{
      const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
      renderer.setSize(w,h,false);camera.aspect=w/h;
      camera.fov=w<530?43:36;camera.position.set(0,3.7,w<530?15.8:12.6);
      camera.lookAt(0,3.04,0);camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(stage);resize();
    let active=true,last=performance.now();
    if('IntersectionObserver' in window)new IntersectionObserver(e=>active=!!e[0]?.isIntersecting,{threshold:.02}).observe(stage);
    const reduced=matchMedia('(prefers-reduced-motion:reduce)');
    const frame=now=>{
      requestAnimationFrame(frame);const dt=Math.min(.06,(now-last)/1000);last=now;
      if(!active||document.hidden)return;
      if(!dragging&&!paused&&!reduced.matches)group.rotation.y+=dt*.055;
      halo.material.opacity=.83+.13*Math.sin(now/1300);
      renderer.render(scene,camera);
    };
    requestAnimationFrame(frame);
    loading.hidden=true;
    return {setPaused(v){paused=!!v;},setOrnaments(rows){for(const row of rows)appendOrnament(row);},removeAll(){for(const g of ornaments)group.remove(g);ornaments.length=0;}};
  }
  let lastFocus=null;
  function showMessage(message,author){
    if(!dialog)return;
    lastFocus=document.activeElement;
    dialog.querySelector('[data-tree-message-text]').textContent=message;
    dialog.querySelector('[data-tree-message-author]').textContent=author;
    dialog.hidden=false;sceneApi?.setPaused(true);
    dialog.querySelector('[data-tree-close]').focus();
  }
  function closeMessage(){
    if(!dialog)return;
    dialog.hidden=true;sceneApi?.setPaused(false);lastFocus?.focus?.();
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
      count.textContent=ornamentRows.length+' boule'+(ornamentRows.length>1?'s':'')+' accrochée'+(ornamentRows.length>1?'s':'');
      readyToPost=true;
    }catch{
      readyToPost=false;
      count.textContent='Le sapin attend vos messages';
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
  // Une seule initialisation WebGL, sans attente d'authentification.
  try {
    sceneApi=create3D();
    stage.classList.add('has-webgl');
  } catch(err) {
    console.error('Sapin 3D :',err);
    // Le sapin reste affiché : la 3D n'est pas indispensable à la participation.
    // Message diagnostique complet conservé uniquement dans la console.
    stage.querySelector('canvas')?.remove();
    sceneApi=createFallback();
  }
  updateAuthState();
  if(location.protocol!=='file:'){
    getDb().then(async client=>{
      await refreshUser();await loadOrnaments();
      client.auth.onAuthStateChange(()=>setTimeout(refreshUser,0));
    }).catch(err=>console.warn('Sapin communauté : backend indisponible',err));
  }else setStatus('Aperçu local : connexion et publication Twitch disponibles uniquement sur le site hébergé.');
})();