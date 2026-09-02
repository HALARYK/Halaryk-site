import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "../config.js";

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

let supabase = null;
let session = null;
let igdbResults = [];
let libraryGames = [];
let pendingGameIndex = null;
let confirmResolver = null;
let libraryRenderLimit = 60;

const repRank = s => s < 0 ? "☠️ Traître" : s < 20 ? "👤 Inconnu" : s < 50 ? "🏠 Habitué" : s < 80 ? "🗣️ Conseiller" : s < 100 ? "⚜️ Confident" : "👑 Favori";
const libraryStatusLabels = {
  playing: "En cours",
  backlog: "À faire",
  completed: "Terminé",
  wishlist: "Liste de souhaits",
  paused: "En pause",
  abandoned: "Abandonné"
};
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

function askConfirm({ title = "Confirmer l’action", message = "Voulez-vous continuer ?", confirmLabel = "Confirmer", danger = false } = {}) {
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-accept").textContent = confirmLabel;
  $("#confirm-accept").classList.toggle("button-danger", danger);
  $("#confirm-modal").classList.remove("hidden");
  document.body.classList.add("modal-open");
  return new Promise(resolve => { confirmResolver = resolve; });
}

function closeConfirm(result = false) {
  $("#confirm-modal").classList.add("hidden");
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
  await Promise.all([loadStats(), loadSuggestions(), loadLibrary(), loadPolls(), loadReputation(), loadCollaborators()]);
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

async function searchGames(sourceSuggestionId = null) {
  const q = $("#game-search-input").value.trim();
  if (q.length < 2) return;
  $("#game-search-results").innerHTML = '<div class="admin-searching">Recherche en cours…</div>';
  const { data, error } = await supabase.functions.invoke("game-search", { body: { query: q } });
  if (error) {
    $("#game-search-results").textContent = error.message;
    return;
  }
  igdbResults = (data?.games || []).map(g => ({ ...g, sourceSuggestionId }));
  $("#game-search-results").innerHTML = igdbResults.length ? igdbResults.map((g, i) => `
    <article class="game-search-card">
      ${g.cover_url ? `<img src="${esc(g.cover_url)}" alt="Jaquette de ${esc(g.name)}">` : ""}
      <strong>${esc(g.name)}</strong>
      <small>${g.release_year || "Date inconnue"}</small>
      <button data-add-game="${i}">Ajouter</button>
    </article>`).join("") : '<div class="admin-searching">Aucun résultat.</div>';
  $$('[data-add-game]').forEach(b => b.onclick = () => openGameModal(Number(b.dataset.addGame)));
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
  $("#game-add-note").value = "";
  const cover = $("#game-add-cover");
  if (g.cover_url) {
    cover.src = g.cover_url;
    cover.alt = `Jaquette de ${g.name}`;
    cover.classList.remove("hidden");
  } else {
    cover.removeAttribute("src");
    cover.classList.add("hidden");
  }
  $("#game-add-modal").classList.remove("hidden");
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
  const personal_note = $("#game-add-note").value.trim() || null;
  if (playtime_hours !== null && (!Number.isFinite(playtime_hours) || playtime_hours < 0)) return toast("Le temps de jeu doit être un nombre positif.");

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
  const filtered = libraryGames.filter(g => (!q || g.name.toLocaleLowerCase("fr").includes(q)) && (status === "all" || g.status === status));
  const visible = filtered.slice(0, libraryRenderLimit);
  const count = $("#library-result-count");
  if (count) count.textContent = `${filtered.length} jeu${filtered.length > 1 ? "x" : ""} trouvé${filtered.length > 1 ? "s" : ""} sur ${libraryGames.length}`;

  $("#admin-library").innerHTML = visible.length ? visible.map(g => `
    <article class="admin-item library-game-item" data-game="${g.id}">
      <div class="library-admin-head">
        ${g.cover_url ? `<img src="${esc(g.cover_url)}" alt="" class="library-admin-cover">` : ""}
        <div class="library-admin-title">
          <h2>${esc(g.name)}</h2>
          <small>${esc(libraryStatusLabels[g.status] || "Statut inconnu")}${g.release_date ? ` · Sortie : ${new Intl.DateTimeFormat("fr-FR", { year: "numeric" }).format(new Date(g.release_date))}` : ""}</small>
        </div>
        <small>${g.streamed ? "🎥 Streamé" : ""}</small>
      </div>
      <div class="admin-three-cols">
        <label>Statut
          <select class="game-status">${Object.entries(libraryStatusLabels).map(([st, label]) => `<option value="${st}" ${g.status === st ? "selected" : ""}>${label}</option>`).join("")}</select>
        </label>
        <label>Temps de jeu (heures)<input class="game-playtime" type="number" min="0" step="0.1" value="${g.playtime_hours ?? ""}" placeholder="Ex. : 1714"></label>
        <label class="check-row"><input class="game-streamed" type="checkbox" ${g.streamed ? "checked" : ""}> Streamé sur la chaîne</label>
      </div>
      <label>Note personnelle<textarea class="game-note" rows="3" placeholder="Ton avis, un souvenir, un commentaire…">${esc(g.personal_note || "")}</textarea></label>
      <div class="admin-actions">
        <button data-save-game="${g.id}">Enregistrer</button>
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
  $$('[data-delete-game]').forEach(b => b.onclick = () => deleteGame(b.dataset.deleteGame));
}

async function saveGame(id) {
  const item = $(`[data-game="${id}"]`);
  const status = $(".game-status", item).value;
  const streamed = $(".game-streamed", item).checked;
  const personal_note = $(".game-note", item).value.trim() || null;
  const hoursRaw = $(".game-playtime", item).value.trim();
  const playtime_hours = hoursRaw === "" ? null : Number(hoursRaw.replace(",", "."));
  if (playtime_hours !== null && (!Number.isFinite(playtime_hours) || playtime_hours < 0)) return toast("Le temps de jeu doit être un nombre positif.");
  const { error } = await supabase.from("library_games").update({ status, streamed, personal_note, playtime_hours }).eq("id", id);
  if (error) toast(error.message);
  else {
    toast("Jeu mis à jour.");
    await loadLibrary();
    await loadStats();
  }
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

$$('[data-admin-tab]').forEach(btn => btn.onclick = () => {
  $$('[data-admin-tab]').forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  $$('[data-admin-panel]').forEach(p => p.classList.toggle("hidden", p.dataset.adminPanel !== btn.dataset.adminTab));
});

$("#admin-login").onclick = signIn;
$("#admin-logout").onclick = async () => { await supabase.auth.signOut(); location.reload(); };
$("#game-search-button").onclick = () => searchGames();
$("#game-search-input").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); searchGames(); } });
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
$("#collaborator-form").addEventListener("submit", createCollaborator);

boot();
