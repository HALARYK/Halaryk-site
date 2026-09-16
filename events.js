import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "./config.js";

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const esc = (v = "") => String(v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const num = (v, d = 0) => v === null || v === undefined || v === "" ? "—" : Number.isFinite(Number(v)) ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d }).format(Number(v)) : "—";
const pct = (a, b) => {
  a = Number(a); b = Number(b);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return "—";
  const p = (b - a) / a * 100;
  return `${p >= 0 ? "+" : ""}${num(p, 1)} %`;
};
const year = v => v ? String(v).slice(0, 4) : "—";
const ROOT = new URL("./", import.meta.url);
const asset = p => new URL(p, ROOT).href;

let db = null;
let activeEvents = [];
let activeIndex = 0;
let participantMap = new Map();

const crestByTag = {
  CAS: "assets/nations/nation-castille.svg",
  ENG: "assets/nations/nation-angleterre.svg",
  LAN: "assets/nations/nation-florence.svg",
  BRA: "assets/nations/nation-brandebourg.svg",
  HAB: "assets/nations/nation-autriche.svg",
  TUR: "assets/nations/nation-ottomans.svg",
  MOS: "assets/nations/nation-moscovie.svg"
};

const categoryLabel = {
  guerre: "Guerre",
  dynastie: "Dynastie",
  union_personnelle: "Union personnelle",
  "désastre": "Désastre",
  religion: "Religion",
  politique: "Politique",
  autre: "Événement"
};
const categoryIcon = { guerre: "⚔", dynastie: "♛", union_personnelle: "◆", "désastre": "!", religion: "✝", politique: "✦", autre: "•" };
const diplomaticTypes = new Set(["diplomatie", "congrès", "traité", "déclaration", "correspondance"]);

function eventUrl(e) {
  return e.slug === "ppo-europe" ? "chroniques-europe/" : `fiche/?slug=${encodeURIComponent(e.slug)}`;
}
function eventHref(e, fromHome = false) {
  return fromHome ? `evenements/${eventUrl(e)}` : eventUrl(e);
}
function campaignTitle(e) {
  return e.slug === "ppo-europe" ? "Chroniques de l’Europe" : (e.title || "Événement HALARYK");
}
function campaignSubtitle(e) {
  return e.slug === "ppo-europe" ? "Campagne multijoueur RP sur Europa Universalis IV" : (e.subtitle || e.game_name || "");
}
function crest(p) {
  const path = crestByTag[p?.participant_key];
  return path ? asset(path) : "";
}
function participantsFor(eventId) {
  return participantMap.get(eventId) || [];
}
function sessionsCount(e) {
  const n = Number(e?.metadata?.current_session);
  return Number.isFinite(n) && n > 0 ? n : 2;
}
function eventCoverStyle(e) {
  if (e.slug === "ppo-europe" || !e.hero_image_url) return "";
  return ` style="--v52-event-cover:url('${esc(e.hero_image_url)}')"`;
}

function playerTile(p) {
  const img = crest(p);
  return `<div class="v52-player">
    ${img ? `<img src="${img}" alt="Emblème de ${esc(p.title)}" loading="lazy">` : ""}
    <div><b>${esc(p.player_name || p.title)}</b><span>${esc(p.title)}</span></div>
  </div>`;
}

