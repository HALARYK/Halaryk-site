import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "../config.js";

const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const db=BACKEND_CONFIGURED?createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,detectSessionInUrl:false}}):null;

function loadCss(){if(document.querySelector('link[data-admin-redesign-v52]'))return;const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('./admin-redesign-v52.css',import.meta.url).href;l.dataset.adminRedesignV52='1';document.head.appendChild(l)}
function toast(message){const e=document.createElement('div');e.className='v52-admin-toast';e.textContent=message;document.body.appendChild(e);setTimeout(()=>e.remove(),2800)}
function card(sel){return $(sel)?.closest('.admin-card')||null}

function eventWorkspace(){
  const panel=$('[data-admin-panel="events"]');if(!panel||panel.dataset.redesignV52)return;panel.dataset.redesignV52='1';
  const badge=$('.admin-badge');if(badge)badge.textContent='Administration V5.2';
  const h1=$(':scope > h1',panel);if(h1)h1.textContent='Gestion des événements';
  const eye=$(':scope > .eyebrow',panel);if(eye)eye.textContent='GRANDS PROJETS DE LA CHAÎNE';
  const selector=card('#event-admin-select'),creator=$('#event-create-form');
  const top=document.createElement('div');top.className='v52-admin-event-head';top.innerHTML=`<button class="v52-new-event" type="button"><span>＋</span><div><b>Créer un événement</b><small>Nouvelle campagne, serveur ou projet spécial</small></div></button><div class="v52-event-selector-slot"></div>`;
  h1?.insertAdjacentElement('afterend',top);if(selector)top.querySelector('.v52-event-selector-slot').append(selector);
  if(creator){creator.classList.add('v52-create-hidden');top.insertAdjacentElement('afterend',creator)}
  top.querySelector('.v52-new-event')?.addEventListener('click',()=>creator?.classList.toggle('v52-create-hidden'));

  const tabs=document.createElement('nav');tabs.className='v52-event-tabs';tabs.setAttribute('aria-label','Sections de l’événement');
  const defs=[['presentation','Présentation'],['nations','Nations'],['chronologie','Chronologie'],['diplomatie','Diplomatie'],['medias','Médias'],['regles','Règles'],['donnees','Données']];
  tabs.innerHTML=defs.map(([k,l])=>`<button type="button" data-v52-event-tab="${k}">${l}</button>`).join('');(creator||top).insertAdjacentElement('afterend',tabs);

  const rules=document.createElement('div');rules.className='admin-card v52-rules-admin';rules.innerHTML=`<div class="admin-section-title"><h2>Règlement de la campagne</h2><p>Le règlement complet reste une sous-page de la campagne. Le PDF fourni a déjà été retranscrit sur cette page.</p></div><a class="button button-ghost" href="../evenements/chroniques-europe/regles/" target="_blank" rel="noopener noreferrer">Ouvrir les règles ↗</a>`;tabs.insertAdjacentElement('afterend',rules);

  const groups={
    presentation:[$('#event-general-form')],
    nations:[card('#event-participants-admin')],
    chronologie:[card('#event-chapters-admin'),card('#event-entries-admin')],
    diplomatie:[card('#event-declarations-admin')],
    medias:[card('#event-media-admin')],
    regles:[rules],
    donnees:[card('#event-snapshots-admin')]
  };
  Object.entries(groups).forEach(([key,nodes])=>nodes.filter(Boolean).forEach(n=>{n.dataset.v52EventPanel=key;n.classList.add('v52-event-panel')}));
  const show=key=>{Object.values(groups).flat().filter(Boolean).forEach(n=>n.classList.toggle('hidden',n.dataset.v52EventPanel!==key));$$('[data-v52-event-tab]',tabs).forEach(b=>b.classList.toggle('active',b.dataset.v52EventTab===key));localStorage.setItem('halaryk-v52-event-tab',key)};
  $$('[data-v52-event-tab]',tabs).forEach(b=>b.addEventListener('click',()=>show(b.dataset.v52EventTab)));show(localStorage.getItem('halaryk-v52-event-tab')||'presentation');

  const compact=()=>{
    $$('#event-participants-admin .admin-item').forEach(x=>x.classList.add('v52-compact-participant'));
    $$('#event-chapters-admin .admin-item').forEach(x=>x.classList.add('v52-compact-period'));
    $$('#event-entries-admin .admin-item').forEach(x=>x.classList.add('v52-compact-entry'));
    $$('#event-declarations-admin .admin-item').forEach(x=>x.classList.add('v52-compact-entry'));
    $$('#event-media-admin .admin-item').forEach(x=>x.classList.add('v52-compact-media'));
    $$('.event-entry-featured-edit').forEach(x=>x.closest('label')?.classList.add('hidden'));
    $$('.event-entry-public-edit').forEach(x=>x.closest('label')?.classList.add('hidden'));
  };
  compact();['#event-participants-admin','#event-chapters-admin','#event-entries-admin','#event-declarations-admin','#event-media-admin'].map($).filter(Boolean).forEach(n=>new MutationObserver(compact).observe(n,{childList:true,subtree:true}));
}

