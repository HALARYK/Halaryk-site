import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "../config.js";

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const hdCover = (url = "") => String(url || "").replace("/t_cover_big/", "/t_cover_big_2x/");

let supabase = null;
let session = null;
let igdbResults = [];
let libraryGames = [];
let pendingGameIndex = null;
let confirmResolver = null;
let libraryRenderLimit = 60;
let gameSearchOffset = 0;
let gameSearchHasMore = false;
let gameSearchSourceSuggestionId = null;
let adminEvents = [];
let currentEventId = null;
let eventChapters = [];
const GAME_SEARCH_PAGE_SIZE = 24;

const repRank = s => s < 0 ? "☠️ Traître" : s < 20 ? "👤 Inconnu" : s < 50 ? "🏠 Habitué" : s < 80 ? "🗣️ Conseiller" : s < 100 ? "⚜️ Confident" : "👑 Favori";
const libraryStatusLabels = {
  playing: "En cours",
  completed: "Terminé",
  wishlist: "À venir"
};
const normalizeLibraryStatus = status => status === "playing" ? "playing" : status === "completed" ? "completed" : "wishlist";
const suggestionStatusLabels = {
  new: "Nouvelle",
  considering: "En réflexion",
  planned: "Prévue",
  completed: "Terminée",
  rejected: "Refusée",
  archived: "Archivée"
};
const suggestionCategoryLabels = {
  games: "Jeux de semaine",
  concepts: "Concepts & défis",
  twitch: "Twitch & interactions",
  community: "Site & Discord",
  events: "Événements spéciaux",
  other: "Autre"
};
const pollVisibilityLabels = {
  always: "Toujours visibles",
  after_vote: "Après avoir voté",
  after_close: "Après la fermeture"
};

function toast(message) {
  const e = document.createElement("div");
  e.className = "admin-toast";
  e.textContent = message;
  document.body.appendChild(e);
  setTimeout(() => e.remove(), 3200);
}

function toLocalDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function resetAdminModals() {
  ["#confirm-modal", "#game-add-modal"].forEach(selector => {
    const modal = $(selector);
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  });
  document.body.classList.remove("modal-open");
  if (confirmResolver) {
    const resolver = confirmResolver;
    confirmResolver = null;
    resolver(false);
  }
}

function askConfirm({ title = "Confirmer l’action", message = "Voulez-vous continuer ?", confirmLabel = "Confirmer", danger = false } = {}) {
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-accept").textContent = confirmLabel;
  $("#confirm-accept").classList.toggle("button-danger", danger);
  const modal = $("#confirm-modal");
  if (confirmResolver) {
    const previous = confirmResolver;
    confirmResolver = null;
    previous(false);
  }
  modal.classList.remove("hidden");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  return new Promise(resolve => { confirmResolver = resolve; });
}

function closeConfirm(result = false) {
  const modal = $("#confirm-modal");
  modal?.classList.remove("is-open");
  modal?.classList.add("hidden");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  const resolver = confirmResolver;
  confirmResolver = null;
  resolver?.(result);
}

async function signIn() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({ provider: "twitch", options: { redirectTo: location.href } });
}

async function checkAccess() {
  if (!session?.user) {
    $("#admin-login").classList.remove("hidden");
    $("#admin-logout").classList.add("hidden");
    $("#admin-gate").classList.remove("hidden");
    $("#admin-app").classList.add("hidden");
    $("#admin-gate-message").textContent = "Connexion Twitch nécessaire.";
    return;
  }

  $("#admin-login").classList.add("hidden");
  $("#admin-logout").classList.remove("hidden");
  const { data: isAdmin, error } = await supabase.rpc("current_is_admin");
  if (error || !isAdmin) {
    $("#admin-gate").classList.remove("hidden");
    $("#admin-app").classList.add("hidden");
    $("#admin-gate-message").textContent = "Ce compte Twitch n’a pas les droits d’administration.";
    return;
  }

  $("#admin-gate").classList.add("hidden");
  $("#admin-app").classList.remove("hidden");
  await refreshAll();
}

async function boot() {
  if (!BACKEND_CONFIGURED) {
    $("#admin-gate-message").textContent = "Le service Supabase n’est pas encore configuré dans config.js.";
    return;
  }
  supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
  const { data } = await supabase.auth.getSession();
  session = data.session;
  await checkAccess();
  supabase.auth.onAuthStateChange(async (_e, s) => {
    session = s;
    await checkAccess();
  });
}

async function refreshAll() {
  await Promise.all([loadStats(), loadSuggestions(), loadLibrary(), loadPolls(), loadReputation(), loadCollaborators(), loadClipsAdmin(), loadEventsAdmin()]);
}

async function loadStats() {
  const [{ data: s }, { data: g }, { data: p }, { data: r }, { data: c }] = await Promise.all([
    supabase.from("suggestions").select("status"),
    supabase.from("library_games").select("id"),
    supabase.from("polls").select("id").eq("is_active", true),
    supabase.from("reputation_scores").select("id"),
    supabase.from("collaborators").select("id").eq("active", true)
  ]);
  $("#stat-new-suggestions").textContent = (s || []).filter(x => x.status === "new").length;
  $("#stat-considering").textContent = (s || []).filter(x => x.status === "considering").length;
  $("#stat-library").textContent = (g || []).length;
  $("#stat-polls").textContent = (p || []).length;
  $("#stat-reputation").textContent = (r || []).length;
  $("#stat-collaborators").textContent = (c || []).length;
}

