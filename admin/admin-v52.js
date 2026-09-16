import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
const CFG=globalThis.HALARYK_CONFIG||{};
const db=(CFG.SUPABASE_URL&&CFG.SUPABASE_PUBLISHABLE_KEY)?createClient(CFG.SUPABASE_URL,CFG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,detectSessionInUrl:false}}):null;
const $=(s,c=document)=>c.querySelector(s),$$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function css(){if(document.querySelector('link[data-admin-v52]'))return;const l=document.createElement("link");l.rel="stylesheet";l.href=new URL("./admin-v52.css",import.meta.url).href;l.dataset.adminV52="1";document.head.appendChild(l)}
function toast(t){const e=document.createElement("div");e.className="v52-admin-toast";e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2800)}
function cardContaining(sel){const node=$(sel);return node?.closest(".admin-card")||node?.parentElement||null}
function panelButton(key,label){return `<button type="button" data-v52-event-tab="${key}">${label}</button>`}
function buildEventWorkspace(){
  const panel=$('[data-admin-panel="events"]');if(!panel||panel.dataset.v52)return;
  panel.dataset.v52="1";
  const badge=$(".admin-badge");if(badge)badge.textContent="Administration V5.2";
  const eyebrow=$(":scope > .eyebrow",panel),h1=$(":scope > h1",panel);
  if(eyebrow)eyebrow.textContent="Administration › Événements";
  if(h1)h1.textContent="Gestion des événements";
  const selector=cardContaining("#event-admin-select"),creator=$("#event-create-form");
  const top=document.createElement("div");top.className="v52-event-admin-top";
  top.innerHTML=`<button type="button" class="v52-create-event-toggle"><span>＋</span><b>Créer un événement</b><small>Lancer une nouvelle campagne ou un grand projet</small></button><div class="v52-event-select-slot"></div>`;
  h1?.insertAdjacentElement("afterend",top);
  if(selector)top.querySelector(".v52-event-select-slot").append(selector);
  if(creator){creator.classList.add("v52-event-create-collapsed");top.insertAdjacentElement("afterend",creator)}
  top.querySelector(".v52-create-event-toggle")?.addEventListener("click",()=>creator?.classList.toggle("v52-event-create-collapsed"));
  const nav=document.createElement("div");nav.className="v52-event-admin-tabs";
  nav.innerHTML=[["presentation","Présentation publique"],["apercu","Aperçu"],["nations","Nations"],["chronologie","Chronologie"],["diplomatie","Diplomatie"],["medias","Médias"],["regles","Règles"],["donnees","Données"]].map(x=>panelButton(...x)).join("");
  (creator||top).insertAdjacentElement("afterend",nav);
  const presentation=$("#event-general-form"),nations=cardContaining("#event-participants-admin"),periods=cardContaining("#event-chapters-admin"),chronology=cardContaining("#event-entries-admin"),diplomacy=cardContaining("#event-declarations-admin"),media=cardContaining("#event-media-admin"),data=cardContaining("#event-snapshots-admin");
  const overview=document.createElement("div");overview.className="admin-card v52-admin-info";overview.innerHTML=`<div class="admin-section-title"><h2>Aperçu public</h2><p>Cette partie du site est construite automatiquement à partir des informations générales de l’événement et des relevés de sauvegarde. Tu n’as normalement rien à saisir ici.</p></div><div class="v52-info-grid"><span><b>Période jouée</b><small>Dates générales de l’événement</small></span><span><b>Sessions</b><small>Calculées depuis les périodes</small></span><span><b>Nations</b><small>Participants publics</small></span><span><b>Statistiques publiques</b><small>Snapshots importés après les sessions</small></span></div>`;
  const rules=document.createElement("div");rules.className="admin-card v52-admin-info";rules.innerHTML=`<div class="admin-section-title"><h2>Règles de la campagne</h2><p>Le règlement PPO est géré comme une page éditoriale dédiée. Les règles déjà intégrées restent accessibles depuis la fiche de campagne.</p></div><a class="button button-ghost" href="../evenements/chroniques-europe/regles/" target="_blank" rel="noopener">Ouvrir les règles ↗</a>`;
  nav.insertAdjacentElement("afterend",rules);nav.insertAdjacentElement("afterend",overview);
  const map={presentation:[presentation],apercu:[overview],nations:[nations],chronologie:[periods,chronology],diplomatie:[diplomacy],medias:[media],regles:[rules],donnees:[data]};
  Object.entries(map).forEach(([key,nodes])=>nodes.filter(Boolean).forEach(n=>{n.dataset.v52Panel=key;n.classList.add("v52-event-subpanel")}));
  const show=key=>{Object.values(map).flat().filter(Boolean).forEach(n=>n.classList.toggle("hidden",n.dataset.v52Panel!==key));$$("[data-v52-event-tab]",nav).forEach(b=>b.classList.toggle("active",b.dataset.v52EventTab===key));localStorage.setItem("halaryk-admin-event-tab",key)};
  $$("[data-v52-event-tab]",nav).forEach(b=>b.addEventListener("click",()=>show(b.dataset.v52EventTab)));
  show(localStorage.getItem("halaryk-admin-event-tab")||"presentation");
  const compact=()=>{$$("#event-participants-admin .admin-item").forEach(x=>x.classList.add("v52-participant-row"));$$("#event-chapters-admin .admin-item").forEach(x=>x.classList.add("v52-period-row"));$$("#event-entries-admin .admin-item").forEach(x=>x.classList.add("v52-entry-row"));$$("#event-declarations-admin .admin-item").forEach(x=>x.classList.add("v52-declaration-row"));$$("#event-media-admin .admin-item").forEach(x=>x.classList.add("v52-media-row"))};
  compact();[$("#event-participants-admin"),$("#event-chapters-admin"),$("#event-entries-admin"),$("#event-declarations-admin"),$("#event-media-admin")].filter(Boolean).forEach(n=>new MutationObserver(compact).observe(n,{childList:true,subtree:true}));
}
function addSocialPanel(){
  const sidebar=$(".admin-sidebar"),content=$(".admin-content");if(!sidebar||!content||$("#v52-social-panel"))return;
  const btn=document.createElement("button");btn.dataset.adminTab="socials";btn.textContent="Réseaux sociaux";sidebar.append(btn);
  const panel=document.createElement("section");panel.className="hidden";panel.dataset.adminPanel="socials";panel.id="v52-social-panel";
  panel.innerHTML=`<p class="eyebrow">Présence extérieure</p><h1>Réseaux sociaux</h1><p class="v52-admin-lead">Ces liens alimentent automatiquement les icônes du haut du site, du menu mobile et du pied de page.</p><div class="admin-card"><div class="admin-section-title"><h2>Liens affichés</h2><p>Active, masque ou réordonne tes plateformes sans modifier GitHub.</p></div><div id="v52-social-list" class="v52-social-admin-list"></div></div><form id="v52-social-create" class="admin-card"><div class="admin-section-title"><h2>Ajouter un réseau</h2></div><div class="admin-three-cols"><label>Plateforme<select id="v52-social-platform"><option value="twitch">Twitch</option><option value="discord">Discord</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="tiktok">TikTok</option><option value="x">X / Twitter</option><option value="bluesky">Bluesky</option><option value="github">GitHub</option><option value="link">Autre lien</option></select></label><label>Nom affiché<input id="v52-social-label" placeholder="Ex. YouTube"></label><label>Ordre<input id="v52-social-order" type="number" value="40"></label></div><label>URL<input id="v52-social-url" type="url" placeholder="https://…" required></label><label class="check-row"><input id="v52-social-enabled" type="checkbox" checked> Afficher sur le site</label><button class="button button-primary" type="submit">Ajouter le réseau</button></form>`;
  content.append(panel);
  btn.addEventListener("click",()=>{$$(".admin-sidebar button").forEach(b=>b.classList.remove("active"));btn.classList.add("active");$$("[data-admin-panel]",content).forEach(p=>p.classList.add("hidden"));panel.classList.remove("hidden");loadSocials()});
  $("#v52-social-create",panel).addEventListener("submit",async e=>{e.preventDefault();if(!db)return;const payload={platform:$("#v52-social-platform").value,label:$("#v52-social-label").value.trim()||$("#v52-social-platform").selectedOptions[0].textContent,url:$("#v52-social-url").value.trim(),enabled:$("#v52-social-enabled").checked,sort_order:Number($("#v52-social-order").value||40)};const{error}=await db.from("site_social_links").insert(payload);if(error)toast(error.message);else{e.target.reset();$("#v52-social-order").value=40;$("#v52-social-enabled").checked=true;toast("Réseau ajouté.");loadSocials()}});
}
async function loadSocials(){
  if(!db)return;const list=$("#v52-social-list");if(!list)return;
  const {data,error}=await db.from("site_social_links").select("*").order("sort_order");if(error){list.innerHTML=`<p>${esc(error.message)}</p>`;return}
  list.innerHTML=(data||[]).map(r=>`<article class="v52-social-admin-row" data-social="${r.id}"><div><b>${esc(r.label||r.platform)}</b><small>${esc(r.platform)}</small></div><input class="v52-social-url" value="${esc(r.url)}" aria-label="URL ${esc(r.label)}"><label class="v52-switch"><input class="v52-social-enabled" type="checkbox" ${r.enabled?"checked":""}><span></span></label><input class="v52-social-order" type="number" value="${Number(r.sort_order||0)}" aria-label="Ordre"><button type="button" data-save-social="${r.id}">Enregistrer</button><button type="button" class="danger-action" data-delete-social="${r.id}">×</button></article>`).join("")||"<p>Aucun réseau configuré.</p>";
  $$("[data-save-social]",list).forEach(b=>b.addEventListener("click",async()=>{const row=b.closest("[data-social]");const{error}=await db.from("site_social_links").update({url:$(".v52-social-url",row).value.trim(),enabled:$(".v52-social-enabled",row).checked,sort_order:Number($(".v52-social-order",row).value||0),updated_at:new Date().toISOString()}).eq("id",b.dataset.saveSocial);if(error)toast(error.message);else toast("Réseau enregistré.")}));
  $$("[data-delete-social]",list).forEach(b=>b.addEventListener("click",async()=>{if(!confirm("Supprimer ce réseau ?"))return;const{error}=await db.from("site_social_links").delete().eq("id",b.dataset.deleteSocial);if(error)toast(error.message);else{toast("Réseau supprimé.");loadSocials()}}));
}
function wait(){css();const app=$("#admin-app");if(!app)return setTimeout(wait,200);const run=()=>{if(app.classList.contains("hidden"))return;buildEventWorkspace();addSocialPanel()};run();new MutationObserver(run).observe(app,{attributes:true,attributeFilter:["class"]})}
wait();
