/* HALARYK — Lancement automatique 21 novembre 2026 à 09:00 (Europe/Paris, UTC+01). */
(() => {
  'use strict';
  const countdown=document.querySelector('[data-christmas-countdown]');
  const tree=document.querySelector('[data-christmas-root]');
  if(!countdown||!tree)return;
  const OPEN_AT=Date.parse('2026-11-21T09:00:00+01:00');
  const labels={
    days:countdown.querySelector('[data-countdown-days]'),
    hours:countdown.querySelector('[data-countdown-hours]'),
    minutes:countdown.querySelector('[data-countdown-minutes]'),
    seconds:countdown.querySelector('[data-countdown-seconds]')
  };
  let opened=false;
  function update(){
    const remaining=Math.max(0,OPEN_AT-Date.now());
    if(remaining<=0){
      if(!opened){
        countdown.hidden=true;
        tree.hidden=false;
        opened=true;
        window.dispatchEvent(new CustomEvent('halaryk:christmas-open'));
      }
      return;
    }
    countdown.hidden=false;
    tree.hidden=true;
    const seconds=Math.floor(remaining/1000);
    const d=Math.floor(seconds/86400),h=Math.floor((seconds%86400)/3600);
    const m=Math.floor((seconds%3600)/60),s=seconds%60;
    labels.days.textContent=String(d).padStart(2,'0');
    labels.hours.textContent=String(h).padStart(2,'0');
    labels.minutes.textContent=String(m).padStart(2,'0');
    labels.seconds.textContent=String(s).padStart(2,'0');
  }
  update();
  setInterval(update,1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
})();
