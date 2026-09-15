import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";

const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
let supabase=null,session=null,currentCategory="games",currentSort="popular",currentStatus="all",libraryFilter="playing",librarySearch="",libraryMobileExpanded=false,currentSuggestionFeed=[],libraryGames=[];

const categoryCopy={
  games:["Jeux de semaine","Proposez un jeu à faire en stream.","Cette catégorie concerne les streams du lundi et du mercredi."],
  concepts:["Concepts & défis","Proposez un concept, une règle spéciale ou un défi.","Une idée pour modifier la manière de jouer ou créer un format ponctuel."],
  twitch:["Twitch & interactions","Proposez une amélioration du stream.","Commandes, récompenses de chaîne, interactions, scènes, overlays ou idées liées au live."],
  community:["Site & Discord","Proposez une amélioration de la communauté.","Une idée pour le site HALARYK, Discord ou l’organisation de la communauté."],
  events:["Événements spéciaux","Proposez un live exceptionnel ou une soirée à thème.","Cette catégorie ne concerne pas le choix des jeux du dimanche."],
  other:["Autre","Une idée qui ne rentre nulle part ailleurs ?","Utilisez cette catégorie pour les propositions plus difficiles à classer."]
};
const statusLabels={new:"Nouvelle",considering:"En réflexion",planned:"Prévue",completed:"Terminée",rejected:"Refusée",archived:"Archivée"};
const libraryLabels={playing:"En cours",completed:"Terminé",wishlist:"À venir"};
const normalizeLibraryStatus=status=>status==="playing"?"playing":status==="completed"?"completed":"wishlist";
const repIcons={"Traître":"☠️","Inconnu":"👤","Habitué":"🏠","Conseiller":"🗣️","Confident":"⚜️","Favori":"👑"};

