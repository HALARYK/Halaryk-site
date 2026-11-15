/** HALARYK Noël: charge la 3D uniquement quand la section s'approche du viewport. */
const root=document.querySelector('[data-christmas-root]');
if(root){
  const load=()=>import('./sapin.js').catch(error=>{
    console.error('Sapin de Noël indisponible',error);
    const status=root.querySelector('[data-christmas-loading]');
    if(status)status.textContent='Impossible de charger le sapin 3D sur cet appareil.';
  });
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver((entries)=>{
      if(!entries.some(entry=>entry.isIntersecting))return;
      observer.disconnect();
      load();
    },{rootMargin:'350px'});
    observer.observe(root);
  }else{
    load();
  }
}
