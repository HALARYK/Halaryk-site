import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";

const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
let supabase=null,session=null,currentCategory="games",currentSort="popular",currentStatus="all",libraryFilter="playing",currentSuggestionFeed=[],libraryGames=[];

const categoryCopy={
  games:["Jeux de semaine","Proposez un jeu à faire en stream.","Cette catégorie concerne les streams du lundi et du mercredi."],
  concepts:["Concepts & défis","Proposez un concept, une règle spéciale ou un défi.","Une idée pour modifier la manière de jouer ou créer un format ponctuel."],
  twitch:["Twitch & interactions","Proposez une amélioration du stream.","Commandes, récompenses de chaîne, interactions, scènes, overlays ou idées liées au live."],
  community:["Site & Discord","Proposez une amélioration de la communauté.","Une idée pour le site HALARYK, Discord ou l’organisation de la communauté."],
  events:["Événements spéciaux","Proposez un live exceptionnel ou une soirée à thème.","Cette catégorie ne concerne pas le choix des jeux du dimanche."],
  other:["Autre","Une idée qui ne rentre nulle part ailleurs ?","Utilisez cette catégorie pour les propositions plus difficiles à classer."]
};
const statusLabels={new:"Nouvelle",considering:"En réflexion",planned:"Prévue",completed:"Terminée",rejected:"Refusée",archived:"Archivée"};
const libraryLabels={playing:"En cours",backlog:"À faire",completed:"Terminé",wishlist:"Liste de souhaits",paused:"En pause",abandoned:"Abandonné"};
const repIcons={"Traître":"☠️","Inconnu":"👤","Habitué":"🏠","Conseiller":"🗣️","Confident":"⚜️","Favori":"👑"};

