/* Mobile UX V5.3 — pure progressive enhancement, no content or data changes. */
const ROOT = new URL("./", import.meta.url);
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const onPhone = () => window.matchMedia("(max-width: 900px)").matches;
const icons = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  events:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>',
  content:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 8 6 4-6 4z"/>',
  community:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/>',
  infos:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'
};
function rootLink(path) { return new URL(path, ROOT).href; }
function navIcon(key) { return '<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[key]+'</svg>'; }

function createDock() {
  if ($(".mobile-ux-dock") || document.body.classList.contains("admin-body")) return;
  const page = document.body.dataset.page || "";
  const items = [
    ["home", "Accueil", ""],
    ["events", "Événements", "evenements/"],
    ["content", "Contenu", "contenu/"],
    ["community", "Communauté", "communaute/"],
    ["infos", "Infos", "infos/"]
  ];
  const active = page === "event" ? "events" : page;
  const dock = document.createElement("nav");
  dock.className = "mobile-ux-dock";
  dock.setAttribute("aria-label", "Accès rapide aux rubriques");
  dock.innerHTML = items.map(([key, label, path]) =>
    '<a href="' + rootLink(path) + '"' + (active === key ? ' class="active" aria-current="page"' : '') +
    '>' + navIcon(key) + '<span>' + label + '</span></a>'
  ).join("");
  document.body.appendChild(dock);
}

function closeNavigation({returnFocus = false} = {}) {
  const nav = $("#main-nav");
  const menu = $(".menu-toggle");
  if (!nav?.classList.contains("open")) return;
  nav.classList.remove("open");
  document.body.classList.remove("menu-open");
  menu?.setAttribute("aria-expanded", "false");
  const label = $(".sr-only", menu);
  if (label) label.textContent = "Ouvrir le menu";
  if (returnFocus) menu?.focus();
}
function enhanceNavigation() {
  const nav = $("#main-nav");
  const menu = $(".menu-toggle");
  if (!nav || !menu) return;
  menu.setAttribute("aria-label", "Ouvrir ou fermer la navigation");
  nav.setAttribute("aria-label", "Navigation principale");
  $$(".v52-menu-group", nav).forEach(group => {
    const button = $(".v52-menu-button", group);
    const popover = $(".v52-menu-popover", group);
    if (!button || !popover || popover.querySelector(".mobile-ux-overview-link")) return;
    const key = group.classList.contains("active") ? "active" : "";
    const label = button.textContent.replace("⌄", "").trim();
    const paths = {"Contenu":"contenu/","Communauté":"communaute/","Infos":"infos/"};
    if (paths[label]) {
      const overview = document.createElement("a");
      overview.className = "mobile-ux-overview-link";
      overview.href = rootLink(paths[label]);
      overview.textContent = "Vue d’ensemble · " + label;
      popover.prepend(overview);
    }
    button.setAttribute("aria-haspopup", "true");
    if (onPhone() && key === "active") {
      group.classList.add("open");
      button.setAttribute("aria-expanded", "true");
    }
  });
  nav.addEventListener("click", e => {
    if (e.target.closest("a[href]")) closeNavigation();
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Tab" || !onPhone() || !nav.classList.contains("open")) return;
    const focusables = [menu, ...$$('a[href],button:not([disabled])', nav)]
      .filter(el => el.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && nav.classList.contains("open")) closeNavigation({returnFocus:true});
  });
  window.addEventListener("hashchange", () => closeNavigation());
  window.addEventListener("resize", () => { if (!onPhone()) closeNavigation(); }, {passive:true});
  menu.addEventListener("click", () => {
    if (onPhone() && nav.classList.contains("open")) requestAnimationFrame(() => {
      const first = nav.querySelector("a[href]");
      first?.focus({preventScroll:true});
    });
  });
}

function enhanceCampaignSections() {
  const bar = $(".event-subnav-inner");
  if (!bar) return;
  const anchors = $$('a[href^="#"]', bar);
  const sections = anchors.map(a => ({a, target:document.getElementById(a.hash.slice(1))})).filter(o => o.target);
  if (!sections.length) return;
  function activeLink(link) {
    anchors.forEach(a => {
      const isActive = a === link;
      a.classList.toggle("is-current", isActive);
      if (isActive) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
    if (onPhone() && link) {
      const left = link.offsetLeft - (bar.clientWidth - link.offsetWidth) / 2;
      bar.scrollTo({left:Math.max(0,left),behavior:"smooth"});
    }
  }
  anchors.forEach(a => a.addEventListener("click", () => activeLink(a)));
  const observer = new IntersectionObserver(entries => {
    if (!onPhone()) return;
    const visible = entries.filter(x => x.isIntersecting);
    if (!visible.length) return;
    const top = visible.sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    const match = sections.find(x => x.target === top.target);
    if (match) activeLink(match.a);
  }, {rootMargin:"-116px 0px -55% 0px",threshold:0});
  sections.forEach(x => observer.observe(x.target));
  activeLink(sections.find(x=>x.a.hash===location.hash)?.a || sections[0].a);
}

function enhanceNationGestures() {
  const host = $("#event-nations-grid");
  if (!host) return;
  let start = null;
  host.addEventListener("touchstart", e => {
    if (!onPhone() || !host.classList.contains("v52-nations-carousel") || e.touches.length !== 1 || e.target.closest("button,a,input,select,summary")) { start = null; return; }
    start = {x:e.touches[0].clientX,y:e.touches[0].clientY};
  }, {passive:true});
  host.addEventListener("touchend", e => {
    if (!start || !onPhone() || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    start = null;
    if (Math.abs(dx) < 58 || Math.abs(dx) < Math.abs(dy)*1.3) return;
    const button = $(dx < 0 ? ".v52-nation-next" : ".v52-nation-prev", host);
    if (button && !button.disabled) button.click();
  }, {passive:true});
}

function enhanceChronology() {
  const host = $("#event-timeline");
  if (!host) return;
  let lastTrack = null;
  function paginate() {
    const track = $(".v52-curated-track", host);
    if (!track || track === lastTrack) return;
    lastTrack = track;
    // Après un changement de pays, garder l'onglet sélectionné visible.
    const tabs = $(".v52-country-tabs", host);
    const currentTab = $(".v52-country-tabs button.active", host);
    if (onPhone() && tabs && currentTab) requestAnimationFrame(() => {
      const left = currentTab.getBoundingClientRect().left -
        tabs.getBoundingClientRect().left + tabs.scrollLeft -
        (tabs.clientWidth - currentTab.clientWidth) / 2;
      tabs.scrollLeft = Math.max(0, left);
    });
    const items = $(".v52-curated-node", track);
    const wrapper = track.parentElement;
    wrapper.querySelector(".mobile-ux-chronology-more")?.remove();
    if (items.length <= 12) return;
    let shown = 12;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-ux-chronology-more";
    button.setAttribute("aria-label", "Afficher les événements suivants de la nation");
    const update = () => {
      items.forEach((item, index) => item.classList.toggle("mobile-ux-hidden",index >= shown));
      const remaining = items.length - shown;
      button.hidden = remaining <= 0;
      button.textContent = remaining > 0 ? "Voir les événements suivants (" + remaining + " restants) ↓" : "";
    };
    button.addEventListener("click", () => {shown = Math.min(items.length,shown + 12);update()});
    wrapper.appendChild(button);
    update();
  }
  new MutationObserver(paginate).observe(host,{childList:true,subtree:false});
  paginate();
}

function enhanceSkipLink() {
  const main = $("main");
  if (!main) return;
  main.id ||= "contenu-principal";
  if (!$(".mobile-ux-skip-link")) {
    const link = document.createElement("a");
    link.href = "#" + main.id;
    link.className = "mobile-ux-skip-link";
    link.textContent = "Aller au contenu principal";
    document.body.prepend(link);
  }
}
function boot() {
  if (document.body.classList.contains("admin-body")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("mobile-ux.css",ROOT).href;
  document.head.appendChild(link);
  enhanceSkipLink();
  createDock();
  enhanceNavigation();
  enhanceCampaignSections();
  enhanceNationGestures();
  enhanceChronology();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