function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function fmtDate(v){try{return new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(v))}catch{return""}}
function hdCover(url=""){return String(url||"").replace("/t_cover_big/","/t_cover_big_2x/")}
function publicSummary(value="",max=420){const text=String(value||"").replace(/\s+/g," ").trim();if(!text||text.length<=max)return text;const cut=text.slice(0,max+1);const sentence=Math.max(cut.lastIndexOf(". "),cut.lastIndexOf("! "),cut.lastIndexOf("? "));if(sentence>max*.55)return cut.slice(0,sentence+1).trim();const space=cut.lastIndexOf(" ");return `${cut.slice(0,space>0?space:max).trim()}…`;}
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
  const menu=$(".menu-toggle"),nav=$(".nav"),drop=$(".nav-dropdown"),dropBtn=$(".nav-dropdown-button"),menuText=$(".menu-toggle .sr-only");
  const isMobile=()=>innerWidth<=880;
  const closeNav=()=>{nav?.classList.remove("open");document.body.classList.remove("menu-open");menu?.setAttribute("aria-expanded","false");if(menuText)menuText.textContent="Ouvrir le menu";if(!isMobile()){drop?.classList.remove("open");dropBtn?.setAttribute("aria-expanded","false")}};
  menu?.addEventListener("click",()=>{const open=nav.classList.toggle("open");document.body.classList.toggle("menu-open",open);menu.setAttribute("aria-expanded",String(open));if(menuText)menuText.textContent=open?"Fermer le menu":"Ouvrir le menu";if(open&&isMobile()){drop?.classList.add("open");dropBtn?.setAttribute("aria-expanded","true")}});
  dropBtn?.addEventListener("click",e=>{if(isMobile())return;e.stopPropagation();const open=drop.classList.toggle("open");dropBtn.setAttribute("aria-expanded",String(open))});
  document.addEventListener("click",e=>{if(!isMobile()&&drop&&!drop.contains(e.target)){drop.classList.remove("open");dropBtn?.setAttribute("aria-expanded","false")}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeNav()});
  $$(".nav a").forEach(a=>a.addEventListener("click",()=>closeNav()));
  window.addEventListener("resize",()=>{if(innerWidth>880)closeNav()});
  const ro=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");ro.unobserve(e.target)}}),{threshold:.1});
  $$(".reveal").forEach(e=>ro.observe(e));
}
function renderClips(slugs=[]){
  const grid=$("#clips-grid");if(!grid)return;const parent=location.hostname||"halaryk.github.io";
  const clips=slugs.filter(Boolean).slice(0,4);
  grid.innerHTML=clips.length?clips.map((clip,i)=>`<article class="clip-card"><iframe src="https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&parent=${encodeURIComponent(parent)}" title="Clip Twitch HALARYK ${i+1}" loading="lazy" allowfullscreen></iframe></article>`).join(""):`<div class="empty-state"><strong>Aucun clip sélectionné</strong><p>Les clips seront ajoutés depuis l’administration.</p></div>`;
}
function initClips(){
  renderClips(CONFIG.TWITCH_CLIPS||[]);
  if(CONFIG.CLIPPER_NAMES?.length){const names=CONFIG.CLIPPER_NAMES.map(n=>`<strong>${esc(n)}</strong>`);let list=names[0];if(names.length===2)list=`${names[0]} et ${names[1]}`;else if(names.length>2)list=`${names.slice(0,-1).join(", ")} et ${names.at(-1)}`;$("#clip-thanks-text").innerHTML=`Un grand merci à ${list} pour leurs clips et leur œil toujours bien placé.`}
}
async function loadClips(){
  if(!supabase)return;
  try{const{data,error}=await supabase.from("site_clips").select("position,clip_slug").order("position",{ascending:true});if(error)throw error;if(data?.length)renderClips(data.map(x=>x.clip_slug));}catch{renderClips(CONFIG.TWITCH_CLIPS||[])}
}
async function signIn(){if(!supabase)return toast("Connexion Twitch pas encore configurée.");const redirectTo=location.origin+location.pathname;const{error}=await supabase.auth.signInWithOAuth({provider:"twitch",options:{redirectTo}});if(error)toast(error.message)}
async function signOut(){if(supabase)await supabase.auth.signOut()}
async function syncAuth(){
  const login=$("#login-button"),chip=$("#user-button"),menu=$("#user-menu"),admin=$("#admin-link"),cta=$("#suggestion-login-cta"),hint=$("#suggestion-auth-hint");
  if(!session?.user){login.classList.remove("hidden");chip.classList.add("hidden");menu.classList.add("hidden");cta.classList.remove("hidden");hint.textContent="Connexion Twitch nécessaire pour proposer une idée.";return}
  const p=profile(session.user);login.classList.add("hidden");chip.classList.remove("hidden");$("#user-name").textContent=p.displayName;$("#user-avatar").src=p.avatar||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23130f0f'/%3E%3C/svg%3E";cta.classList.add("hidden");hint.textContent=`Connecté en tant que ${p.displayName}.`;
  // V4.2.2 : le profil public est resynchronisé côté serveur depuis l’identité Twitch vérifiée.
  // Le navigateur ne peut plus choisir lui-même son ID/login/avatar Twitch.
  const{error:profileSyncError}=await supabase.rpc("sync_my_twitch_profile");
  if(profileSyncError)console.warn("Synchronisation du profil Twitch impossible",profileSyncError.message);
  const{data:isAdmin}=await supabase.rpc("current_is_admin");admin.classList.toggle("hidden",!isAdmin)
}
async function loadLive(){try{const{data,error}=await supabase.functions.invoke("live-status");if(error)throw error;const card=$("#live-card");if(data?.is_live){card.classList.add("is-live");$("#live-label").textContent="EN DIRECT";$("#live-detail").textContent=`${data.game_name||"Twitch"} — ${data.title||"Live en cours"}`}else{$("#live-label").textContent="Hors ligne";$("#live-detail").textContent="Retrouve les prochains lives sur Twitch."}}catch{$("#live-label").textContent="Twitch";$("#live-detail").textContent="Voir la chaîne"}}
async function loadLibrary(){
  if(!supabase)return;
  const{data,error}=await supabase.from("library_games").select("*").order("updated_at",{ascending:false});
  if(error)return;
  libraryGames=data||[];
  $("#library-total").textContent=libraryGames.length;
  $("#library-completed").textContent=libraryGames.filter(g=>g.status==="completed").length;
  $("#library-playing").textContent=libraryGames.filter(g=>g.status==="playing").length;
  $("#library-wishlist").textContent=libraryGames.filter(g=>normalizeLibraryStatus(g.status)==="wishlist").length;
  renderLibraryGrid();
}
function libraryFilteredGames(){
  const q=norm(librarySearch);
  return libraryGames.filter(g=>(libraryFilter==="all"||normalizeLibraryStatus(g.status)===libraryFilter)&&(!q||norm(`${g.name||""} ${g.developer||""} ${g.rating??""}`).includes(q)));
}
function renderLibraryGrid(){
  let list=libraryFilteredGames(),grid=$("#library-grid"),more=$("#library-mobile-more");
  const mobile=matchMedia("(max-width:760px)").matches;
  const total=list.length;
  if(mobile&&!libraryMobileExpanded)list=list.slice(0,4);
  more?.classList.toggle("hidden",!mobile||total<=4||libraryMobileExpanded);
  if(!list.length){grid.innerHTML=`<div class="empty-state"><strong>Aucun jeu dans cette sélection</strong><p>Essaie une autre catégorie ou une autre recherche.</p></div>`;return}
  grid.innerHTML=list.map(g=>{
    const ratingText=g.rating!=null?`${Number(g.rating).toLocaleString("fr-FR",{maximumFractionDigits:1})}/10`:"Non noté";
    const rating=`<span class="game-rating ${g.rating==null?"is-unrated":""}">★ ${ratingText}</span>`;
    const short=publicSummary(g.summary,190);
    const summary=short?`<p class="game-summary">${esc(short)}</p>`:`<p class="game-summary game-summary-muted">Résumé à venir.</p>`;
    const normalizedStatus=normalizeLibraryStatus(g.status);
    return `<article class="game-card" data-public-game="${g.id}" tabindex="0" role="button" aria-label="Ouvrir la fiche de ${esc(g.name)}"><div class="game-cover-wrap"><img class="game-cover" src="${esc(hdCover(g.cover_url))}" alt="Jaquette de ${esc(g.name)}" loading="lazy">${rating}</div><div class="game-content"><h3>${esc(g.name)}</h3><div class="game-card-line"><p class="game-developer">${esc(g.developer||"Studio non renseigné")}</p><strong class="game-score-inline">${esc(ratingText)}</strong></div>${g.release_date?`<p class="game-release">${new Intl.DateTimeFormat("fr-FR",{year:"numeric"}).format(new Date(g.release_date))}</p>`:""}${summary}<div class="game-meta"><span class="tag">${esc(libraryLabels[normalizedStatus])}</span>${g.streamed?`<span class="tag tag-streamed">🎥 Streamé</span>`:""}</div></div></article>`
  }).join("");
  $$('[data-public-game]').forEach(card=>{card.onclick=()=>openLibraryDetail(card.dataset.publicGame);card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openLibraryDetail(card.dataset.publicGame)}}});
}
function openLibraryDetail(id){
  const g=libraryGames.find(x=>x.id===id);if(!g)return;
  const panel=$("#library-detail"),cover=$("#library-detail-cover");
  if(g.cover_url){cover.src=hdCover(g.cover_url);cover.alt=`Jaquette de ${g.name}`;cover.classList.remove("hidden")}else{cover.removeAttribute("src");cover.classList.add("hidden")}
  $("#library-detail-title").textContent=g.name;
  $("#library-detail-rating").textContent=g.rating!=null?`${Number(g.rating).toLocaleString("fr-FR",{maximumFractionDigits:1})} / 10` : "Non noté";
  $("#library-detail-developer").textContent=g.developer||"Studio de développement non renseigné";
  $("#library-detail-release").textContent=g.release_date?`Sortie : ${new Intl.DateTimeFormat("fr-FR",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(g.release_date))}`:"Date de sortie inconnue";
  $("#library-detail-status").textContent=libraryLabels[normalizeLibraryStatus(g.status)];
  $("#library-detail-playtime").textContent=g.playtime_hours!=null?`${new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1}).format(Number(g.playtime_hours))} h`:"Non renseigné";
  $("#library-detail-streamed").textContent=g.streamed?"Oui":"Non";
  $("#library-detail-summary").textContent=publicSummary(g.summary,520)||"Aucun résumé public n’a encore été rédigé pour ce jeu.";
  $("#library-detail-note").textContent=g.personal_note||"Aucun commentaire personnel pour ce jeu pour le moment.";
  panel.classList.remove("hidden");document.body.classList.add("modal-open");$(".library-modal-card")?.focus?.();
}
function closeLibraryDetail(){$("#library-detail")?.classList.add("hidden");document.body.classList.remove("modal-open")}
function renderSuggestion(s,pinned=false){
  const rep=s.rep_rank?`<span class="rep-badge ${repClass(s.rep_rank)}">${repIcons[s.rep_rank]||"✦"} ${esc(s.rep_rank)}</span>`:"";
  return `<article class="suggestion-card ${pinned?"pinned":""}" id="suggestion-${s.id}" data-suggestion-card="${s.id}">${pinned?`<span class="pinned-label">📌 Suggestion à la une</span>`:""}<div class="suggestion-head"><div class="suggestion-author">${s.author_avatar?`<img src="${esc(s.author_avatar)}" alt="">`:""}<span>${esc(s.author_name||"Utilisateur Twitch")} · ${fmtDate(s.created_at)}</span>${rep}</div><span class="status status-${esc(s.status)}">${esc(statusLabels[s.status]||s.status)}</span></div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>${s.official_reply?`<div class="official-reply"><strong>Réponse de Halaryk</strong><p>${esc(s.official_reply)}</p></div>`:""}<div class="suggestion-footer"><button class="vote-button ${s.has_voted?"voted":""}" data-vote="${s.id}" type="button">👍 <strong>${s.vote_count||0}</strong></button><span class="tag">${esc(categoryCopy[s.category]?.[0]||s.category)}</span><button class="share-link-button" data-share-suggestion="${s.id}" type="button" aria-label="Copier le lien de cette proposition">Lien ↗</button></div></article>`
}
async function loadSuggestions(){
  if(!supabase)return;const{data,error}=await supabase.rpc("get_suggestion_feed",{p_category:currentCategory,p_sort:currentSort==="recent"?"recent":"popular"});
  if(error){$("#suggestions-feed").innerHTML=`<div class="empty-state"><strong>Impossible de charger les suggestions</strong><p>${esc(error.message)}</p></div>`;return}
  currentSuggestionFeed=data||[];renderSimilar();let list=currentSuggestionFeed;if(currentSort==="mine")list=session?.user?list.filter(s=>s.author_id===session.user.id):[];if(currentStatus!=="all")list=list.filter(s=>s.status===currentStatus);
  $("#pinned-suggestion").innerHTML=list.filter(s=>s.pinned).map(s=>renderSuggestion(s,true)).join("");const normal=list.filter(s=>!s.pinned);$("#suggestions-feed").innerHTML=normal.length?normal.map(s=>renderSuggestion(s)).join(""):`<div class="empty-state"><strong>Aucune suggestion ici pour le moment</strong><p>La première pourrait être la tienne.</p></div>`;$$('[data-vote]').forEach(b=>b.onclick=()=>toggleVote(b.dataset.vote));$$('[data-share-suggestion]').forEach(b=>b.onclick=()=>copyCabinetLink('proposition',b.dataset.shareSuggestion));applyPendingCabinetHighlight();
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
  feed.innerHTML=polls.map(p=>{const type=p.allow_multiple?"checkbox":"radio",opts=p.options||[];return `<article class="poll-card" id="poll-${p.id}" data-poll-card="${p.id}"><div class="poll-title-row"><h3>${esc(p.title)}</h3><button class="share-link-button" data-share-poll="${p.id}" type="button">Copier le lien ↗</button></div>${p.description?`<p>${esc(p.description)}</p>`:""}<div class="poll-options">${opts.map(o=>{const pct=p.total_votes&&o.vote_count!=null?Math.round(o.vote_count/p.total_votes*100):0;return `<div class="poll-option">${p.results_visible?`<span class="poll-result-bar" style="width:${pct}%"></span>`:""}<label><input type="${type}" name="poll-${p.id}" value="${o.id}" ${o.selected?"checked":""}><span>${esc(o.label)}</span>${p.results_visible?`<span class="poll-result">${o.vote_count||0} · ${pct}%</span>`:""}</label></div>`}).join("")}</div><div class="poll-actions"><span>${p.ends_at?`Fin : ${fmtDate(p.ends_at)}`:"Sans date de fin"}</span><button class="button button-primary" data-poll="${p.id}" type="button">Voter</button></div></article>`}).join("");
  $$('[data-poll]').forEach(b=>b.onclick=()=>castPoll(b.dataset.poll));$$('[data-share-poll]').forEach(b=>b.onclick=()=>copyCabinetLink('sondage',b.dataset.sharePoll));applyPendingCabinetHighlight();
}
async function castPoll(id){if(!session?.user)return signIn();const card=$(`[data-poll-card="${id}"]`),ids=$$("input:checked",card).map(i=>i.value);if(!ids.length)return toast("Choisis au moins une option.");const{error}=await supabase.rpc("cast_poll_vote",{p_poll_id:id,p_option_ids:ids});if(error)toast(error.message);else{toast("Vote enregistré.");await loadPolls()}}