function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function fmtDate(v){try{return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(v))}catch{return""}}
function norm(v=""){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function similarity(a,b){const A=new Set(norm(a).split(" ").filter(x=>x.length>2)),B=new Set(norm(b).split(" ").filter(x=>x.length>2));if(!A.size||!B.size)return 0;const i=[...A].filter(x=>B.has(x)).length;return i/new Set([...A,...B]).size}
function repClass(rank=""){return "rep-"+norm(rank).replaceAll(" ","-")}
function profile(user){
  const m=user?.user_metadata||{};
  const twitchIdentity=user?.identities?.find(i=>i.provider==="twitch")?.identity_data||{};
  return{
    displayName:m.user_name||m.preferred_username||m.name||m.full_name||"Utilisateur Twitch",
    avatar:m.avatar_url||m.picture||twitchIdentity.avatar_url||"",
    twitchLogin:m.user_name||m.preferred_username||twitchIdentity.user_name||"",
    twitchUserId:String(m.sub||m.provider_id||twitchIdentity.sub||twitchIdentity.provider_id||"")||null
  }
}
function toast(message){const e=document.createElement("div");e.textContent=message;Object.assign(e.style,{position:"fixed",right:"20px",bottom:"20px",zIndex:999,padding:"12px 16px",background:"#0b0909",border:"1px solid rgba(183,147,100,.35)",color:"#eadfce",boxShadow:"0 18px 45px rgba(0,0,0,.42)",fontSize:"12px"});document.body.appendChild(e);setTimeout(()=>e.remove(),3200)}

function initNavigation(){
  const menu=$(".menu-toggle"),nav=$(".nav"),drop=$(".nav-dropdown"),dropBtn=$(".nav-dropdown-button");
  menu?.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open))});
  dropBtn?.addEventListener("click",e=>{e.stopPropagation();drop.classList.toggle("open")});
  document.addEventListener("click",()=>drop?.classList.remove("open"));
  $$(".nav a").forEach(a=>a.addEventListener("click",()=>nav?.classList.remove("open")));
  const ro=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");ro.unobserve(e.target)}}),{threshold:.1});
  $$(".reveal").forEach(e=>ro.observe(e));
}
function initClips(){
  const grid=$("#clips-grid");if(!grid)return;const parent=location.hostname||"halaryk.github.io";
  grid.innerHTML=CONFIG.TWITCH_CLIPS.map((clip,i)=>`<article class="clip-card"><iframe src="https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&parent=${encodeURIComponent(parent)}" title="Clip Twitch HALARYK ${i+1}" loading="lazy" allowfullscreen></iframe></article>`).join("");
  if(CONFIG.CLIPPER_NAMES?.length){const names=CONFIG.CLIPPER_NAMES.map(n=>`<strong>${esc(n)}</strong>`);let list=names[0];if(names.length===2)list=`${names[0]} et ${names[1]}`;else if(names.length>2)list=`${names.slice(0,-1).join(", ")} et ${names.at(-1)}`;$("#clip-thanks-text").innerHTML=`Un grand merci à ${list} pour leurs clips et leur œil toujours bien placé.`}
}
async function signIn(){if(!supabase)return toast("Connexion Twitch pas encore configurée.");const redirectTo=location.origin+location.pathname;const{error}=await supabase.auth.signInWithOAuth({provider:"twitch",options:{redirectTo}});if(error)toast(error.message)}
async function signOut(){if(supabase)await supabase.auth.signOut()}
async function syncAuth(){
  const login=$("#login-button"),chip=$("#user-button"),menu=$("#user-menu"),admin=$("#admin-link"),cta=$("#suggestion-login-cta"),hint=$("#suggestion-auth-hint");
  if(!session?.user){login.classList.remove("hidden");chip.classList.add("hidden");menu.classList.add("hidden");cta.classList.remove("hidden");hint.textContent="Connexion Twitch nécessaire pour proposer une idée.";return}
  const p=profile(session.user);login.classList.add("hidden");chip.classList.remove("hidden");$("#user-name").textContent=p.displayName;$("#user-avatar").src=p.avatar||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23130f0f'/%3E%3C/svg%3E";cta.classList.add("hidden");hint.textContent=`Connecté en tant que ${p.displayName}.`;
  await supabase.from("profiles").upsert({id:session.user.id,twitch_user_id:p.twitchUserId,twitch_login:p.twitchLogin||null,display_name:p.displayName,avatar_url:p.avatar||null});
  const{data:isAdmin}=await supabase.rpc("current_is_admin");admin.classList.toggle("hidden",!isAdmin)
}
async function loadLive(){try{const{data,error}=await supabase.functions.invoke("live-status",{body:{login:CONFIG.TWITCH_CHANNEL_LOGIN}});if(error)throw error;const card=$("#live-card");if(data?.is_live){card.classList.add("is-live");$("#live-label").textContent="EN DIRECT";$("#live-detail").textContent=`${data.game_name||"Twitch"} — ${data.title||"Live en cours"}`}else{$("#live-label").textContent="Hors ligne";$("#live-detail").textContent="Retrouve les prochains lives sur Twitch."}}catch{$("#live-label").textContent="Twitch";$("#live-detail").textContent="Voir la chaîne"}}
async function loadLibrary(){
  if(!supabase)return;
  const{data,error}=await supabase.from("library_games").select("*").order("updated_at",{ascending:false});
  if(error)return;
  libraryGames=data||[];
  $("#library-total").textContent=libraryGames.length;
  $("#library-completed").textContent=libraryGames.filter(g=>g.status==="completed").length;
  $("#library-playing").textContent=libraryGames.filter(g=>g.status==="playing").length;
  $("#library-wishlist").textContent=libraryGames.filter(g=>g.status==="wishlist").length;
  renderLibraryGrid();
}
function renderLibraryGrid(){
  const list=libraryFilter==="all"?libraryGames:libraryGames.filter(g=>g.status===libraryFilter),grid=$("#library-grid");
  if(!list.length){grid.innerHTML=`<div class="empty-state"><strong>Aucun jeu dans cette catégorie</strong><p>La ludothèque sera enrichie depuis l’administration HALARYK.</p></div>`;return}
  grid.innerHTML=list.map(g=>`<article class="game-card" data-public-game="${g.id}" tabindex="0" role="button" aria-label="Ouvrir la fiche de ${esc(g.name)}"><img class="game-cover" src="${esc(g.cover_url||"")}" alt="Jaquette de ${esc(g.name)}" loading="lazy"><div class="game-content"><h3>${esc(g.name)}</h3><div class="game-meta"><span class="tag">${esc(libraryLabels[g.status]||"Statut inconnu")}</span>${g.streamed?`<span class="tag tag-streamed">🎥 Streamé</span>`:""}</div></div></article>`).join("");
  $$('[data-public-game]').forEach(card=>{
    card.onclick=()=>openLibraryDetail(card.dataset.publicGame);
    card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openLibraryDetail(card.dataset.publicGame)}};
  });
}
function openLibraryDetail(id){
  const g=libraryGames.find(x=>x.id===id);if(!g)return;
  const panel=$("#library-detail");
  const cover=$("#library-detail-cover");
  if(g.cover_url){cover.src=g.cover_url;cover.alt=`Jaquette de ${g.name}`;cover.classList.remove("hidden")}else{cover.removeAttribute("src");cover.classList.add("hidden")}
  $("#library-detail-title").textContent=g.name;
  $("#library-detail-release").textContent=g.release_date?new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(g.release_date)):"Date de sortie inconnue";
  $("#library-detail-status").textContent=libraryLabels[g.status]||"Statut inconnu";
  $("#library-detail-playtime").textContent=g.playtime_hours!=null?`${new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(Number(g.playtime_hours))} h`:"Non renseigné";
  $("#library-detail-streamed").textContent=g.streamed?"Oui":"Non";
  $("#library-detail-note").textContent=g.personal_note||"Aucune note personnelle pour ce jeu pour le moment.";
  panel.classList.remove("hidden");
  panel.scrollIntoView({behavior:"smooth",block:"center"});
}
function closeLibraryDetail(){$("#library-detail").classList.add("hidden")}
function renderSuggestion(s,pinned=false){
  const rep=s.rep_rank?`<span class="rep-badge ${repClass(s.rep_rank)}">${repIcons[s.rep_rank]||"✦"} ${esc(s.rep_rank)}</span>`:"";
  return `<article class="suggestion-card ${pinned?"pinned":""}">${pinned?`<span class="pinned-label">📌 Suggestion à la une</span>`:""}<div class="suggestion-head"><div class="suggestion-author">${s.author_avatar?`<img src="${esc(s.author_avatar)}" alt="">`:""}<span>${esc(s.author_name||"Utilisateur Twitch")} · ${fmtDate(s.created_at)}</span>${rep}</div><span class="status status-${esc(s.status)}">${esc(statusLabels[s.status]||s.status)}</span></div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>${s.official_reply?`<div class="official-reply"><strong>Réponse de Halaryk</strong><p>${esc(s.official_reply)}</p></div>`:""}<div class="suggestion-footer"><button class="vote-button ${s.has_voted?"voted":""}" data-vote="${s.id}" type="button">👍 <strong>${s.vote_count||0}</strong></button><span class="tag">${esc(categoryCopy[s.category]?.[0]||s.category)}</span></div></article>`
}
async function loadSuggestions(){
  if(!supabase)return;const{data,error}=await supabase.rpc("get_suggestion_feed",{p_category:currentCategory,p_sort:currentSort==="recent"?"recent":"popular"});
  if(error){$("#suggestions-feed").innerHTML=`<div class="empty-state"><strong>Impossible de charger les suggestions</strong><p>${esc(error.message)}</p></div>`;return}
  currentSuggestionFeed=data||[];renderSimilar();let list=currentSuggestionFeed;if(currentSort==="mine")list=session?.user?list.filter(s=>s.author_id===session.user.id):[];if(currentStatus!=="all")list=list.filter(s=>s.status===currentStatus);
  $("#pinned-suggestion").innerHTML=list.filter(s=>s.pinned).map(s=>renderSuggestion(s,true)).join("");const normal=list.filter(s=>!s.pinned);$("#suggestions-feed").innerHTML=normal.length?normal.map(s=>renderSuggestion(s)).join(""):`<div class="empty-state"><strong>Aucune suggestion ici pour le moment</strong><p>La première pourrait être la tienne.</p></div>`;$$('[data-vote]').forEach(b=>b.onclick=()=>toggleVote(b.dataset.vote))
}
async function toggleVote(id){if(!session?.user)return signIn();const{error}=await supabase.rpc("toggle_suggestion_vote",{p_suggestion_id:id});if(error)toast(error.message);else await loadSuggestions()}
async function submitSuggestion(e){e.preventDefault();if(!session?.user)return signIn();const title=$("#suggestion-title").value.trim(),body=$("#suggestion-body").value.trim();if(!title||!body)return;const{error}=await supabase.from("suggestions").insert({author_id:session.user.id,category:currentCategory,title,body});if(error)return toast(error.message);$("#suggestion-form").reset();toast("Suggestion envoyée.");await loadSuggestions()}
function renderSimilar(){
  const box=$("#similar-suggestions"),title=$("#suggestion-title")?.value.trim()||"";if(title.length<4||!currentSuggestionFeed.length){box.classList.add("hidden");box.innerHTML="";return}
  const sims=currentSuggestionFeed.map(s=>({...s,score:similarity(title,s.title)})).filter(s=>s.score>=.34).sort((a,b)=>b.score-a.score).slice(0,3);if(!sims.length){box.classList.add("hidden");box.innerHTML="";return}
  box.innerHTML=`<strong>Suggestions similaires</strong>${sims.map(s=>`<div class="similar-suggestion"><span>${esc(s.title)} — 👍 ${s.vote_count||0}</span><button class="button button-ghost" type="button" data-support="${s.id}">Soutenir</button></div>`).join("")}`;box.classList.remove("hidden");$$('[data-support]',box).forEach(b=>b.onclick=()=>toggleVote(b.dataset.support))
}
async function loadPolls(){
  if(!supabase)return;const{data,error}=await supabase.rpc("get_polls_feed"),feed=$("#polls-feed");if(error){feed.innerHTML=`<div class="empty-state">${esc(error.message)}</div>`;return}
  const polls=data||[];if(!polls.length){feed.innerHTML=`<div class="empty-state"><strong>Aucun sondage actif</strong><p>Les prochains votes longue durée apparaîtront ici.</p></div>`;return}
  feed.innerHTML=polls.map(p=>{const type=p.allow_multiple?"checkbox":"radio",opts=p.options||[];return `<article class="poll-card" data-poll-card="${p.id}"><h3>${esc(p.title)}</h3>${p.description?`<p>${esc(p.description)}</p>`:""}<div class="poll-options">${opts.map(o=>{const pct=p.total_votes&&o.vote_count!=null?Math.round(o.vote_count/p.total_votes*100):0;return `<div class="poll-option">${p.results_visible?`<span class="poll-result-bar" style="width:${pct}%"></span>`:""}<label><input type="${type}" name="poll-${p.id}" value="${o.id}" ${o.selected?"checked":""}><span>${esc(o.label)}</span>${p.results_visible?`<span class="poll-result">${o.vote_count||0} · ${pct}%</span>`:""}</label></div>`}).join("")}</div><div class="poll-actions"><span>${p.ends_at?`Fin : ${fmtDate(p.ends_at)}`:"Sans date de fin"}</span><button class="button button-primary" data-poll="${p.id}" type="button">Voter</button></div></article>`}).join("");$$('[data-poll]').forEach(b=>b.onclick=()=>castPoll(b.dataset.poll))
}
async function castPoll(id){if(!session?.user)return signIn();const card=$(`[data-poll-card="${id}"]`),ids=$$("input:checked",card).map(i=>i.value);if(!ids.length)return toast("Choisis au moins une option.");const{error}=await supabase.rpc("cast_poll_vote",{p_poll_id:id,p_option_ids:ids});if(error)toast(error.message);else{toast("Vote enregistré.");await loadPolls()}}

