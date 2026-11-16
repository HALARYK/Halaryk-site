/* HALARYK Noël — Three.js embarqué, aucun CDN. */
(function(){
  'use strict';
  const root=document.querySelector('[data-christmas-root]');
  if(!root)return;
  const base=new URL('./',document.currentScript.src);
  const loading=root.querySelector('[data-tree-loading]');
  let started=false;
  function script(src){
    return new Promise((resolve,reject)=>{
      const el=document.createElement('script');
      el.src=new URL(src,base).href;
      el.async=true;
      el.onload=resolve;
      el.onerror=()=>reject(new Error('Impossible de charger '+src));
      document.head.appendChild(el);
    });
  }
  async function start(){
    if(started)return;started=true;
    try{
      // Éviter le pré-test qui créait un contexte WebGL inutile.
      // Le moteur essaie WebGL 2 puis WebGL 1 sur des canvas distincts.
      // Prototype 3D procédural retiré du rendu standard tant que le modèle réaliste n'est pas intégré.
      // La photo du sapin et les boules interactives restent disponibles.
      if(new URLSearchParams(location.search).has('tree_legacy_3d')&&!globalThis.THREE)await script('vendor/three.min.js');
      await script('sapin.js');
    }catch(err){
      console.error('Sapin HALARYK',err);
      if(loading)loading.hidden=true; // La photo réaliste de secours est déjà affichée.
    }
  }
  if('IntersectionObserver' in window){
    const ob=new IntersectionObserver(items=>{
      if(items.some(item=>item.isIntersecting)){
        ob.disconnect();start();
      }
    },{rootMargin:'300px'});
    ob.observe(root);
  }else start();
})();