async function loadSuggestions() {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*,profiles!suggestions_author_id_fkey(display_name,avatar_url)")
    .order("created_at", { ascending: false });

  if (error) {
    $("#admin-suggestions").textContent = error.message;
    return;
  }

  const all = data || [];
  $("#admin-suggestions").innerHTML = all.length ? all.map(s => `
    <article class="admin-item" data-suggestion="${s.id}">
      <div class="admin-item-head">
        <div>
          <small>${esc(s.profiles?.display_name || "Utilisateur Twitch")} · ${esc(suggestionCategoryLabels[s.category] || "Autre")}</small>
          <h2>${esc(s.title)}</h2>
        </div>
        <label class="check-row"><input class="suggestion-pinned" type="checkbox" ${s.pinned ? "checked" : ""}> Épinglée</label>
      </div>
      <p>${esc(s.body)}</p>
      <div class="admin-two-cols">
        <label>Statut
          <select class="suggestion-status">
            ${Object.entries(suggestionStatusLabels).map(([st, label]) => `<option value="${st}" ${s.status === st ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <label>Fusionner vers
          <select class="suggestion-merge">
            <option value="">— Choisir —</option>
            ${all.filter(x => x.id !== s.id).map(x => `<option value="${x.id}">${esc(x.title)}</option>`).join("")}
          </select>
        </label>
      </div>
      <label>Réponse officielle<textarea class="suggestion-reply" rows="3">${esc(s.official_reply || "")}</textarea></label>
      <div class="admin-actions">
        <button data-save-suggestion="${s.id}">Enregistrer</button>
        <button data-merge-suggestion="${s.id}">Fusionner</button>
        <button data-link-game="${s.id}">Ajouter un jeu lié</button>
        <button class="danger-action" data-delete-suggestion="${s.id}">Supprimer</button>
      </div>
    </article>`).join("") : `<div class="admin-card"><p>Aucune suggestion pour le moment.</p></div>`;

  $$('[data-save-suggestion]').forEach(b => b.onclick = () => saveSuggestion(b.dataset.saveSuggestion));
  $$('[data-merge-suggestion]').forEach(b => b.onclick = () => mergeSuggestion(b.dataset.mergeSuggestion));
  $$('[data-delete-suggestion]').forEach(b => b.onclick = () => deleteSuggestion(b.dataset.deleteSuggestion));
  $$('[data-link-game]').forEach(b => b.onclick = () => {
    const item = $(`[data-suggestion="${b.dataset.linkGame}"]`);
    $("#game-search-input").value = $("h2", item).textContent;
    if ($("#game-search-mode")) $("#game-search-mode").value = "title";
    document.querySelector('[data-admin-tab="library"]').click();
    searchGames(b.dataset.linkGame);
  });
}

async function saveSuggestion(id) {
  const item = $(`[data-suggestion="${id}"]`);
  const status = $(".suggestion-status", item).value;
  const official_reply = $(".suggestion-reply", item).value.trim() || null;
  const pinned = $(".suggestion-pinned", item).checked;
  const { error } = await supabase.from("suggestions").update({ status, official_reply, pinned }).eq("id", id);
  if (error) toast(error.message);
  else {
    toast("Suggestion mise à jour.");
    await refreshAll();
  }
}

async function mergeSuggestion(source) {
  const item = $(`[data-suggestion="${source}"]`);
  const target = $(".suggestion-merge", item).value;
  if (!target) return toast("Choisis une suggestion cible.");
  const ok = await askConfirm({
    title: "Fusionner les suggestions",
    message: "La suggestion actuelle sera fusionnée avec la suggestion choisie et ses votes seront transférés.",
    confirmLabel: "Fusionner"
  });
  if (!ok) return;
  const { error } = await supabase.rpc("merge_suggestions", { p_source: source, p_target: target });
  if (error) toast(error.message);
  else {
    toast("Suggestions fusionnées.");
    await refreshAll();
  }
}

async function deleteSuggestion(id) {
  const ok = await askConfirm({
    title: "Supprimer la suggestion",
    message: "Cette suppression est définitive. Les votes associés seront également supprimés.",
    confirmLabel: "Supprimer",
    danger: true
  });
  if (!ok) return;
  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) toast(error.message);
  else {
    toast("Suggestion supprimée.");
    await refreshAll();
  }
}

async function searchGames(sourceSuggestionId = null, append = false) {
  const q = $("#game-search-input").value.trim();
  const mode = $("#game-search-mode")?.value === "developer" ? "developer" : "title";
  if (q.length < 2) return;

  if (!append) {
    gameSearchOffset = 0;
    gameSearchHasMore = false;
    gameSearchSourceSuggestionId = sourceSuggestionId;
    igdbResults = [];
    $("#game-search-results").innerHTML = '<div class="admin-searching">Recherche en cours…</div>';
    $("#game-search-meta").textContent = "";
    $("#game-search-more").innerHTML = "";
  } else {
    sourceSuggestionId = gameSearchSourceSuggestionId;
    $("#game-search-more").innerHTML = '<span class="admin-searching">Chargement…</span>';
  }

  const { data, error } = await supabase.functions.invoke("game-search", {
    body: {
      query: q,
      mode,
      limit: GAME_SEARCH_PAGE_SIZE,
      offset: append ? gameSearchOffset : 0
    }
  });

  if (error) {
    $("#game-search-results").textContent = error.message;
    $("#game-search-more").innerHTML = "";
    return;
  }

  if (data?.error) {
    $("#game-search-results").textContent = data.error;
    $("#game-search-more").innerHTML = "";
    return;
  }

  const incoming = (data?.games || []).map(g => ({ ...g, sourceSuggestionId }));
  if (append) {
    const existing = new Set(igdbResults.map(g => String(g.id)));
    igdbResults.push(...incoming.filter(g => !existing.has(String(g.id))));
  } else {
    igdbResults = incoming;
  }

  gameSearchOffset = Number(data?.next_offset ?? igdbResults.length);
  gameSearchHasMore = Boolean(data?.has_more);

  const studioMatches = Array.isArray(data?.matched_developers) ? data.matched_developers.filter(Boolean) : [];
  const metaParts = [`${igdbResults.length} résultat${igdbResults.length > 1 ? "s" : ""} affiché${igdbResults.length > 1 ? "s" : ""}`];
  if (mode === "developer" && studioMatches.length) {
    metaParts.push(`studios trouvés : ${studioMatches.slice(0, 6).join(", ")}${studioMatches.length > 6 ? "…" : ""}`);
  }
  $("#game-search-meta").textContent = metaParts.join(" · ");

  $("#game-search-results").innerHTML = igdbResults.length ? igdbResults.map((g, i) => `
    <article class="game-search-card">
      ${g.cover_url ? `<img src="${esc(hdCover(g.cover_url))}" alt="Jaquette de ${esc(g.name)}">` : ""}
      <strong>${esc(g.name)}</strong>
      <small>${g.developer ? `${esc(g.developer)} · ` : ""}${g.release_year || "Date inconnue"}</small>
      <button data-add-game="${i}">Ajouter</button>
    </article>`).join("") : '<div class="admin-searching">Aucun résultat.</div>';

  $$('[data-add-game]').forEach(b => b.onclick = () => openGameModal(Number(b.dataset.addGame)));

  $("#game-search-more").innerHTML = gameSearchHasMore
    ? `<button id="game-search-more-button" class="button button-ghost" type="button">Afficher ${GAME_SEARCH_PAGE_SIZE} résultats de plus</button>`
    : (igdbResults.length ? '<span class="admin-searching">Fin des résultats.</span>' : "");

  $("#game-search-more-button")?.addEventListener("click", () => searchGames(gameSearchSourceSuggestionId, true));
}
function openGameModal(i) {
  const g = igdbResults[i];
  if (!g) return;
  pendingGameIndex = i;
  $("#game-add-title").textContent = g.name;
  $("#game-add-year").textContent = g.release_year ? `Sortie : ${g.release_year}` : "Date de sortie inconnue";
  $("#game-add-status").value = "wishlist";
  $("#game-add-streamed").checked = false;
  $("#game-add-playtime").value = "";
  $("#game-add-rating").value = "";
  $("#game-add-developer").value = g.developer || "";
  $("#game-add-summary").value = "";
  $("#game-add-note").value = "";
  const cover = $("#game-add-cover");
  if (g.cover_url) {
    cover.src = hdCover(g.cover_url);
    cover.alt = `Jaquette de ${g.name}`;
    cover.classList.remove("hidden");
  } else {
    cover.removeAttribute("src");
    cover.classList.add("hidden");
  }
  const modal = $("#game-add-modal");
  modal.classList.remove("hidden");
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeGameModal() {
  pendingGameIndex = null;
  $("#game-add-modal").classList.add("hidden");
  document.body.classList.remove("modal-open");
}

async function confirmAddGame() {
  if (pendingGameIndex === null) return;
  const g = igdbResults[pendingGameIndex];
  const status = $("#game-add-status").value;
  const streamed = $("#game-add-streamed").checked;
  const hoursRaw = $("#game-add-playtime").value.trim();
  const playtime_hours = hoursRaw === "" ? null : Number(hoursRaw.replace(",", "."));
  const ratingRaw = $("#game-add-rating").value.trim();
  const rating = ratingRaw === "" ? null : Number(ratingRaw.replace(",", "."));
  const developer = $("#game-add-developer").value.trim() || null;
  const summary = $("#game-add-summary").value.trim().slice(0,520) || null;
  const personal_note = $("#game-add-note").value.trim() || null;
  if (playtime_hours !== null && (!Number.isFinite(playtime_hours) || playtime_hours < 0)) return toast("Le temps de jeu doit être un nombre positif.");
  if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 10)) return toast("La note doit être comprise entre 0 et 10.");

  $("#game-add-confirm").disabled = true;
  const { error } = await supabase.from("library_games").insert({
    igdb_id: g.id,
    name: g.name,
    slug: g.slug,
    cover_url: g.cover_url || null,
    genres: g.genres || [],
    platforms: g.platforms || [],
    release_date: g.release_date || null,
    status,
    streamed,
    playtime_hours,
    rating,
    developer,
    summary,
    personal_note,
    source_suggestion_id: g.sourceSuggestionId || null
  });
  $("#game-add-confirm").disabled = false;
  if (error) return toast(error.message);
  closeGameModal();
  toast("Jeu ajouté à la ludothèque.");
  await refreshAll();
}

async function loadLibrary() {
  const { data, error } = await supabase.from("library_games").select("*").order("name", { ascending: true });
  if (error) {
    $("#admin-library").textContent = error.message;
    return;
  }
  libraryGames = data || [];
  renderLibrary();
}

function renderLibrary() {
  const q = ($("#library-search-input")?.value || "").trim().toLocaleLowerCase("fr");
  const status = $("#library-status-filter")?.value || "all";
  const filtered = libraryGames.filter(g => {
    const hay = `${g.name || ""} ${g.developer || ""} ${g.rating ?? ""}`.toLocaleLowerCase("fr");
    return (!q || hay.includes(q)) && (status === "all" || normalizeLibraryStatus(g.status) === status);
  });
  const visible = filtered.slice(0, libraryRenderLimit);
  const count = $("#library-result-count");
  if (count) count.textContent = `${filtered.length} jeu${filtered.length > 1 ? "x" : ""} trouvé${filtered.length > 1 ? "s" : ""} sur ${libraryGames.length}`;

  $("#admin-library").innerHTML = visible.length ? visible.map(g => `
    <article class="admin-item library-game-item" data-game="${g.id}">
      <div class="library-admin-head">
        ${g.cover_url ? `<img src="${esc(hdCover(g.cover_url))}" alt="" class="library-admin-cover">` : ""}
        <div class="library-admin-title">
          <h2>${esc(g.name)}</h2>
          <small>${esc(libraryStatusLabels[normalizeLibraryStatus(g.status)])}${g.release_date ? ` · Sortie : ${new Intl.DateTimeFormat("fr-FR", { year: "numeric" }).format(new Date(g.release_date))}` : ""}</small>
        </div>
        <small>${g.streamed ? "🎥 Streamé" : ""}</small>
      </div>
      <div class="admin-three-cols">
        <label>Statut
          <select class="game-status">${Object.entries(libraryStatusLabels).map(([st, label]) => `<option value="${st}" ${normalizeLibraryStatus(g.status) === st ? "selected" : ""}>${label}</option>`).join("")}</select>
        </label>
        <label>Temps de jeu (heures)<input class="game-playtime" type="number" min="0" step="0.1" value="${g.playtime_hours ?? ""}" placeholder="Ex. : 1714"></label>
        <label>Note / 10<input class="game-rating-edit" type="number" min="0" max="10" step="0.5" value="${g.rating ?? ""}" placeholder="Ex. : 8.5"></label>
      </div>
      <label class="check-row"><input class="game-streamed" type="checkbox" ${g.streamed ? "checked" : ""}> Streamé sur la chaîne</label>
      <label>Studio de développement<input class="game-developer-edit" value="${esc(g.developer || "")}" placeholder="Ex. : LEVEL-5"></label>
      <label>Résumé public <small>2 à 4 lignes, idéalement en français</small><textarea class="game-summary-edit" rows="4" maxlength="520" placeholder="Résumé court type fiche Steam…">${esc(g.summary || "")}</textarea></label>
      <label>Commentaire personnel<textarea class="game-note" rows="3" placeholder="Ton avis, un souvenir, un commentaire…">${esc(g.personal_note || "")}</textarea></label>
      <div class="admin-actions">
        <button data-save-game="${g.id}">Enregistrer</button>
        ${g.igdb_id ? `<button data-refresh-game="${g.id}">Actualiser via IGDB</button>` : ""}
        <button class="danger-action" data-delete-game="${g.id}">Supprimer</button>
      </div>
    </article>`).join("") : '<div class="admin-card library-empty"><p>Aucun jeu ne correspond à cette recherche.</p></div>';

  if (filtered.length > visible.length) {
    $("#admin-library").insertAdjacentHTML("beforeend", `<button id="library-load-more" class="button button-ghost library-load-more" type="button">Afficher ${Math.min(60, filtered.length - visible.length)} jeux supplémentaires</button>`);
    $("#library-load-more").onclick = () => {
      libraryRenderLimit += 60;
      renderLibrary();
    };
  }

  $$('[data-save-game]').forEach(b => b.onclick = () => saveGame(b.dataset.saveGame));
  $$('[data-refresh-game]').forEach(b => b.onclick = () => refreshGameFromIGDB(b.dataset.refreshGame));
  $$('[data-delete-game]').forEach(b => b.onclick = () => deleteGame(b.dataset.deleteGame));
}

async function saveGame(id) {
  const item = $(`[data-game="${id}"]`);
  const status = $(".game-status", item).value;
  const streamed = $(".game-streamed", item).checked;
  const personal_note = $(".game-note", item).value.trim() || null;
  const developer = $(".game-developer-edit", item).value.trim() || null;
  const summary = $(".game-summary-edit", item).value.trim().slice(0,520) || null;
  const hoursRaw = $(".game-playtime", item).value.trim();
  const ratingRaw = $(".game-rating-edit", item).value.trim();
  const playtime_hours = hoursRaw === "" ? null : Number(hoursRaw.replace(",", "."));
  const rating = ratingRaw === "" ? null : Number(ratingRaw.replace(",", "."));
  if (playtime_hours !== null && (!Number.isFinite(playtime_hours) || playtime_hours < 0)) return toast("Le temps de jeu doit être un nombre positif.");
  if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 10)) return toast("La note doit être comprise entre 0 et 10.");
  const { error } = await supabase.from("library_games").update({ status, streamed, personal_note, playtime_hours, rating, developer, summary }).eq("id", id);
  if (error) toast(error.message);
  else {
    toast("Jeu mis à jour.");
    await loadLibrary();
    await loadStats();
  }
}

async function refreshGameFromIGDB(id) {
  const game=libraryGames.find(g=>g.id===id);if(!game?.igdb_id)return toast("Ce jeu n’a pas d’identifiant IGDB.");
  toast("Actualisation IGDB en cours…");
  const{data,error}=await supabase.functions.invoke("game-search",{body:{id:game.igdb_id,query:game.name}});if(error)return toast(error.message);
  const fresh=data?.games?.[0];if(!fresh)return toast("Jeu introuvable sur IGDB.");
  const patch={developer:fresh.developer||game.developer||null,cover_url:fresh.cover_url||game.cover_url||null,release_date:fresh.release_date||game.release_date||null,genres:fresh.genres||game.genres||[],platforms:fresh.platforms||game.platforms||[]};
  const{error:updateError}=await supabase.from("library_games").update(patch).eq("id",id);if(updateError)return toast(updateError.message);
  toast("IGDB actualisé : jaquette, studio et date mis à jour. Ton résumé public a été conservé.");await loadLibrary();
}

async function deleteGame(id) {
  const game = libraryGames.find(g => g.id === id);
  const ok = await askConfirm({
    title: "Supprimer le jeu",
    message: `Retirer définitivement « ${game?.name || "ce jeu"} » de la ludothèque ?`,
    confirmLabel: "Supprimer",
    danger: true
  });
  if (!ok) return;
  const { error } = await supabase.from("library_games").delete().eq("id", id);
  if (error) toast(error.message);
  else {
    toast("Jeu supprimé.");
    await refreshAll();
  }
}

async function createPoll(e) {
  e.preventDefault();
  const title = $("#poll-title").value.trim();
  const description = $("#poll-description").value.trim() || null;
  const labels = $("#poll-options").value.split("\n").map(x => x.trim()).filter(Boolean);
  if (labels.length < 2) return toast("Il faut au moins deux options.");
  const endsAt = $("#poll-end").value ? new Date($("#poll-end").value).toISOString() : null;
  const { data: poll, error } = await supabase.from("polls").insert({
    title,
    description,
    allow_multiple: $("#poll-multiple").checked,
    results_visibility: $("#poll-visibility").value,
    ends_at: endsAt,
    created_by: session.user.id
  }).select().single();
  if (error) return toast(error.message);
  const { error: optionError } = await supabase.from("poll_options").insert(labels.map((label, position) => ({ poll_id: poll.id, label, position })));
  if (optionError) toast(optionError.message);
  else {
    $("#poll-form").reset();
    toast("Sondage créé.");
    await refreshAll();
  }
}

function pollState(p) {
  const now = Date.now();
  const starts = p.starts_at ? new Date(p.starts_at).getTime() : null;
  const ends = p.ends_at ? new Date(p.ends_at).getTime() : null;
  if (!p.is_active) return ["Désactivé", "disabled"];
  if (starts && starts > now) return ["À venir", "upcoming"];
  if (ends && ends <= now) return ["Terminé", "ended"];
  return ["En cours", "active"];
}

async function loadPolls() {
  const { data, error } = await supabase.rpc("get_admin_polls");
  if (error) {
    $("#admin-polls").innerHTML = `<div class="admin-card"><p>Impossible de charger les sondages : ${esc(error.message)}</p></div>`;
    return;
  }

  const polls = Array.isArray(data) ? data : [];
  $("#admin-polls").innerHTML = polls.length ? polls.map(p => {
    const [stateLabel, stateClass] = pollState(p);
    const totalVoters = Number(p.total_voters || 0);
    const options = p.options || [];
    return `
      <article class="admin-item poll-admin-card" data-poll="${p.id}" data-active="${p.is_active ? "1" : "0"}">
        <div class="admin-item-head">
          <div>
            <span class="poll-state poll-state-${stateClass}">${stateLabel}</span>
            <h2>${esc(p.title)}</h2>
          </div>
          <div class="poll-total-voters"><strong>${totalVoters}</strong><span>votant${totalVoters > 1 ? "s" : ""}</span></div>
        </div>
        <div class="admin-two-cols">
          <label>Titre<input class="poll-edit-title" value="${esc(p.title)}"></label>
          <label>Résultats
            <select class="poll-edit-visibility">${Object.entries(pollVisibilityLabels).map(([value, label]) => `<option value="${value}" ${p.results_visibility === value ? "selected" : ""}>${label}</option>`).join("")}</select>
          </label>
        </div>
        <label>Description<textarea class="poll-edit-description" rows="3">${esc(p.description || "")}</textarea></label>
        <div class="admin-three-cols">
          <label>Début<input class="poll-edit-start" type="datetime-local" value="${toLocalDateTime(p.starts_at)}"></label>
          <label>Fin<input class="poll-edit-end" type="datetime-local" value="${toLocalDateTime(p.ends_at)}"></label>
          <label class="check-row"><input class="poll-edit-multiple" type="checkbox" ${p.allow_multiple ? "checked" : ""}> Plusieurs réponses autorisées</label>
        </div>
        <div class="poll-admin-options">
          <h3>Résultats et propositions</h3>
          ${options.map(o => {
            const votes = Number(o.vote_count || 0);
            const pct = totalVoters ? Math.round(votes / totalVoters * 100) : 0;
            return `<div class="poll-admin-option" data-option="${o.id}">
              <input class="poll-option-label" value="${esc(o.label)}" aria-label="Texte de la proposition">
              <div class="poll-option-stats"><strong>${votes}</strong><span>vote${votes > 1 ? "s" : ""} · ${pct}% des votants</span></div>
              <div class="poll-admin-bar"><span style="width:${Math.min(100, pct)}%"></span></div>
            </div>`;
          }).join("")}
        </div>
        <div class="poll-admin-meta">
          <span>Créé le ${formatDate(p.created_at)}</span>
          <span>${p.ends_at ? `Fin prévue : ${formatDate(p.ends_at)}` : "Sans date de fin"}</span>
        </div>
        <div class="admin-actions">
          <button data-save-poll="${p.id}">Enregistrer les modifications</button>
          <button data-toggle-poll="${p.id}">${p.is_active ? "Désactiver" : "Réactiver"}</button>
          <button class="danger-action" data-delete-poll="${p.id}">Supprimer</button>
        </div>
      </article>`;
  }).join("") : `<div class="admin-card"><p>Aucun sondage n’a encore été créé.</p></div>`;

  $$('[data-save-poll]').forEach(b => b.onclick = () => savePoll(b.dataset.savePoll));
  $$('[data-toggle-poll]').forEach(b => b.onclick = () => togglePoll(b.dataset.togglePoll));
  $$('[data-delete-poll]').forEach(b => b.onclick = () => deletePoll(b.dataset.deletePoll));
}

async function savePoll(id) {
  const item = $(`[data-poll="${id}"]`);
  const title = $(".poll-edit-title", item).value.trim();
  if (!title) return toast("Le titre du sondage ne peut pas être vide.");
  const description = $(".poll-edit-description", item).value.trim() || null;
  const results_visibility = $(".poll-edit-visibility", item).value;
  const allow_multiple = $(".poll-edit-multiple", item).checked;
  const startValue = $(".poll-edit-start", item).value;
  const endValue = $(".poll-edit-end", item).value;
  const starts_at = startValue ? new Date(startValue).toISOString() : new Date().toISOString();
  const ends_at = endValue ? new Date(endValue).toISOString() : null;

  const { error } = await supabase.from("polls").update({ title, description, results_visibility, allow_multiple, starts_at, ends_at }).eq("id", id);
  if (error) return toast(error.message);

  const optionInputs = $$(".poll-admin-option", item);
  for (const row of optionInputs) {
    const optionId = row.dataset.option;
    const label = $(".poll-option-label", row).value.trim();
    if (!label) return toast("Une proposition ne peut pas être vide.");
    const { error: optionError } = await supabase.from("poll_options").update({ label }).eq("id", optionId);
    if (optionError) return toast(optionError.message);
  }

  toast("Sondage mis à jour.");
  await loadPolls();
}

async function togglePoll(id) {
  const item = $(`[data-poll="${id}"]`);
  const active = item.dataset.active === "1";
  const { error } = await supabase.from("polls").update({ is_active: !active }).eq("id", id);
  if (error) toast(error.message);
  else {
    toast(active ? "Sondage désactivé." : "Sondage réactivé.");
    await refreshAll();
  }
}

async function deletePoll(id) {
  const ok = await askConfirm({
    title: "Supprimer le sondage",
    message: "Le sondage, ses propositions et tous les votes associés seront supprimés définitivement.",
    confirmLabel: "Supprimer",
    danger: true
  });
  if (!ok) return;
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) toast(error.message);
  else {
    toast("Sondage supprimé.");
    await refreshAll();
  }
}

function parseClipSlug(value="") {
  const v=value.trim();if(!v)return "";
  try{const u=new URL(v);if(u.hostname.includes("clips.twitch.tv"))return u.pathname.split("/").filter(Boolean)[0]||"";const parts=u.pathname.split("/").filter(Boolean);const i=parts.indexOf("clip");return i>=0?parts[i+1]||"":parts.at(-1)||"";}catch{return v.replace(/^\/+|\/+$/g,"").split(/[?#]/)[0]}
}
function renderClipAdmin(rows=[]) {
  const map=new Map((rows||[]).map(x=>[Number(x.position),x]));
  $("#admin-clips").innerHTML=[1,2,3,4].map(i=>{const c=map.get(i);return `<label class="clip-admin-slot">Clip ${i}<input data-clip-position="${i}" value="${esc(c?.clip_url||c?.clip_slug||"")}" placeholder="https://clips.twitch.tv/…"><small>${c?.clip_slug?`Slug actuel : ${esc(c.clip_slug)}`:"Emplacement vide"}</small></label>`}).join("");
}
async function loadClipsAdmin(){
  if(!$("#admin-clips"))return;const{data,error}=await supabase.from("site_clips").select("*").order("position",{ascending:true});if(error){renderClipAdmin([]);return}renderClipAdmin(data||[])
}
async function saveClipsAdmin(){
  const inputs=$$('[data-clip-position]');
  const rows=inputs.map(input=>({position:Number(input.dataset.clipPosition),clip_url:input.value.trim()||null,clip_slug:parseClipSlug(input.value)}));
  for(const r of rows){if(r.clip_url&&!r.clip_slug)return toast(`Lien invalide pour le clip ${r.position}.`);if(r.clip_slug){const{error}=await supabase.from("site_clips").upsert(r,{onConflict:"position"});if(error)return toast(error.message)}else{const{error}=await supabase.from("site_clips").delete().eq("position",r.position);if(error)return toast(error.message)}}
  toast("Sélection de clips mise à jour.");await loadClipsAdmin();
}

async function loadReputation() {
  const { data, error } = await supabase.from("reputation_scores").select("*").order("score", { ascending: false });
  if (error) {
    $("#admin-reputation").textContent = error.message;
    return;
  }
  const rows = data || [];
  $("#admin-reputation").innerHTML = rows.length ? rows.map(r => `
    <article class="admin-item">
      <div class="admin-item-head">
        <div><small>${esc(r.twitch_login || "")}</small><h2>${esc(r.display_name || r.twitch_login || "Utilisateur Twitch")}</h2></div>
        <span class="score-pill">${r.score > 0 ? "+" : ""}${r.score}</span>
      </div>
      <div class="admin-meta-line">
        <span>${esc(repRank(r.score))}</span>
        <span>Dernière synchronisation : ${new Date(r.updated_at).toLocaleString("fr-FR")}</span>
        ${r.twitch_user_id ? `<span>ID Twitch : ${esc(r.twitch_user_id)}</span>` : ""}
      </div>
    </article>`).join("") : `<div class="admin-card"><p>Aucun score synchronisé pour le moment.</p></div>`;
}

async function createCollaborator(e) {
  e.preventDefault();
  const twitch_login = $("#collaborator-login").value.trim().toLowerCase();
  const description = $("#collaborator-description").value.trim() || null;
  const sort_order = Number($("#collaborator-order").value || 0);
  if (!twitch_login) return;
  const { error } = await supabase.from("collaborators").insert({ twitch_login, description, sort_order, active: true });
  if (error) toast(error.message);
  else {
    $("#collaborator-form").reset();
    $("#collaborator-order").value = "0";
    toast("Collaborateur ajouté.");
    await refreshAll();
  }
}

async function loadCollaborators() {
  const { data, error } = await supabase.from("collaborators").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) {
    $("#admin-collaborators").textContent = error.message;
    return;
  }
  $("#admin-collaborators").innerHTML = (data || []).map(c => `
    <article class="admin-item" data-collaborator="${c.id}">
      <div class="admin-item-head">
        <div><small>twitch.tv/${esc(c.twitch_login)}</small><h2>${esc(c.twitch_login)}</h2></div>
        <label class="check-row"><input class="collab-active" type="checkbox" ${c.active ? "checked" : ""}> Actif</label>
      </div>
      <div class="admin-two-cols">
        <label>Identifiant Twitch<input class="collab-login" value="${esc(c.twitch_login)}"></label>
        <label>Ordre d’affichage<input class="collab-order" type="number" value="${Number(c.sort_order || 0)}"></label>
      </div>
      <label>Description<textarea class="collab-description" rows="3">${esc(c.description || "")}</textarea></label>
      <div class="admin-actions">
        <button data-save-collab="${c.id}">Enregistrer</button>
        <button class="danger-action" data-delete-collab="${c.id}">Supprimer</button>
      </div>
    </article>`).join("");
  $$('[data-save-collab]').forEach(b => b.onclick = () => saveCollaborator(b.dataset.saveCollab));
  $$('[data-delete-collab]').forEach(b => b.onclick = () => deleteCollaborator(b.dataset.deleteCollab));
}

async function saveCollaborator(id) {
  const item = $(`[data-collaborator="${id}"]`);
  const twitch_login = $(".collab-login", item).value.trim().toLowerCase();
  const description = $(".collab-description", item).value.trim() || null;
  const sort_order = Number($(".collab-order", item).value || 0);
  const active = $(".collab-active", item).checked;
  const { error } = await supabase.from("collaborators").update({ twitch_login, description, sort_order, active }).eq("id", id);
  if (error) toast(error.message);
  else {
    toast("Collaborateur mis à jour.");
    await refreshAll();
  }
}

async function deleteCollaborator(id) {
  const ok = await askConfirm({
    title: "Retirer le collaborateur",
    message: "Le collaborateur sera retiré de la section publique. Cette action ne modifie pas son compte Twitch.",
    confirmLabel: "Retirer",
    danger: true
  });
  if (!ok) return;
  const { error } = await supabase.from("collaborators").delete().eq("id", id);
  if (error) toast(error.message);
  else {
    toast("Collaborateur retiré.");
    await refreshAll();
  }
}


// ============================================================================
// V5 — Événements génériques
// ============================================================================
function eventDateOnly(value){return value ? String(value).slice(0,10) : "";}
function eventChapterOptions(selected=""){return `<option value="">— Sans chapitre —</option>${eventChapters.map(c=>`<option value="${c.id}" ${c.id===selected?"selected":""}>${esc(c.title)}</option>`).join("")}`;}

async function loadEventsAdmin(){
  if(!$("#event-admin-select")||!supabase)return;
  const{data,error}=await supabase.from("site_events").select("*").order("featured",{ascending:false}).order("created_at",{ascending:false});
  if(error){$("#event-admin-select").innerHTML=`<option>${esc(error.message)}</option>`;return;}
  adminEvents=data||[];
  if(!currentEventId||!adminEvents.some(e=>e.id===currentEventId))currentEventId=adminEvents.find(e=>e.featured)?.id||adminEvents[0]?.id||null;
  $("#event-admin-select").innerHTML=adminEvents.length?adminEvents.map(e=>`<option value="${e.id}" ${e.id===currentEventId?"selected":""}>${esc(e.title)} · ${esc(e.status)}</option>`).join(""):`<option value="">Aucun événement</option>`;
  if(currentEventId)await loadEventEditor(currentEventId);
}

async function loadEventEditor(id){
  currentEventId=id;
  const event=adminEvents.find(e=>e.id===id)||(await supabase.from("site_events").select("*").eq("id",id).maybeSingle()).data;
  if(!event)return;
  $("#event-title-input").value=event.title||"";$("#event-subtitle-input").value=event.subtitle||"";$("#event-summary-input").value=event.summary||"";$("#event-status-input").value=event.status||"draft";$("#event-featured-input").checked=!!event.featured;$("#event-world-current-input").value=eventDateOnly(event.world_current_date);$("#event-public-snapshot-input").value=eventDateOnly(event.public_snapshot_date);$("#event-cutoff-input").value=eventDateOnly(event.public_chronicle_cutoff_date);$("#event-next-session-input").value=toLocalDateTime(event.next_session_at);
  const [pr,ch,en,sn,me]=await Promise.all([
    supabase.from("site_event_participants").select("*").eq("event_id",id).order("sort_order"),
    supabase.from("site_event_chapters").select("*").eq("event_id",id).order("sort_order"),
    supabase.from("site_event_entries").select("*").eq("event_id",id).order("sort_order").order("created_at"),
    supabase.from("site_event_snapshots").select("*").eq("event_id",id).order("snapshot_date"),
    supabase.from("site_event_media").select("*").eq("event_id",id).order("sort_order").order("created_at")
  ]);
  eventChapters=ch.data||[];
  renderEventParticipants(pr.data||[]);renderEventChapters(eventChapters);renderEventEntries(en.data||[]);renderEventSnapshots(sn.data||[]);renderEventMediaAdmin(me.data||[]);
  $("#event-entry-chapter").innerHTML=eventChapterOptions();
}

function renderEventParticipants(rows){
  const box=$("#event-participants-admin");if(!box)return;
  box.innerHTML=rows.length?rows.map(p=>`<article class="admin-item event-participant-row" data-event-participant="${p.id}"><div class="admin-item-head"><div><small>${esc(p.participant_key)}</small><h2>${esc(p.title)}</h2></div><label class="check-row"><input class="event-participant-public" type="checkbox" ${p.public?"checked":""}> Public</label></div><div class="admin-three-cols"><label>Joueur<input class="event-participant-player" value="${esc(p.player_name||"")}"></label><label>Pays / nom public<input class="event-participant-title" value="${esc(p.title||"")}"></label><label>Tag / sous-titre<input class="event-participant-subtitle" value="${esc(p.subtitle||"")}"></label></div><div class="admin-actions"><button type="button" data-save-event-participant="${p.id}">Enregistrer</button></div></article>`).join(""):`<p>Aucun participant.</p>`;
  $$('[data-save-event-participant]').forEach(b=>b.onclick=()=>saveEventParticipant(b.dataset.saveEventParticipant));
}
async function saveEventParticipant(id){const el=$(`[data-event-participant="${id}"]`);const payload={player_name:$(".event-participant-player",el).value.trim()||null,title:$(".event-participant-title",el).value.trim(),subtitle:$(".event-participant-subtitle",el).value.trim()||null,public:$(".event-participant-public",el).checked};const{error}=await supabase.from("site_event_participants").update(payload).eq("id",id);if(error)toast(error.message);else{toast("Participant mis à jour.");await loadEventEditor(currentEventId)}}

function renderEventChapters(rows){
  const box=$("#event-chapters-admin");if(!box)return;
  box.innerHTML=rows.length?rows.map(c=>`<article class="admin-item event-chapter-admin" data-event-chapter="${c.id}"><div class="admin-item-head"><div><small>${esc(c.kind)} · ${esc(c.status)}</small><h2>${esc(c.title)}</h2></div><label class="check-row"><input class="event-chapter-public" type="checkbox" ${c.public?"checked":""}> Public</label></div><div class="admin-three-cols"><label>Titre<input class="event-chapter-title-edit" value="${esc(c.title)}"></label><label>Type<select class="event-chapter-kind-edit"><option value="session" ${c.kind==='session'?'selected':''}>Session</option><option value="intersession" ${c.kind==='intersession'?'selected':''}>Intersession</option><option value="phase" ${c.kind==='phase'?'selected':''}>Phase</option></select></label><label>Statut<select class="event-chapter-status-edit"><option value="complete" ${c.status==='complete'?'selected':''}>Terminée</option><option value="current" ${c.status==='current'?'selected':''}>En cours</option><option value="upcoming" ${c.status==='upcoming'?'selected':''}>À venir</option></select></label></div><label>Sous-titre<input class="event-chapter-subtitle-edit" value="${esc(c.subtitle||"")}"></label><div class="admin-two-cols"><label>Début réel<input class="event-chapter-real-start-edit" type="date" value="${eventDateOnly(c.real_start_date)}"></label><label>Fin réelle<input class="event-chapter-real-end-edit" type="date" value="${eventDateOnly(c.real_end_date)}"></label></div><div class="admin-two-cols"><label>Début EU4<input class="event-chapter-world-start-edit" type="date" value="${eventDateOnly(c.world_start_date)}"></label><label>Fin EU4<input class="event-chapter-world-end-edit" type="date" value="${eventDateOnly(c.world_end_date)}"></label></div><div class="admin-actions"><button type="button" data-save-event-chapter="${c.id}">Enregistrer</button><button type="button" class="danger-action" data-delete-event-chapter="${c.id}">Supprimer</button></div></article>`).join(""):`<p>Aucun chapitre.</p>`;
  $$('[data-save-event-chapter]').forEach(b=>b.onclick=()=>saveEventChapter(b.dataset.saveEventChapter));$$('[data-delete-event-chapter]').forEach(b=>b.onclick=()=>deleteEventChapter(b.dataset.deleteEventChapter));
}
async function saveEventChapter(id){const el=$(`[data-event-chapter="${id}"]`);const payload={title:$(".event-chapter-title-edit",el).value.trim(),subtitle:$(".event-chapter-subtitle-edit",el).value.trim()||null,kind:$(".event-chapter-kind-edit",el).value,status:$(".event-chapter-status-edit",el).value,real_start_date:$(".event-chapter-real-start-edit",el).value||null,real_end_date:$(".event-chapter-real-end-edit",el).value||null,world_start_date:$(".event-chapter-world-start-edit",el).value||null,world_end_date:$(".event-chapter-world-end-edit",el).value||null,public:$(".event-chapter-public",el).checked};const{error}=await supabase.from("site_event_chapters").update(payload).eq("id",id);if(error)toast(error.message);else{toast("Chapitre mis à jour.");await loadEventEditor(currentEventId)}}
async function deleteEventChapter(id){const ok=await askConfirm({title:"Supprimer le chapitre",message:"Les événements liés resteront enregistrés mais ne seront plus rattachés à ce chapitre.",confirmLabel:"Supprimer",danger:true});if(!ok)return;const{error}=await supabase.from("site_event_chapters").delete().eq("id",id);if(error)toast(error.message);else{toast("Chapitre supprimé.");await loadEventEditor(currentEventId)}}

function renderEventEntries(rows){
  const box=$("#event-entries-admin");if(!box)return;
  box.innerHTML=rows.length?rows.map(e=>`<article class="admin-item event-entry-admin ${e.review_status==='needs_review'?'needs-review':''}" data-event-entry="${e.id}"><div class="admin-item-head"><div><small>${esc(e.source_type)} · ${esc(e.review_status)}</small><h2>${esc(e.title)}</h2></div><div class="event-entry-flags"><label class="check-row"><input class="event-entry-public-edit" type="checkbox" ${e.public?"checked":""}> Public</label><label class="check-row"><input class="event-entry-featured-edit" type="checkbox" ${e.featured?"checked":""}> Mis en avant</label></div></div><div class="admin-three-cols"><label>Type<input class="event-entry-type-edit" value="${esc(e.entry_type)}"></label><label>Chapitre<select class="event-entry-chapter-edit">${eventChapterOptions(e.chapter_id||"")}</select></label><label>Repère public<input class="event-entry-date-edit" value="${esc(e.world_date_label||"")}"></label></div><label>Titre<input class="event-entry-title-edit" value="${esc(e.title)}"></label><label>Résumé<textarea class="event-entry-summary-edit" rows="3">${esc(e.summary||"")}</textarea></label><div class="admin-two-cols"><label>Validation<select class="event-entry-review-edit"><option value="needs_review" ${e.review_status==='needs_review'?'selected':''}>À relire</option><option value="approved" ${e.review_status==='approved'?'selected':''}>Validé</option><option value="rejected" ${e.review_status==='rejected'?'selected':''}>Rejeté</option></select></label><label>Importance<select class="event-entry-importance-edit"><option value="minor" ${e.importance==='minor'?'selected':''}>Mineur</option><option value="normal" ${e.importance==='normal'?'selected':''}>Normal</option><option value="major" ${e.importance==='major'?'selected':''}>Majeur</option><option value="turning_point" ${e.importance==='turning_point'?'selected':''}>Tournant historique</option></select></label></div><div class="admin-actions"><button type="button" data-save-event-entry="${e.id}">Enregistrer</button><button type="button" class="danger-action" data-delete-event-entry="${e.id}">Supprimer</button></div></article>`).join(""):`<p>Aucun événement dans la chronologie.</p>`;
  $$('[data-save-event-entry]').forEach(b=>b.onclick=()=>saveEventEntry(b.dataset.saveEventEntry));$$('[data-delete-event-entry]').forEach(b=>b.onclick=()=>deleteEventEntry(b.dataset.deleteEventEntry));
}
async function saveEventEntry(id){const el=$(`[data-event-entry="${id}"]`);const review_status=$(".event-entry-review-edit",el).value;const payload={entry_type:$(".event-entry-type-edit",el).value.trim()||"autre",chapter_id:$(".event-entry-chapter-edit",el).value||null,world_date_label:$(".event-entry-date-edit",el).value.trim()||null,title:$(".event-entry-title-edit",el).value.trim(),summary:$(".event-entry-summary-edit",el).value.trim()||null,review_status,importance:$(".event-entry-importance-edit",el).value,public:$(".event-entry-public-edit",el).checked&&review_status==='approved',featured:$(".event-entry-featured-edit",el).checked};const{error}=await supabase.from("site_event_entries").update(payload).eq("id",id);if(error)toast(error.message);else{toast("Événement mis à jour.");await loadEventEditor(currentEventId)}}
async function deleteEventEntry(id){const ok=await askConfirm({title:"Supprimer l’événement",message:"Cet élément disparaîtra de la chronologie et de l’administration.",confirmLabel:"Supprimer",danger:true});if(!ok)return;const{error}=await supabase.from("site_event_entries").delete().eq("id",id);if(error)toast(error.message);else{toast("Événement supprimé.");await loadEventEditor(currentEventId)}}

function renderEventSnapshots(rows){const box=$("#event-snapshots-admin");if(!box)return;box.innerHTML=rows.length?rows.map(s=>`<article><span>${s.session_number===0?'État initial':`Session ${s.session_number||'—'}`}</span><strong>${esc(s.label)}</strong><small>${esc(s.source_label||'Source importée')}</small><em>${s.public?'Public':'Privé'}</em></article>`).join(""):`<p>Aucun relevé importé.</p>`;}
function renderEventMediaAdmin(rows){
  const box=$("#event-media-admin");if(!box)return;
  box.innerHTML=rows.length?rows.map(m=>`<article class="admin-item event-media-admin-row" data-event-media="${m.id}"><div class="admin-item-head"><div><small>${esc(m.media_type)}</small><h2>${esc(m.title||m.url)}</h2></div><div class="event-entry-flags"><label class="check-row"><input class="event-media-public-edit" type="checkbox" ${m.public?"checked":""}> Public</label><label class="check-row"><input class="event-media-featured-edit" type="checkbox" ${m.featured?"checked":""}> Mis en avant</label></div></div><div class="admin-three-cols"><label>Type<select class="event-media-type-edit"><option value="image" ${m.media_type==='image'?'selected':''}>Image</option><option value="clip" ${m.media_type==='clip'?'selected':''}>Clip / vidéo</option><option value="link" ${m.media_type==='link'?'selected':''}>Lien</option></select></label><label>Titre<input class="event-media-title-edit" value="${esc(m.title||"")}"></label><label>URL<input class="event-media-url-edit" value="${esc(m.url||"")}"></label></div><label>Légende<textarea class="event-media-caption-edit" rows="2">${esc(m.caption||"")}</textarea></label><div class="admin-actions"><button type="button" data-save-event-media="${m.id}">Enregistrer</button><button type="button" class="danger-action" data-delete-event-media="${m.id}">Supprimer</button></div></article>`).join(""):`<p>Aucun média lié à cet événement.</p>`;
  $$('[data-save-event-media]').forEach(b=>b.onclick=()=>saveEventMedia(b.dataset.saveEventMedia));$$('[data-delete-event-media]').forEach(b=>b.onclick=()=>deleteEventMedia(b.dataset.deleteEventMedia));
}
async function saveEventMedia(id){const el=$(`[data-event-media="${id}"]`);const payload={media_type:$(".event-media-type-edit",el).value,title:$(".event-media-title-edit",el).value.trim()||null,url:$(".event-media-url-edit",el).value.trim(),caption:$(".event-media-caption-edit",el).value.trim()||null,public:$(".event-media-public-edit",el).checked,featured:$(".event-media-featured-edit",el).checked};const{error}=await supabase.from("site_event_media").update(payload).eq("id",id);if(error)toast(error.message);else{toast("Média mis à jour.");await loadEventEditor(currentEventId)}}
async function deleteEventMedia(id){const ok=await askConfirm({title:"Supprimer le média",message:"Ce média sera retiré de l’événement.",confirmLabel:"Supprimer",danger:true});if(!ok)return;const{error}=await supabase.from("site_event_media").delete().eq("id",id);if(error)toast(error.message);else{toast("Média supprimé.");await loadEventEditor(currentEventId)}}
async function createEventMedia(ev){ev.preventDefault();if(!currentEventId)return;const payload={event_id:currentEventId,media_type:$("#event-media-type").value,title:$("#event-media-title").value.trim()||null,url:$("#event-media-url").value.trim(),caption:$("#event-media-caption").value.trim()||null,public:$("#event-media-public").checked,featured:$("#event-media-featured").checked,sort_order:0};const{error}=await supabase.from("site_event_media").insert(payload);if(error)toast(error.message);else{ev.target.reset();$("#event-media-public").checked=true;toast("Média ajouté.");await loadEventEditor(currentEventId)}}


async function saveEventGeneral(ev){ev.preventDefault();if(!currentEventId)return;const payload={title:$("#event-title-input").value.trim(),subtitle:$("#event-subtitle-input").value.trim()||null,summary:$("#event-summary-input").value.trim()||null,status:$("#event-status-input").value,featured:$("#event-featured-input").checked,world_current_date:$("#event-world-current-input").value||null,public_snapshot_date:$("#event-public-snapshot-input").value||null,public_chronicle_cutoff_date:$("#event-cutoff-input").value||null,next_session_at:$("#event-next-session-input").value?new Date($("#event-next-session-input").value).toISOString():null,updated_at:new Date().toISOString()};if(payload.featured)await supabase.from("site_events").update({featured:false}).neq("id",currentEventId);const{error}=await supabase.from("site_events").update(payload).eq("id",currentEventId);if(error)toast(error.message);else{toast("Événement enregistré.");await loadEventsAdmin()}}
async function createEventChapter(ev){ev.preventDefault();if(!currentEventId)return;const max=Math.max(0,...eventChapters.map(c=>Number(c.sort_order||0)));const title=$("#event-chapter-title").value.trim();const key=`chapter-${Date.now()}`;const payload={event_id:currentEventId,chapter_key:key,title,subtitle:$("#event-chapter-subtitle").value.trim()||null,kind:$("#event-chapter-kind").value,status:$("#event-chapter-status").value,real_start_date:$("#event-chapter-real-start").value||null,real_end_date:$("#event-chapter-real-end").value||null,world_start_date:$("#event-chapter-world-start").value||null,world_end_date:$("#event-chapter-world-end").value||null,sort_order:max+10,public:true};const{error}=await supabase.from("site_event_chapters").insert(payload);if(error)toast(error.message);else{ev.target.reset();toast("Chapitre ajouté.");await loadEventEditor(currentEventId)}}
async function createEventEntry(ev){ev.preventDefault();if(!currentEventId)return;const publish=$("#event-entry-public").checked;const payload={event_id:currentEventId,chapter_id:$("#event-entry-chapter").value||null,entry_type:$("#event-entry-type").value,title:$("#event-entry-title").value.trim(),summary:$("#event-entry-summary").value.trim()||null,world_date_label:$("#event-entry-date-label").value.trim()||null,source_type:"manual_rp",importance:$("#event-entry-importance").value,review_status:publish?"approved":"needs_review",public:publish,sort_order:0};const{error}=await supabase.from("site_event_entries").insert(payload);if(error)toast(error.message);else{ev.target.reset();toast("Événement ajouté.");await loadEventEditor(currentEventId)}}
async function createSiteEvent(ev){ev.preventDefault();const title=$("#event-create-title").value.trim(),slug=$("#event-create-slug").value.trim().toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');const payload={title,slug,event_type:$("#event-create-type").value.trim()||"community",status:"draft",featured:false};const{data,error}=await supabase.from("site_events").insert(payload).select("id").single();if(error)toast(error.message);else{currentEventId=data.id;ev.target.reset();toast("Événement créé en brouillon.");await loadEventsAdmin()}}

// V4.2.4 — fail-safe : un retour BFCache / un ancien CSS ne doit jamais laisser une modale fantôme ouverte.
resetAdminModals();
window.addEventListener("pageshow", () => resetAdminModals());

$$('[data-admin-tab]').forEach(btn => btn.onclick = () => {
  $$('[data-admin-tab]').forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  $$('[data-admin-panel]').forEach(p => p.classList.toggle("hidden", p.dataset.adminPanel !== btn.dataset.adminTab));
});

$("#admin-login").onclick = signIn;
$("#admin-logout").onclick = async () => { await supabase.auth.signOut(); location.reload(); };
$("#game-search-button").onclick = () => searchGames();
$("#game-search-input").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); searchGames(); } });
$("#game-search-mode")?.addEventListener("change", e => {
  const studio = e.currentTarget.value === "developer";
  $("#game-search-input").placeholder = studio ? "Ex. Bloober Team, Ubisoft…" : "Ex. Professor Layton…";
  $("#game-search-meta").textContent = "";
  $("#game-search-results").innerHTML = "";
  $("#game-search-more").innerHTML = "";
  igdbResults = [];
  gameSearchOffset = 0;
});
$("#library-search-input").addEventListener("input", () => { libraryRenderLimit = 60; renderLibrary(); });
$("#library-status-filter").addEventListener("change", () => { libraryRenderLimit = 60; renderLibrary(); });
$("#game-add-confirm").onclick = confirmAddGame;
$$('[data-close-game-modal]').forEach(el => el.onclick = closeGameModal);
$("#confirm-accept").onclick = () => closeConfirm(true);
$$('[data-close-confirm]').forEach(el => el.onclick = () => closeConfirm(false));
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#confirm-modal").classList.contains("hidden")) closeConfirm(false);
  else if (!$("#game-add-modal").classList.contains("hidden")) closeGameModal();
});
$("#poll-form").addEventListener("submit", createPoll);
$("#save-clips")?.addEventListener("click", saveClipsAdmin);
$("#collaborator-form").addEventListener("submit", createCollaborator);

$("#event-admin-select")?.addEventListener("change",e=>loadEventEditor(e.target.value));
$("#event-general-form")?.addEventListener("submit",saveEventGeneral);
$("#event-chapter-form")?.addEventListener("submit",createEventChapter);
$("#event-entry-form")?.addEventListener("submit",createEventEntry);
$("#event-create-form")?.addEventListener("submit",createSiteEvent);
$("#event-media-form")?.addEventListener("submit",createEventMedia);

boot();