function renderLeaderboard(rows,traitors=false){
  if(!rows?.length)return `<div class="leaderboard-empty">${traitors?"Aucun traître enregistré pour le moment.":"Le classement apparaîtra après les premières synchronisations."}</div>`;
  return rows.map((r,i)=>`<div class="leaderboard-row"><span class="leaderboard-position">${String(i+1).padStart(2,"0")}</span><div class="leaderboard-user">${r.avatar_url?`<img src="${esc(r.avatar_url)}" alt="">`:""}<div><strong>${esc(r.display_name||r.twitch_login)}</strong><small>${repIcons[r.rank]||""} ${esc(r.rank||"")}</small></div></div><span class="leaderboard-score">${r.score>0?"+":""}${r.score}</span></div>`).join("")
}
async function loadReputation(){
  if(!supabase)return;
  const{data:board,error}=await supabase.rpc("get_reputation_dashboard",{p_limit:10});
  if(!error&&board){$("#reputation-top").innerHTML=renderLeaderboard(board.top||[]);$("#reputation-traitors").innerHTML=renderLeaderboard(board.traitors||[],true)}
  const content=$("#my-reputation-content");if(!content)return;
  if(!session?.user){content.innerHTML=`<h3>Identifiez-vous avec Twitch</h3><p>Connectez votre compte pour retrouver ici votre score, votre rang et votre progression.</p><button id="reputation-login" class="button button-primary" type="button">Connexion Twitch</button>`;$("#reputation-login").onclick=signIn;return}
  const{data:mine,error:myError}=await supabase.rpc("get_my_reputation");
  if(myError||!mine?.length){content.innerHTML=`<h3>Dossier indisponible</h3><p>Le score sera visible après la première synchronisation Streamer.bot.</p>`;return}
  const r=mine[0],icon=repIcons[r.rank]||"✦";
  const progress=r.next_threshold==null?100:Math.max(0,Math.min(100,Math.round(((r.score-r.current_floor)/(r.next_threshold-r.current_floor))*100)));
  content.innerHTML=`<div class="my-rank-line"><span class="rank-icon">${icon}</span><strong>${esc(r.rank)}</strong></div><div class="my-reputation-score"><strong>${r.score}</strong><span>points</span></div>${r.next_threshold==null?`<p>Rang maximal atteint.</p>`:`<div class="rep-progress"><span style="width:${progress}%"></span></div><div class="rep-progress-label"><span>${esc(r.rank)}</span><span>${r.next_threshold-r.score} pt${r.next_threshold-r.score>1?"s":""} avant ${esc(r.next_rank)}</span></div>`}`
}