function spotlight(e, fromHome = false) {
  const players = participantsFor(e.id);
  const href = eventHref(e, fromHome);
  const current = year(e.world_current_date);
  const cutoff = year(e.public_chronicle_cutoff_date);
  const ppoClass = e.slug === "ppo-europe" ? " v52-map-card" : "";
  return `<article class="v52-campaign-card${ppoClass}"${eventCoverStyle(e)}>
    <div class="v52-campaign-card-copy">
      <p class="eyebrow">LE GRAND RENDEZ-VOUS DU MOMENT</p>
      <h3>${esc(campaignTitle(e))}</h3>
      <p class="v52-campaign-subtitle">${esc(campaignSubtitle(e))}</p>
      <p class="v52-campaign-summary">Sept joueurs réécrivent l’histoire de l’Europe dans une campagne vivante, entre guerres, alliances, crises et diplomatie. Une autre Europe est possible.</p>
      <div class="v52-campaign-pillars">
        <div><span>⚔</span><b>Grande stratégie</b><small>Diplomatie · guerre · économie</small></div>
        <div><span>♙</span><b>Campagne multijoueur RP</b><small>Sept joueurs, sept nations</small></div>
        <div><span>▣</span><b>1444 → 1821</b><small>Près de quatre siècles d’histoire</small></div>
        <div><span>✦</span><b>Europe alternative</b><small>Un monde façonné par vos choix</small></div>
      </div>
    </div>
    <div class="v52-campaign-card-bottom">
      <div class="v52-campaign-players">
        <p>LES 7 NATIONS EN JEU</p>
        <div class="v52-player-row">${players.map(playerTile).join("")}</div>
      </div>
      <div class="v52-campaign-metrics">
        <div><strong>1444 → ${current}</strong><span>Période jouée</span></div>
        <div><strong>${sessionsCount(e)}</strong><span>Sessions terminées</span></div>
        <div><strong>${players.length || 7}</strong><span>Nations jouées</span></div>
        <div><strong>${cutoff}</strong><span>Chronologie publique</span></div>
      </div>
      <a class="button button-primary v52-campaign-cta" href="${href}">Découvrir la campagne →</a>
    </div>
  </article>`;
}

async function loadParticipantMap(events) {
  const ids = (events || []).map(e => e.id);
  participantMap = new Map();
  if (!ids.length) return;
  const { data, error } = await db.from("site_event_participants")
    .select("id,event_id,participant_key,player_name,title,sort_order")
    .in("event_id", ids).eq("public", true).order("sort_order");
  if (error) return;
  for (const p of data || []) {
    if (!participantMap.has(p.event_id)) participantMap.set(p.event_id, []);
    participantMap.get(p.event_id).push(p);
  }
}

async function loadHomeFeature() {
  const box = $("#home-feature-event");
  if (!box) return;
  const { data, error } = await db.from("site_events").select("*")
    .eq("featured", true).eq("status", "active")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return;
  await loadParticipantMap([data]);
  box.innerHTML = spotlight(data, true);
}

function renderCarousel() {
  const stage = $("#events-active-grid");
  if (!stage) return;
  if (!activeEvents.length) {
    stage.innerHTML = '<div class="empty-state"><strong>Aucun événement actif</strong></div>';
    return;
  }
  activeIndex = Math.max(0, Math.min(activeIndex, activeEvents.length - 1));
  stage.innerHTML = spotlight(activeEvents[activeIndex], false);
  const prev = $("#events-prev"), next = $("#events-next"), counter = $("#events-carousel-counter");
  [prev, next].forEach(b => b?.classList.toggle("hidden", activeEvents.length < 2));
  if (counter) counter.textContent = activeEvents.length > 1 ? `${activeIndex + 1} / ${activeEvents.length}` : "";
}

async function loadEventsIndex() {
  const active = $("#events-active-grid");
  const archives = $("#events-archive-grid");
  const archiveSection = $("#events-archive-section");
  if (!active || !archives) return;
  const { data, error } = await db.from("site_events").select("*")
    .in("status", ["active", "archived"])
    .order("featured", { ascending: false }).order("created_at", { ascending: false });
  if (error) return;
  const events = data || [];
  await loadParticipantMap(events);
  activeEvents = events.filter(e => e.status === "active");
  renderCarousel();

  $("#events-prev")?.addEventListener("click", () => {
    if (!activeEvents.length) return;
    activeIndex = (activeIndex - 1 + activeEvents.length) % activeEvents.length;
    renderCarousel();
  });
  $("#events-next")?.addEventListener("click", () => {
    if (!activeEvents.length) return;
    activeIndex = (activeIndex + 1) % activeEvents.length;
    renderCarousel();
  });

  const old = events.filter(e => e.status === "archived");
  if (!old.length) {
    archiveSection?.classList.add("hidden");
    return;
  }
  archiveSection?.classList.remove("hidden");
  archives.innerHTML = old.map(e => `<article class="event-archive-card"><p class="eyebrow">ARCHIVE</p><h3>${esc(campaignTitle(e))}</h3><p>${esc(e.summary || "")}</p><a class="button button-ghost" href="${eventUrl(e)}">Revoir l’événement →</a></article>`).join("");
}

