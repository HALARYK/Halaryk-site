/**
 * HALARYK — prototype décoratif Noël 2026.
 * Three.js, aiguilles/branches instanciées, guirlandes LED, cadeaux et boules d'essai.
 * Aucune écriture distante ni accès aux comptes Twitch dans ce prototype.
 * Pour le 1er décembre, connecter séparément le formulaire à une fonction Supabase sécurisée.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const root = document.querySelector('[data-christmas-root]');
if (root) bootChristmas(root);

function rngFactory(seed=20261201){return()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
const rnd=rngFactory();
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=2*Math.PI;
const COLOR_STYLES=[
  {name:'Rouge profond',color:'#9e3143',metalness:.32,roughness:.23},
  {name:'Or antique',color:'#bc9662',metalness:.84,roughness:.21},
  {name:'Ivoire',color:'#e7d9c9',metalness:.26,roughness:.24},
  {name:'Rose ancien',color:'#b97e83',metalness:.38,roughness:.28},
  {name:'Cuivre',color:'#b77955',metalness:.72,roughness:.2},
  {name:'Vert émeraude',color:'#42665b',metalness:.47,roughness:.22},
];

function makeNeedleCluster(){
  const vertices=[];
  // Faisceaux de fines aiguilles, non pas des cônes : rendu sylvestre de près.
  for(let ring=0;ring<7;ring++){
    const z=ring*.043;
    const taper=1-ring/8;
    for(let side=0;side<4;side++){
      const angle=(side/4)*TAU+(ring%2)*.42;
      const axis=Math.cos(angle),rise=Math.sin(angle);
      const span=(.075+.075*taper)*(side%2?0.91:1.15);
      const zTip=z+.055+.035*taper;
      const bx=axis*.012,by=rise*.012;
      vertices.push(bx,by,z,axis*span,rise*span,zTip,bx*.75,by*.75,z+.031);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.computeVertexNormals();
  return g;
}

function makeBranch(radius,length,start,end){
  const avg=start.clone().add(end).multiplyScalar(.5);
  const dir=end.clone().sub(start);
  const m=new THREE.Object3D();m.position.copy(avg);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
  m.scale.set(radius,dir.length(),radius);m.updateMatrix();return m.matrix.clone();
}

function createFir(group){
  const H=6.55;
  const foliageRadius=y=>Math.max(.05,2.42*Math.pow(Math.max(0,1-y/H),.86));
  const trunkMat=new THREE.MeshStandardMaterial({color:0x4c3428,roughness:1});
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.045,.21,H,10,7),trunkMat);
  trunk.position.y=H/2+.04;trunk.castShadow=true;group.add(trunk);
  const branchMatrices=[],sprigMatrices=[],sprigColors=[];
  const helper=new THREE.Object3D();
  const Z=new THREE.Vector3(0,0,1),out=new THREE.Vector3();
  const foliageColors=['#153b30','#1d4e3a','#26563e','#315a41','#294c3a','#376249','#194535'];
  for(let layer=0;layer<26;layer++){
    const y=.48+layer*.225;
    const t=y/H, radius=foliageRadius(y);
    const count=Math.round(13-5*t);
    for(let i=0;i<count;i++){
      const angle=TAU*(i/count+layer*.6180339)+(rnd()-.5)*.19;
      const reach=radius*(.83+.20*rnd());
      const lower=.21+.19*(1-t);
      const a=new THREE.Vector3(Math.cos(angle)*.09,y,Math.sin(angle)*.09);
      const b=new THREE.Vector3(Math.cos(angle)*reach,y-lower,Math.sin(angle)*reach);
      const primary=b.clone().sub(a);
      branchMatrices.push(makeBranch(lerp(.027,.012,t),primary.length(),a,b));
      const tang=primary.clone().normalize();
      const positions=Math.max(4,Math.round(10-5*t));
      for(let k=1;k<=positions;k++){
        const along=k/(positions+.55);
        const origin=a.clone().lerp(b,along);
        for(let side=0;side<2;side++){
          const swirl=(side===0?-1:1)*(.49+.2*rnd());
          const yaw=angle+swirl;
          const vector=new THREE.Vector3(Math.cos(yaw),-.08-.12*rnd(),Math.sin(yaw)).normalize();
          const pos=origin.clone().addScaledVector(vector,(rnd()-.5)*.085);
          helper.position.copy(pos);
          out.copy(vector).addScaledVector(tang,.19).normalize();
          helper.quaternion.setFromUnitVectors(Z,out);
          helper.rotateZ(rnd()*TAU);
          helper.scale.setScalar((1.0+rnd()*.60)*Math.min(1, .25+.95*(1-t)));
          helper.updateMatrix();sprigMatrices.push(helper.matrix.clone());
          const c=new THREE.Color(foliageColors[Math.floor(rnd()*foliageColors.length)]);
          c.multiplyScalar(.84+rnd()*.25);sprigColors.push(c);
        }
      }
    }
  }
  const branchMesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,5,1),trunkMat,branchMatrices.length);
  branchMatrices.forEach((m,i)=>branchMesh.setMatrixAt(i,m));branchMesh.instanceMatrix.needsUpdate=true;
  group.add(branchMesh);
  const needleMaterial=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.92,metalness:0,flatShading:false});
  const needles=new THREE.InstancedMesh(makeNeedleCluster(),needleMaterial,sprigMatrices.length);
  sprigMatrices.forEach((m,i)=>{needles.setMatrixAt(i,m);needles.setColorAt(i,sprigColors[i]);});
  needles.instanceMatrix.needsUpdate=true;if(needles.instanceColor)needles.instanceColor.needsUpdate=true;
  needles.frustumCulled=false;group.add(needles);
  return {H,foliageRadius,sprigs:sprigMatrices.length};
}

function makeGlowTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;
  const ctx=c.getContext('2d');const gr=ctx.createRadialGradient(32,32,0,32,32,31);
  gr.addColorStop(0,'rgba(255,242,189,1)');gr.addColorStop(.12,'rgba(255,225,155,.92)');gr.addColorStop(.38,'rgba(255,192,106,.20)');gr.addColorStop(1,'rgba(255,172,80,0)');
  ctx.fillStyle=gr;ctx.fillRect(0,0,64,64);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function addLights(group,info){
  const points=[];const samples=240;
  for(let i=0;i<=samples;i++){
    const t=i/samples;const y=.68+t*5.65;
    const a=t*TAU*8.9+.7;
    const r=info.foliageRadius(y)*1.045;
    points.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));
  }
  const wire=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),samples,.009,3,false),new THREE.MeshStandardMaterial({color:0x303b2b,roughness:.83}));
  group.add(wire);
  const positions=[];const matrices=[];
  const ball=new THREE.Object3D();
  for(let i=0;i<92;i++){
    const p=points[Math.floor((i+.5)*samples/92)];positions.push(p.x,p.y,p.z);
    ball.position.copy(p);ball.scale.setScalar(.034+(i%6===0?.011:0));ball.updateMatrix();matrices.push(ball.matrix.clone());
  }
  const lamp=new THREE.InstancedMesh(new THREE.SphereGeometry(1,7,5),new THREE.MeshBasicMaterial({color:0xffe0a0}),matrices.length);
  matrices.forEach((m,i)=>lamp.setMatrixAt(i,m));lamp.instanceMatrix.needsUpdate=true;group.add(lamp);
  const pgeometry=new THREE.BufferGeometry();pgeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const glow=new THREE.Points(pgeometry,new THREE.PointsMaterial({color:0xffdcaa,size:.30,map:makeGlowTexture(),transparent:true,opacity:.73,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  group.add(glow);return glow;
}
function createBow(group,y,material,size){
  for(const side of [-1,1]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(size*.22,size*.044,5,20,Math.PI*1.68),material);
    ring.rotation.z=(side===1?-1:1)*.42;ring.position.set(side*size*.17,y,0);
    group.add(ring);
  }
  const centre=new THREE.Mesh(new THREE.SphereGeometry(size*.09,8,6),material);centre.position.y=y;group.add(centre);
}
function addGifts(group){
  const packages=[
    [-1.96,.54,.71,.76,'#a05e67','#d9b67e',.1],[-1.17,-.35,.75,.52,'#e2d7c5','#b79265',-.24],
    [1.62,.62,.77,.64,'#593337','#c9a16d',.21],[2.12,-.29,.53,.50,'#967d70','#e8d2b3',-.33],
    [-.13,1.55,.82,.55,'#ab747a','#d9c29b',.18],[-2.45,-.45,.40,.49,'#b59070','#f2e0ba',-.16],
    [1.02,-1.30,.62,.65,'#7c303e','#d9ba8e',.36],[-.78,-1.31,.57,.46,'#cbb49c','#7c5158',-.08]
  ];
  for(const [x,z,w,h,base,ribbon,angle] of packages){
    const g=new THREE.Group();g.position.set(x,h/2+.07,z);g.rotation.y=angle;
    const baseMat=new THREE.MeshStandardMaterial({color:base,roughness:.65,metalness:.08});
    const ribMat=new THREE.MeshStandardMaterial({color:ribbon,roughness:.42,metalness:.42,side:THREE.DoubleSide});
    const box=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),baseMat);box.castShadow=true;box.receiveShadow=true;g.add(box);
    const rx=new THREE.Mesh(new THREE.BoxGeometry(w+.012,h+.013,w*.16),ribMat);
    const rz=new THREE.Mesh(new THREE.BoxGeometry(w*.16,h+.014,w+.012),ribMat);g.add(rx,rz);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(w*1.035,.11,w*1.035),baseMat);lid.position.y=h/2+.015;lid.castShadow=true;g.add(lid);
    const topRibbonX=new THREE.Mesh(new THREE.BoxGeometry(w*1.05,.119,w*.17),ribMat);
    const topRibbonZ=new THREE.Mesh(new THREE.BoxGeometry(w*.17,.121,w*1.05),ribMat);topRibbonX.position.y=topRibbonZ.position.y=h/2+.02;g.add(topRibbonX,topRibbonZ);
    const bow=new THREE.Group();bow.position.y=h/2+.1;createBow(bow,0,ribMat,w*.38);g.add(bow);group.add(g);
  }
}
function makeBall(style){
  const group=new THREE.Group();
  const mat=new THREE.MeshPhysicalMaterial({color:style.color,metalness:style.metalness,roughness:style.roughness,clearcoat:.75,clearcoatRoughness:.12});
  const body=new THREE.Mesh(new THREE.SphereGeometry(.155,22,16),mat);body.userData.baubleClick=true;group.add(body);
  const capMat=new THREE.MeshStandardMaterial({color:0xc6a66e,metalness:.85,roughness:.26});
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.048,.051,.065,12),capMat);cap.position.y=.173;group.add(cap);
  const loop=new THREE.Mesh(new THREE.TorusGeometry(.042,.011,6,14),capMat);loop.position.y=.224;group.add(loop);
  return group;
}
function buildModal(root,api){
  const modal=root.querySelector('[data-christmas-modal]');
  const viewer=root.querySelector('[data-christmas-message]');
  const form=root.querySelector('[data-christmas-form]');
  const start=root.querySelector('[data-christmas-add]');
  const swatches=root.querySelector('[data-christmas-swatches]');
  const status=root.querySelector('[data-christmas-count]');
  let selected=0;let active=false;let previousFocus=null;
  const update=()=>{swatches.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));};
  COLOR_STYLES.forEach((style,i)=>{
    const b=document.createElement('button');b.type='button';b.className='christmas-swatch';
    const mark=document.createElement('span');mark.className='ball';mark.style.background=style.color;
    const label=document.createElement('span');label.textContent=style.name;b.append(mark,label);
    b.addEventListener('click',()=>{selected=i;update();});swatches.append(b);
  });update();
  function show(m){previousFocus=document.activeElement;m.hidden=false;root.classList.add('christmas-dialog-open');api.setPaused(true);m.querySelector('[data-christmas-close]')?.focus();}
  function hide(m){m.hidden=true;root.classList.toggle('christmas-dialog-open',!modal.hidden||!viewer.hidden);api.setPaused(!modal.hidden||!viewer.hidden);previousFocus?.focus?.();}
  root.querySelectorAll('[data-christmas-close]').forEach(b=>b.addEventListener('click',()=>hide(b.closest('.christmas-modal,.christmas-message'))));
  [modal,viewer].forEach(m=>m.addEventListener('click',e=>{if(e.target===m)hide(m);}));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!viewer.hidden)hide(viewer);else if(!modal.hidden)hide(modal);}});
  start.disabled=false;
  start.addEventListener('click',()=>show(modal));
  form.addEventListener('submit',e=>{
    e.preventDefault();if(active)return;
    const text=form.elements.message.value.trim();if(!text||text.length>180)return;
    active=true;
    api.addDemoBall(COLOR_STYLES[selected],text,form.elements.anonymous.checked,(msg,anon)=>{
      viewer.querySelector('[data-message-content]').textContent=msg;
      viewer.querySelector('[data-message-author]').textContent=anon?'Anonyme (aperçu)':'Vous (aperçu)';
      show(viewer);
    });
    status.textContent='1 boule d’essai posée';start.textContent='Votre boule d’essai est placée';start.disabled=true;
    hide(modal);form.reset();
  });
  return {showMessage:(msg,anon)=>{
    viewer.querySelector('[data-message-content]').textContent=msg;
    viewer.querySelector('[data-message-author]').textContent=anon?'Anonyme (aperçu)':'Vous (aperçu)';show(viewer);
  }};
}

function bootChristmas(root){
  const stage=root.querySelector('[data-christmas-stage]');
  const loading=root.querySelector('[data-christmas-loading]');
  if(!stage)return;
  if(!window.WebGLRenderingContext){loading.textContent='Ce navigateur ne prend pas en charge WebGL.';return;}
  let renderer;
  try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});}catch(err){loading.textContent='Impossible de lancer le rendu 3D sur cet appareil.';return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.48;
  renderer.setClearColor(0x000000,0);stage.append(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(32,1,.1,90);
  camera.position.set(8.4,5.15,13.0);camera.lookAt(0,3.20,0);
  const group=new THREE.Group();scene.add(group);
  scene.add(new THREE.HemisphereLight(0xc5d0c3,0x2b1717,2.15));
  const key=new THREE.DirectionalLight(0xffead7,3.5);key.position.set(-5,9,8);scene.add(key);
  const edge=new THREE.DirectionalLight(0xa5bcb9,1.6);edge.position.set(5,6,-6);scene.add(edge);
  const warm=new THREE.PointLight(0xd9a46f,80,13);warm.position.set(0,2.0,5);scene.add(warm);
  const stagePlate=new THREE.Mesh(new THREE.CylinderGeometry(3.45,3.55,.16,84),new THREE.MeshStandardMaterial({color:0x262422,metalness:.18,roughness:.62}));stagePlate.position.y=-.065;group.add(stagePlate);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(3.43,.022,6,96),new THREE.MeshBasicMaterial({color:0x987c5e}));rim.rotation.x=Math.PI/2;rim.position.y=.015;group.add(rim);
  const info=createFir(group);const glow=addLights(group,info);addGifts(group);
  const baubles=[];const raycaster=new THREE.Raycaster();const cursor=new THREE.Vector2();
  let paused=false,drag=false,moved=false,startX=0,lastX=0,startY=0;
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const api={setPaused(v){paused=v;},addDemoBall(style,msg,anon,callback){
    const ball=makeBall(style);const y=1.7+rnd()*2.4;
    const a=Math.atan2(camera.position.x,camera.position.z)-group.rotation.y+(rnd()-.5)*1.25;
    const r=info.foliageRadius(y)*1.17;
    ball.position.set(Math.sin(a)*r,y,Math.cos(a)*r);ball.userData={message:msg,anonymous:anon};
    group.add(ball);baubles.push({group:ball,callback});
  }};
  buildModal(root,api);
  const canvas=renderer.domElement;canvas.setAttribute('aria-label','Sapin de Noël tridimensionnel. Faites glisser pour le faire tourner.');canvas.tabIndex=0;
  canvas.addEventListener('pointerdown',e=>{drag=true;moved=false;startX=lastX=e.clientX;startY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-lastX;lastX=e.clientX;if(Math.abs(e.clientX-startX)+Math.abs(e.clientY-startY)>5)moved=true;group.rotation.y+=dx*.006;});
  function end(e){if(!drag)return;drag=false;if(moved||!baubles.length)return;const bounds=canvas.getBoundingClientRect();cursor.set(((e.clientX-bounds.left)/bounds.width)*2-1,-((e.clientY-bounds.top)/bounds.height)*2+1);
    raycaster.setFromCamera(cursor,camera);
    const hits=raycaster.intersectObjects(baubles.map(x=>x.group),true);
    if(!hits.length)return;
    let obj=hits[0].object;while(obj&&!obj.userData.message)obj=obj.parent;
    if(obj?.userData.message){const item=baubles.find(x=>x.group===obj);item?.callback(obj.userData.message,obj.userData.anonymous);}
  }
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',()=>drag=false);
  canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();group.rotation.y+=(e.key==='ArrowLeft'?.18:-.18);}});
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight; if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;
    const narrow=w<480;camera.fov=narrow?41:32;camera.position.set(narrow?8.8:8.4,narrow?5.0:5.15,narrow?15.9:13.0);camera.lookAt(0,3.15,0);camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(stage);resize();loading.hidden=true;
  let visible=true;
  const observerVisibility=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;},{threshold:.01});
  observerVisibility.observe(stage);
  let last=performance.now();
  const animate=now=>{requestAnimationFrame(animate);const delta=Math.min(.06,(now-last)/1000);last=now;
    if(!paused&&!drag&&!reduceMotion.matches&&document.visibilityState==='visible')group.rotation.y+=delta*.035;
    glow.material.opacity=.66+Math.sin(now*.00075)*.10;
    if(visible&&document.visibilityState==='visible')renderer.render(scene,camera);
  };requestAnimationFrame(animate);
}