async function loadCollaborators(){
  const grid=$("#collaborators-grid");if(!grid||!supabase)return;
  try{
    const{data,error}=await supabase.functions.invoke("collaborators-status");if(error)throw error;const items=data?.collaborators||[];
    if(!items.length){grid.innerHTML=`<div class="empty-state"><strong>Aucun collaborateur affiché pour le moment</strong><p>Les chaînes seront ajoutées depuis l’administration HALARYK.</p></div>`;return}
    grid.innerHTML=items.map(c=>`<a class="collaborator-card ${c.is_live?"is-live":""}" href="https://www.twitch.tv/${encodeURIComponent(c.login)}" target="_blank" rel="noopener noreferrer"><div class="collaborator-head">${c.profile_image_url?`<img class="collaborator-avatar" src="${esc(c.profile_image_url)}" alt="Avatar de ${esc(c.display_name)}">`:""}<div><h3 class="collaborator-name">${esc(c.display_name||c.login)}</h3><span class="collaborator-login">twitch.tv/${esc(c.login)}</span></div></div><p class="collaborator-bio">${esc(c.description||"Streamer régulièrement présent sur la chaîne.")}</p><div class="collaborator-status"><div class="collaborator-status-line"><span class="collaborator-status-dot"></span><strong>${c.is_live?"EN DIRECT":"Hors ligne"}</strong></div>${c.is_live?`<div class="collaborator-stream"><strong>${esc(c.game_name||"Twitch")}</strong><span>${esc(c.title||"Live en cours")}</span></div>`:""}<div class="collaborator-link">${c.is_live?"Voir le direct":"Voir la chaîne"} ↗</div></div></a>`).join("")
  }catch{grid.innerHTML=`<div class="empty-state"><strong>Collaborateurs indisponibles</strong><p>Le module Twitch sera disponible une fois le backend entièrement configuré.</p></div>`}
}