function socialPanel(){
  const sidebar=$('.admin-sidebar'),content=$('.admin-content');if(!sidebar||!content||$('#v52-social-panel'))return;
  const btn=document.createElement('button');btn.type='button';btn.textContent='Réseaux sociaux';btn.dataset.v52SocialTab='1';sidebar.append(btn);
  const panel=document.createElement('section');panel.className='hidden';panel.id='v52-social-panel';panel.innerHTML=`<p class="eyebrow">LIENS EXTERNES</p><h1>Réseaux sociaux</h1><p class="v52-admin-lead">Ces liens alimentent automatiquement les icônes du haut du site et du pied de page.</p><div class="admin-card"><div class="admin-section-title"><h2>Réseaux affichés</h2><p>Modifie l’adresse, masque une plateforme ou change son ordre d’affichage.</p></div><div id="v52-social-list" class="v52-social-list"></div></div><form id="v52-social-form" class="admin-card"><div class="admin-section-title"><h2>Ajouter un réseau</h2></div><div class="admin-three-cols"><label>Plateforme<select id="v52-social-platform"><option value="twitch">Twitch</option><option value="discord">Discord</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="x">X / Twitter</option><option value="bluesky">Bluesky</option><option value="github">GitHub</option><option value="link">Autre lien</option></select></label><label>Nom affiché<input id="v52-social-label" required></label><label>Ordre<input id="v52-social-order" type="number" value="50"></label></div><label>Adresse complète<input id="v52-social-url" type="url" placeholder="https://…" required></label><label class="check-row"><input id="v52-social-enabled" type="checkbox" checked> Afficher sur le site</label><button class="button button-primary" type="submit">Ajouter</button></form>`;content.append(panel);

  const show=()=>{$$('.admin-sidebar button').forEach(b=>b.classList.toggle('active',b===btn));$$('.admin-content > section').forEach(p=>p.classList.add('hidden'));panel.classList.remove('hidden');loadSocials()};btn.addEventListener('click',show);
  async function loadSocials(){if(!db)return;const{data,error}=await db.from('site_social_links').select('*').order('sort_order');if(error){toast(error.message);return}const list=$('#v52-social-list');list.innerHTML=(data||[]).map(r=>`<article class="v52-social-row" data-social-id="${r.id}"><div><b>${esc(r.label)}</b><small>${esc(r.platform)}</small></div><input class="v52-social-url" type="url" value="${esc(r.url)}"><input class="v52-social-label" value="${esc(r.label)}" aria-label="Nom"><input class="v52-social-order" type="number" value="${Number(r.sort_order||0)}" aria-label="Ordre"><label class="v52-switch"><input class="v52-social-enabled" type="checkbox" ${r.enabled?'checked':''}><span></span></label><button type="button" data-save-social>Enregistrer</button><button type="button" class="danger-action" data-delete-social>×</button></article>`).join('')||'<p>Aucun réseau configuré.</p>'}
  panel.addEventListener('click',async e=>{const row=e.target.closest('[data-social-id]');if(!row)return;const id=row.dataset.socialId;if(e.target.closest('[data-save-social]')){const payload={url:$('.v52-social-url',row).value.trim(),label:$('.v52-social-label',row).value.trim(),sort_order:Number($('.v52-social-order',row).value||0),enabled:$('.v52-social-enabled',row).checked,updated_at:new Date().toISOString()};const{error}=await db.from('site_social_links').update(payload).eq('id',id);error?toast(error.message):toast('Réseau enregistré.')}if(e.target.closest('[data-delete-social]')){if(!confirm('Supprimer ce réseau ?'))return;const{error}=await db.from('site_social_links').delete().eq('id',id);if(error)toast(error.message);else{toast('Réseau supprimé.');loadSocials()}}});
  $('#v52-social-form')?.addEventListener('submit',async e=>{e.preventDefault();const payload={platform:$('#v52-social-platform').value,label:$('#v52-social-label').value.trim(),url:$('#v52-social-url').value.trim(),sort_order:Number($('#v52-social-order').value||50),enabled:$('#v52-social-enabled').checked};const{error}=await db.from('site_social_links').insert(payload);if(error)toast(error.message);else{e.target.reset();$('#v52-social-enabled').checked=true;$('#v52-social-order').value='50';toast('Réseau ajouté.');loadSocials()}});
}

loadCss();
const run=()=>{eventWorkspace();socialPanel()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,50));else setTimeout(run,50);
