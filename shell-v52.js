import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";

const CFG=globalThis.HALARYK_CONFIG||{};
const ROOT=new URL("./",import.meta.url);
const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function loadCss(){
  if(document.querySelector('link[data-v52-redesign]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=new URL('v5.2-redesign.css',ROOT).href;link.dataset.v52Redesign='1';document.head.appendChild(link);
}

function href(path=''){return new URL(path,ROOT).href}

const menus={
  content:{label:'Contenu',href:'contenu/',items:[['Planning','contenu/#planning'],['Ludothèque','contenu/#ludotheque'],['Clips','contenu/#clips']]},
  community:{label:'Communauté',href:'communaute/',items:[['Cabinet des idées','communaute/#cabinet'],['Réputation','communaute/#reputation'],['Collaborateurs','communaute/#collaborateurs']]},
  infos:{label:'Infos',href:'infos/',items:[['Règlement','infos/#reglement'],['Commandes','infos/#commandes'],['Configuration','infos/#config'],['FAQ','infos/#faq'],['Partenaires','infos/#partenaires']]}
};

function groupMarkup(key,active){const m=menus[key];return `<div class="v52-menu-group ${active?'active':''}"><button class="v52-menu-button" type="button" aria-expanded="false">${m.label}<span aria-hidden="true">⌄</span></button><div class="v52-menu-popover">${m.items.map(([label,url])=>`<a href="${href(url)}">${label}</a>`).join('')}</div></div>`}

function rebuildNavigation(){
  const nav=$('.nav');if(!nav||nav.dataset.v52Nav)return;nav.dataset.v52Nav='1';
  const page=document.body.dataset.page||'';
  nav.innerHTML=`<div class="mobile-nav-heading"><span>Navigation</span><small>Explorer HALARYK</small></div><a class="${page==='home'?'active':''}" href="${href('')}">Accueil</a><a class="${page==='events'||page==='event'?'active':''}" href="${href('evenements/')}">Événements</a>${groupMarkup('content',page==='content')}${groupMarkup('community',page==='community')}${groupMarkup('infos',page==='infos')}<div class="mobile-nav-footer v52-mobile-nav-footer"><div class="v52-mobile-socials" data-social-target="mobile"></div></div>`;
  const groups=$$('.v52-menu-group',nav);
  groups.forEach(group=>{const button=$('.v52-menu-button',group);button?.addEventListener('click',e=>{e.stopPropagation();const open=!group.classList.contains('open');groups.forEach(g=>{g.classList.remove('open');$('.v52-menu-button',g)?.setAttribute('aria-expanded','false')});if(open){group.classList.add('open');button.setAttribute('aria-expanded','true')}})});
  document.addEventListener('click',e=>{if(!e.target.closest('.v52-menu-group'))groups.forEach(g=>{g.classList.remove('open');$('.v52-menu-button',g)?.setAttribute('aria-expanded','false')})});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')groups.forEach(g=>{g.classList.remove('open');$('.v52-menu-button',g)?.setAttribute('aria-expanded','false')})});
}

const iconSvg={
  twitch:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h17v12l-5 5h-4l-3 3v-3H4V3Zm2 2v13h5v2l2-2h3l3-3V5H6Zm4 3h2v6h-2V8Zm5 0h2v6h-2V8Z"/></svg>`,
  discord:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.3 5.6A14.4 14.4 0 0 1 10 5l.5 1a11 11 0 0 1 3 0l.5-1c1 .1 1.9.3 2.8.6 2 2.7 2.5 5.3 2.2 7.9-1.2 1-2.4 1.6-3.7 2l-.9-1.2c.7-.3 1.3-.6 1.9-1.1-.2.1-.4.2-.6.3-2.4 1.1-5 1.1-7.4 0l-.6-.3c.6.5 1.2.8 1.9 1.1l-.9 1.2a12.8 12.8 0 0 1-3.7-2c-.3-2.6.2-5.2 2.3-7.9ZM9.4 11c0 1 .6 1.8 1.4 1.8.8 0 1.4-.8 1.4-1.8s-.6-1.8-1.4-1.8c-.8 0-1.4.8-1.4 1.8Zm4.4 0c0 1 .6 1.8 1.4 1.8.8 0 1.4-.8 1.4-1.8s-.6-1.8-1.4-1.8c-.8 0-1.4.8-1.4 1.8Z"/></svg>`,
  instagram:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" ry="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.3" cy="6.8" r="1"/></svg>`,
  youtube:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2 31 31 0 0 0 2.6 12c0 1.3.1 2.6.4 3.8a3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15.4V8.6l6 3.4-6 3.4Z"/></svg>`,
  tiktok:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h3c.3 1.8 1.3 3.1 3 3.7v3a8 8 0 0 1-3-1.1v6.2a6 6 0 1 1-5.2-6V12a2.8 2.8 0 1 0 2.2 2.8V3Z"/></svg>`,
  x:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4.2l3.4 4.6L16.6 4H20l-5.8 6.8L20 20h-4.2l-3.8-5.1L7.6 20H4l6.3-7.3L5 4Zm2 2 9.8 12H18L8.2 6H7Z"/></svg>`,
  github:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-2.8 17.6c.4.1.6-.2.6-.4v-1.7c-2.3.5-2.8-1-2.8-1-.4-1-1-1.3-1-1.3-.8-.6.1-.6.1-.6.9.1 1.4.9 1.4.9.8 1.4 2.1 1 2.6.8.1-.6.3-1 .6-1.2-1.8-.2-3.7-.9-3.7-4a3 3 0 0 1 .8-2.2c-.1-.2-.4-1.1.1-2.2 0 0 .7-.2 2.3.8a8 8 0 0 1 4.2 0c1.6-1 2.3-.8 2.3-.8.5 1.1.2 2 .1 2.2.5.6.8 1.4.8 2.2 0 3.1-1.9 3.8-3.7 4 .3.3.6.8.6 1.6v2.5c0 .2.2.5.6.4A9 9 0 0 0 12 3Z"/></svg>`,
  bluesky:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11c-1-2-3.6-5.6-5.8-7.2C4.1 2.3 3.3 2.6 2.8 2.8 2.2 3 2 3.8 2 4.3c0 .6.3 4.8.5 5.5.6 2 2.6 2.7 4.4 2.5-3.2.5-6 1.6-2.3 5.8 4.1 4.2 5.7-.9 6.2-2.5.1-.4.2-.6.2-.4 0-.2.1 0 .2.4.5 1.6 2.1 6.7 6.2 2.5 3.7-4.2.9-5.3-2.3-5.8 1.8.2 3.8-.5 4.4-2.5.2-.7.5-4.9.5-5.5 0-.5-.2-1.3-.8-1.5-.5-.2-1.3-.5-3.4 1C15.6 5.4 13 9 12 11Z"/></svg>`,
  link:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 13.5a1 1 0 0 1 0-1.4l3.6-3.6a3 3 0 1 1 4.2 4.2l-2 2a3 3 0 0 1-4.2 0l-.5-.5 1.4-1.4.5.5a1 1 0 0 0 1.4 0l2-2a1 1 0 1 0-1.4-1.4l-3.6 3.6a1 1 0 0 1-1.4 0Zm3-3a1 1 0 0 1 0 1.4l-3.6 3.6a1 1 0 1 1-1.4-1.4l2-2a1 1 0 0 1 1.4 0l.5.5 1.4-1.4-.5-.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 1 0 4.2 4.2l3.6-3.6a1 1 0 0 0 0-1.4l-1.4-1.4Z"/></svg>`
};
function socialMarkup(s){const key=(s.platform||'link').toLowerCase();return `<a class="v52-social-icon" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.label||key)}" title="${esc(s.label||key)}">${iconSvg[key]||iconSvg.link}</a>`}
async function loadSocials(){
  const targets=()=>$$('[data-social-target]');
  if(!targets().length&&$('.brand')){const holder=document.createElement('div');holder.className='v52-header-socials';holder.dataset.socialTarget='header';$('.brand').insertAdjacentElement('afterend',holder)}
  let socials=[];
  if(CFG.SUPABASE_URL&&CFG.SUPABASE_PUBLISHABLE_KEY){try{const db=createClient(CFG.SUPABASE_URL,CFG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:false}});const{data}=await db.from('site_social_links').select('platform,label,url,sort_order').eq('enabled',true).order('sort_order');socials=data||[]}catch{}}
  if(!socials.length&&CFG.SOCIALS)socials=Object.entries(CFG.SOCIALS).filter(([,url])=>url).map(([platform,url],i)=>({platform,label:platform,url,sort_order:i}));
  const html=socials.map(socialMarkup).join('');targets().forEach(t=>t.innerHTML=html);
  const footer=$('.footer-content');if(footer&&!footer.querySelector('[data-social-target="footer"]')){const holder=document.createElement('div');holder.className='v52-footer-socials';holder.dataset.socialTarget='footer';holder.innerHTML=html;footer.append(holder)}
}

function cleanPublicSections(){
  $('#reseaux')?.remove();
  $$('.mobile-nav-footer a[href*="#reseaux"]').forEach(a=>a.remove());
  $$('.page-intro').forEach(x=>x.classList.add('v52-page-intro'));
  $('.home-hero')?.classList.add('v52-home-hero');
  $('.home-event-section')?.classList.add('v52-home-event-section');
  $$('.footer').forEach(x=>x.classList.add('v52-footer'));
}

async function boot(){
  loadCss();
  if(document.body.classList.contains('admin-body')){import(new URL('admin/admin-redesign-v52.js',ROOT).href).catch(console.error);return}
  rebuildNavigation();cleanPublicSections();await loadSocials();document.documentElement.classList.add('v52-loaded');
}
boot();