function delta(a, b, key, d = 0) {
  const x = Number(a?.[key]), y = Number(b?.[key]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "";
  const v = y - x;
  return `${v >= 0 ? "+" : ""}${num(v, d)}`;
}
function nationStat(label, value, change = "") {
  return `<div class="v52-nation-stat"><span>${label}</span><b>${value}</b>${change ? `<small>${change}</small>` : ""}</div>`;
}
function nationCard(p, start, end, startYear, endYear) {
  const a = start?.stats || {}, b = end?.stats || {}, tech = b.technologies || {};
  const annualA = Number(a.annual_gross_income), annualB = Number(b.annual_gross_income);
  const img = crest(p);
  return `<article class="v52-nation-card" data-nation="${esc(p.participant_key || "")}">
    <div class="v52-nation-head">
      ${img ? `<img src="${img}" alt="Emblème de ${esc(p.title)}" loading="lazy">` : ""}
      <div><h3>${esc(p.title)}</h3><p>${esc(p.player_name || "")}</p></div>
    </div>
    <div class="v52-nation-period"><strong>${startYear} → ${endYear}</strong><span>FIN SESSION I</span></div>
    <div class="v52-nation-stats">
      ${nationStat("Provinces", num(b.province_count), delta(a, b, "province_count"))}
      ${nationStat("Développement", num(b.development), delta(a, b, "development"))}
      ${nationStat("Revenu brut", `${num(annualB, 1)} ¤`, pct(annualA, annualB))}
      ${nationStat("Manpower max", num(Number(b.max_manpower) * 1000), delta({ v: Number(a.max_manpower) * 1000 }, { v: Number(b.max_manpower) * 1000 }, "v"))}
      ${nationStat("Armée", `${num(b.regiment_count)} rég.`, delta(a, b, "regiment_count"))}
      ${nationStat("Flotte", `${num(b.ship_count)} nav.`, delta(a, b, "ship_count"))}
      ${nationStat("Technologies", `${tech.administrative ?? "—"} / ${tech.diplomatic ?? "—"} / ${tech.military ?? "—"}`, "Adm · Dip · Mil")}
      ${nationStat("Pertes cumulées", num(b.war_losses))}
      ${nationStat("Guerres", num(b.wars_participated))}
    </div>
  </article>`;
}

function chapterRange(c) {
  if (c.world_start_date) return `${year(c.world_start_date)}${c.world_end_date ? ` → ${year(c.world_end_date)}` : ""}`;
  if (c.real_start_date) return `${c.real_start_date}${c.real_end_date && c.real_end_date !== c.real_start_date ? ` → ${c.real_end_date}` : ""}`;
  return c.metadata?.display_label || "";
}
function normalizeKind(k = "autre") {
  return categoryLabel[k] ? k : "autre";
}
function eventCountries(e, participantsById) {
  const result = [];
  const owner = e.participant_id ? participantsById.get(e.participant_id) : null;
  if (owner?.title) result.push(owner.title);
  for (const tag of e.data?.participants || []) {
    const match = [...participantsById.values()].find(p => p.participant_key === tag);
    result.push(match?.title || tag);
  }
  return [...new Set(result)];
}
function timelineNode(e) {
  const kind = normalizeKind(e.entry_type);
  const label = e.world_year ? String(e.world_year) : (e.world_date_label || "—");
  return `<button class="v52-timeline-node" type="button" data-kind="${esc(kind)}" data-timeline-id="${esc(e.id)}">
    <span class="v52-node-year">${esc(label)}</span>
    <span class="v52-node-dot"><i>${categoryIcon[kind] || "•"}</i></span>
    <span class="v52-node-kind">${categoryLabel[kind] || "Événement"}</span>
    <strong>${esc(e.title)}</strong>
  </button>`;
}
function timelineMarkup(chapters, entries) {
  const visibleEntries = entries.filter(e => !diplomaticTypes.has(e.entry_type));
  let html = `<div class="v52-timeline-toolbar">
    <button class="v52-timeline-filter active" data-filter="all">Toutes</button>
    <button class="v52-timeline-filter" data-filter="guerre">⚔ Guerres</button>
    <button class="v52-timeline-filter" data-filter="dynastie">♛ Dynasties</button>
    <button class="v52-timeline-filter" data-filter="union_personnelle">◆ Unions</button>
    <button class="v52-timeline-filter" data-filter="désastre">! Désastres</button>
    <button class="v52-timeline-filter" data-filter="politique">✦ Politique</button>
  </div><div class="v52-timeline-shell"><div class="v52-timeline-track">`;
  const used = new Set();
  for (const chapter of chapters) {
    const related = visibleEntries
      .filter(e => e.chapter_id === chapter.id)
      .sort((a, b) => (Number(a.world_year || 9999) - Number(b.world_year || 9999)) || (Number(a.sort_order || 0) - Number(b.sort_order || 0)));
    if (!related.length) continue;
    html += `<div class="v52-session-divider"><b>${esc(chapter.title)}</b><span>${esc(chapterRange(chapter))}</span></div>`;
    related.forEach(e => { used.add(e.id); html += timelineNode(e); });
  }
  visibleEntries
    .filter(e => !used.has(e.id))
    .sort((a, b) => (Number(a.world_year || 9999) - Number(b.world_year || 9999)) || (Number(a.sort_order || 0) - Number(b.sort_order || 0)))
    .forEach(e => { html += timelineNode(e); });
  html += `</div></div><article id="v52-timeline-detail" class="v52-timeline-detail hidden" aria-live="polite"></article>`;
  return html;
}
function fillTimelineDetail(entry, participantsById) {
  const detail = $("#v52-timeline-detail");
  if (!detail || !entry) return;
  const kind = normalizeKind(entry.entry_type);
  const countries = eventCountries(entry, participantsById);
  detail.classList.remove("hidden");
  detail.innerHTML = `<div class="v52-timeline-detail-meta"><span>${categoryIcon[kind] || "•"} ${categoryLabel[kind] || "Événement"}</span><span>${esc(entry.world_date_label || entry.world_year || "Date non précisée")}</span></div><h3>${esc(entry.title)}</h3><p>${esc(entry.summary || entry.body || "Fait historique enregistré dans la campagne.")}</p>${countries.length ? `<div class="v52-timeline-countries">${countries.map(c => `<span>${esc(c)}</span>`).join("")}</div>` : ""}`;
}
function bindTimeline(entries, participantsById) {
  const map = new Map(entries.map(e => [String(e.id), e]));
  const buttons = $$(".v52-timeline-node");
  const filters = $$(".v52-timeline-filter");
  const select = button => {
    if (!button) return;
    buttons.forEach(b => b.classList.toggle("active", b === button));
    fillTimelineDetail(map.get(button.dataset.timelineId), participantsById);
  };
  buttons.forEach(button => button.addEventListener("click", () => select(button)));
  filters.forEach(filter => filter.addEventListener("click", () => {
    filters.forEach(x => x.classList.toggle("active", x === filter));
    const value = filter.dataset.filter;
    buttons.forEach(button => button.classList.toggle("is-hidden", value !== "all" && button.dataset.kind !== value));
    const first = buttons.find(button => !button.classList.contains("is-hidden"));
    select(first);
  }));
  select(buttons[0]);
}

function diplomacyCard(e, participantsById) {
  const p = e.participant_id ? participantsById.get(e.participant_id) : null;
  const img = crest(p);
  return `<article class="v52-diplomacy-card"><div class="v52-diplomacy-head">${img ? `<img src="${img}" alt="${esc(p.title)}" loading="lazy">` : ""}<div><b>${esc(p?.title || "Diplomatie")}</b><span>${esc((e.entry_type || "déclaration").replace("_", " "))}${e.world_date_label ? ` · ${esc(e.world_date_label)}` : ""}</span></div></div><h3>${esc(e.title)}</h3><p>${esc(e.summary || "")}</p>${e.body ? `<details><summary>Lire le texte complet</summary><p>${esc(e.body)}</p></details>` : ""}</article>`;
}

function overviewMarkup(event, participants, chapters) {
  const sessions = chapters.filter(c => c.kind === "session" && c.status === "complete").length || sessionsCount(event);
  return `<div class="v52-overview">
    <div class="v52-overview-title"><p class="eyebrow">APERÇU</p><h2>Comprendre la campagne</h2><p>Une campagne multijoueur RP sur Europa Universalis IV, pensée comme une chronique suivie plutôt qu’un tableau de statistiques.</p></div>
    <div class="v52-overview-stats">
      <div><span>Campagne</span><strong>1444 → ${year(event.world_current_date)}</strong><small>Période jouée</small></div>
      <div><span>Sessions</span><strong>${sessions}</strong><small>Sessions terminées</small></div>
      <div><span>Nations</span><strong>${participants.length || 7}</strong><small>Puissances jouées</small></div>
      <div><span>Chronologie</span><strong>${year(event.public_chronicle_cutoff_date)}</strong><small>Dernière année publique</small></div>
    </div>
    <article class="v52-overview-story">
      <div class="v52-overview-illustration" aria-hidden="true"></div>
      <div><h3>Une grande stratégie, des histoires humaines</h3><p>Europa Universalis IV vous place à la tête d’une nation de 1444 à 1821. Ici, sept joueurs incarnent leur puissance sur plusieurs sessions et prolongent la partie par de la diplomatie RP : alliances, rivalités, traités, congrès et négociations.</p><p>Le dernier relevé statistique public date de <strong>${year(event.public_snapshot_date)}</strong>. Les données récentes sont volontairement retardées afin de préserver la découverte, la diplomatie et l’esprit « no ledger » de la partie.</p></div>
      <aside><span>DIPLOMATIE</span><span>AVANT</span><span>MÉTADONNÉES</span></aside>
    </article>
  </div>`;
}

async function loadEventDetail() {
  const slug = document.body.dataset.eventSlug || new URLSearchParams(location.search).get("slug");
  if (!slug) return;

  const { data: event, error } = await db.from("site_events").select("*").eq("slug", slug).maybeSingle();
  if (error || !event) return;

  const [pr, ch, sn, en, me] = await Promise.all([
    db.from("site_event_participants").select("*").eq("event_id", event.id).eq("public", true).order("sort_order"),
    db.from("site_event_chapters").select("*").eq("event_id", event.id).eq("public", true).order("sort_order"),
    db.from("site_event_snapshots").select("*").eq("event_id", event.id).eq("public", true).order("snapshot_date"),
    db.from("site_event_entries").select("*").eq("event_id", event.id).eq("public", true).order("world_year", { ascending: true, nullsFirst: false }).order("sort_order"),
    db.from("site_event_media").select("*").eq("event_id", event.id).eq("public", true).order("sort_order")
  ]);

  const participants = pr.data || [];
  const chapters = ch.data || [];
  const snapshots = sn.data || [];
  const entries = en.data || [];
  const media = me.data || [];
  const participantsById = new Map(participants.map(p => [p.id, p]));

  const hero = $(".event-hero");
  if (hero) {
    hero.classList.add("v52-event-hero-clean", "v52-map-card");
    const inner = $(".event-hero-inner", hero);
    if (inner) inner.innerHTML = `<p class="eyebrow v52-event-hero-kicker">CAMPAGNE MULTIJOUEUR RP</p><p class="v52-event-game">EUROPA UNIVERSALIS IV</p><h1>${esc(campaignTitle(event))}</h1><p class="v52-event-hero-lead">Une campagne où chaque décision compte, mais où le temps lui-même garde ses secrets.</p>`;
  }

  const overview = $("#apercu .section-shell");
  if (overview) overview.innerHTML = overviewMarkup(event, participants, chapters);

  const snapshotIds = snapshots.map(s => s.id);
  let stats = [];
  if (snapshotIds.length) {
    const response = await db.from("site_event_snapshot_stats").select("*").in("snapshot_id", snapshotIds);
    stats = response.data || [];
  }
  const statsMap = new Map(stats.map(s => [`${s.snapshot_id}:${s.participant_id}`, s]));
  const start = snapshots[0], end = snapshots.at(-1);
  const nations = $("#event-nations-grid");
  if (nations) {
    nations.className = "v52-nations-grid";
    nations.innerHTML = participants.map(p => nationCard(p, statsMap.get(`${start?.id}:${p.id}`), statsMap.get(`${end?.id}:${p.id}`), year(start?.snapshot_date), year(end?.snapshot_date))).join("");
  }
  $(".event-data-note")?.remove();

  const timeline = $("#event-timeline");
  if (timeline) {
    timeline.className = "v52-timeline-wrap";
    timeline.innerHTML = timelineMarkup(chapters, entries);
    bindTimeline(entries.filter(e => !diplomaticTypes.has(e.entry_type)), participantsById);
  }

  const diplomacy = $("#event-diplomacy");
  const diplomaticEntries = entries.filter(e => diplomaticTypes.has(e.entry_type));
  if (diplomacy) {
    diplomacy.className = "v52-diplomacy-grid";
    diplomacy.innerHTML = diplomaticEntries.length ? diplomaticEntries.map(e => diplomacyCard(e, participantsById)).join("") : '<div class="empty-state"><strong>Aucune prise de parole publique pour le moment</strong><p>Les déclarations, traités et congrès apparaîtront ici une fois publiés.</p></div>';
  }

  const mediaBox = $("#event-media");
  if (mediaBox) {
    mediaBox.innerHTML = media.length ? media.map(m => {
      const title = esc(m.title || "Média de campagne");
      const caption = m.caption ? `<span>${esc(m.caption)}</span>` : "";
      if (m.media_type === "image") return `<figure class="event-media-card"><img src="${esc(m.url)}" alt="${title}" loading="lazy"><figcaption><strong>${title}</strong>${caption}</figcaption></figure>`;
      if (m.media_type === "audio") return `<figure class="event-media-card event-media-audio"><figcaption><strong>${title}</strong>${caption}</figcaption><audio controls preload="metadata" src="${esc(m.url)}"></audio></figure>`;
      if (m.media_type === "video") return `<figure class="event-media-card event-media-video"><video controls preload="metadata" src="${esc(m.url)}"></video><figcaption><strong>${title}</strong>${caption}</figcaption></figure>`;
      return `<a class="event-media-card event-media-link" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer"><figcaption><strong>${title}</strong>${caption}<small>Ouvrir le lien ↗</small></figcaption></a>`;
    }).join("") : '<div class="empty-state"><strong>Galerie à venir</strong><p>Images, cartes, fichiers audio et vidéos de la campagne apparaîtront ici.</p></div>';
  }
}

async function boot() {
  if (!BACKEND_CONFIGURED) return;
  db = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: false } });
  await Promise.all([loadHomeFeature(), loadEventsIndex(), loadEventDetail()]);
}
boot();