let pendingCabinetTarget=null;
function cabinetHash(type,id=""){return `#cabinet/${type}${id?`/${id}`:""}`}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast("Lien copié.")}catch{const t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();document.execCommand("copy");t.remove();toast("Lien copié.")}}
function copyCabinetLink(type,id){copyText(`${location.origin}${location.pathname}${cabinetHash(type,id)}`)}
function setCabinetTab(tab,{updateHash=true}={}){
  $$(".suggestion-tabs button").forEach(x=>x.classList.toggle("active",x.dataset.suggestionTab===tab));
  const ideas=tab==="ideas";$("#ideas-panel").classList.toggle("hidden",!ideas);$("#polls-panel").classList.toggle("hidden",ideas);
  if(updateHash)history.replaceState(null,"",cabinetHash(ideas?"propositions":"sondages"));
}
function applyPendingCabinetHighlight(){
  if(!pendingCabinetTarget)return;const el=$(pendingCabinetTarget.selector);if(!el)return;
  el.classList.add("deep-link-highlight");setTimeout(()=>el.classList.remove("deep-link-highlight"),4200);setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"center"}),80);pendingCabinetTarget=null;
}
async function applyCabinetRoute(){
  const h=decodeURIComponent(location.hash||"");if(h==="#suggestions"){history.replaceState(null,"",cabinetHash("propositions"));setCabinetTab("ideas",{updateHash:false});return}
  if(!h.startsWith("#cabinet/"))return;
  const [,section,id]=h.split("/");$("#suggestions")?.scrollIntoView({behavior:"smooth",block:"start"});
  if(section==="sondages"||section==="sondage"){setCabinetTab("polls",{updateHash:false});if(id){pendingCabinetTarget={selector:`#poll-${CSS.escape(id)}`};await loadPolls();applyPendingCabinetHighlight()}return}
  setCabinetTab("ideas",{updateHash:false});
  if(section==="proposition"&&id&&supabase){const{data}=await supabase.from("suggestions").select("category").eq("id",id).maybeSingle();if(data?.category&&categoryCopy[data.category]){currentCategory=data.category;$$('.category-card').forEach(x=>x.classList.toggle('active',x.dataset.category===currentCategory));const c=categoryCopy[currentCategory];$("#category-label").textContent=c[0];$("#category-title").textContent=c[1];$("#category-description").textContent=c[2]}pendingCabinetTarget={selector:`#suggestion-${CSS.escape(id)}`};await loadSuggestions();applyPendingCabinetHighlight()}
}
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
  $("#library-detail-close")?.addEventListener("click",closeLibraryDetail);$$('[data-library-close]').forEach(x=>x.addEventListener('click',closeLibraryDetail));
  $$(".library-filters button").forEach(b=>b.onclick=()=>{$$(".library-filters button").forEach(x=>x.classList.remove("active"));b.classList.add("active");libraryFilter=b.dataset.libraryFilter;libraryMobileExpanded=false;renderLibraryGrid()});
  $("#library-search")?.addEventListener("input",e=>{librarySearch=e.target.value;libraryMobileExpanded=false;renderLibraryGrid()});
  $("#library-mobile-more")?.addEventListener("click",()=>{libraryMobileExpanded=true;renderLibraryGrid()});
  $$(".category-card").forEach(b=>b.onclick=async()=>{$$(".category-card").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentCategory=b.dataset.category;const c=categoryCopy[currentCategory];$("#category-label").textContent=c[0];$("#category-title").textContent=c[1];$("#category-description").textContent=c[2];await loadSuggestions()});
  $$(".suggestion-tabs button").forEach(b=>b.onclick=()=>setCabinetTab(b.dataset.suggestionTab));
  $$('[data-sort]').forEach(b=>b.onclick=async()=>{$$('[data-sort]').forEach(x=>x.classList.remove("active"));b.classList.add("active");currentSort=b.dataset.sort;await loadSuggestions()});
  $("#status-filter").onchange=async e=>{currentStatus=e.target.value;await loadSuggestions()};$("#suggestion-title").oninput=renderSimilar;$("#suggestion-form").onsubmit=submitSuggestion;
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#library-detail")?.classList.contains("hidden"))closeLibraryDetail()});
  window.addEventListener("hashchange",()=>applyCabinetRoute());window.addEventListener("resize",()=>{if(matchMedia("(min-width:761px)").matches)libraryMobileExpanded=false;renderLibraryGrid()});
}
async function initBackend(){
  if(!BACKEND_CONFIGURED){$("#live-label").textContent="Twitch";$("#live-detail").textContent="Service V4 à connecter";$("#suggestion-login-cta").textContent="Connexion bientôt disponible";$("#suggestion-auth-hint").textContent="La base V4 doit être connectée pour activer les suggestions.";$("#submit-suggestion").disabled=true;return}
  supabase=createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const{data}=await supabase.auth.getSession();session=data.session;await syncAuth();
  supabase.auth.onAuthStateChange(async(_e,s)=>{session=s;await syncAuth();await Promise.all([loadSuggestions(),loadPolls(),loadReputation()])});
  await Promise.all([loadLive(),loadLibrary(),loadSuggestions(),loadPolls(),loadReputation(),loadCollaborators(),loadClips()]);await applyCabinetRoute()
}
initNavigation();initClips();initInteractions();initBackend();