function initInteractions(){
  $("#login-button").onclick=signIn;$("#suggestion-login-cta").onclick=signIn;$("#reputation-login")?.addEventListener("click",signIn);$("#logout-button").onclick=signOut;$("#user-button").onclick=()=>$("#user-menu").classList.toggle("hidden");
  $("#library-detail-close")?.addEventListener("click",closeLibraryDetail);
  $$(".library-filters button").forEach(b=>b.onclick=async()=>{$$(".library-filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");libraryFilter=b.dataset.libraryFilter;closeLibraryDetail();await loadLibrary()});
  $$(".category-card").forEach(b=>b.onclick=async()=>{$$(".category-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentCategory=b.dataset.category;const c=categoryCopy[currentCategory];$("#category-label").textContent=c[0];$("#category-title").textContent=c[1];$("#category-description").textContent=c[2];await loadSuggestions()});
  $$(".suggestion-tabs button").forEach(b=>b.onclick=()=>{$$(".suggestion-tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");const ideas=b.dataset.suggestionTab==="ideas";$("#ideas-panel").classList.toggle("hidden",!ideas);$("#polls-panel").classList.toggle("hidden",ideas)});
  $$('[data-sort]').forEach(b=>b.onclick=async()=>{$$('[data-sort]').forEach(x=>x.classList.remove("active"));b.classList.add("active");currentSort=b.dataset.sort;await loadSuggestions()});
  $("#status-filter").onchange=async e=>{currentStatus=e.target.value;await loadSuggestions()};$("#suggestion-title").oninput=renderSimilar;$("#suggestion-form").onsubmit=submitSuggestion
}
async function initBackend(){
  if(!BACKEND_CONFIGURED){$("#live-label").textContent="Twitch";$("#live-detail").textContent="Service V4 à connecter";$("#suggestion-login-cta").textContent="Connexion bientôt disponible";$("#suggestion-auth-hint").textContent="La base V4 doit être connectée pour activer les suggestions.";$("#submit-suggestion").disabled=true;return}
  supabase=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const{data}=await supabase.auth.getSession();session=data.session;await syncAuth();
  supabase.auth.onAuthStateChange(async(_e,s)=>{session=s;await syncAuth();await Promise.all([loadSuggestions(),loadPolls(),loadReputation()])});
  await Promise.all([loadLive(),loadLibrary(),loadSuggestions(),loadPolls(),loadReputation(),loadCollaborators()])
}
initNavigation();initClips();initInteractions();initBackend();
