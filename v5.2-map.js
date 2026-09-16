const ROOT = new URL("./", import.meta.url);
const PAGE = document.body?.dataset?.page || "";
const IS_RELEVANT_PAGE = PAGE === "home" || PAGE === "events" || PAGE === "event";

const MAP_PARTS = [
  "assets/eu4/europe-1444-political-v52.b64.001a1",
  "assets/eu4/europe-1444-political-v52.b64.001a2",
  "assets/eu4/europe-1444-political-v52.b64.001a3",
  "assets/eu4/europe-1444-political-v52.b64.001a4_1",
  "assets/eu4/europe-1444-political-v52.b64.001a4_2",
  "assets/eu4/europe-1444-political-v52.b64.001a4_3_1",
  "assets/eu4/europe-1444-political-v52.b64.001a4_3_2",
  "assets/eu4/europe-1444-political-v52.b64.001a4_3_3",
  "assets/eu4/europe-1444-political-v52.b64.001a4_3_4",
  "assets/eu4/europe-1444-political-v52.b64.001a4_3_5",
  "assets/eu4/europe-1444-political-v52.b64.001a4_4",
  "assets/eu4/europe-1444-political-v52.b64.001b",
  "assets/eu4/europe-1444-political-v52.b64.002",
  "assets/eu4/europe-1444-political-v52.b64.003",
  "assets/eu4/europe-1444-political-v52.b64.004"
];
const EXPECTED_BASE64_LENGTH = 60652;

function installMapStyles() {
  if (document.querySelector("style[data-v52-eu4-map]")) return;
  const style = document.createElement("style");
  style.dataset.v52Eu4Map = "1";
  style.textContent = `
    html.v52-eu4-map-ready .v52-feature-card.v52-eu4-cover::before {
      background-image: var(--v52-eu4-map) !important;
      background-position: center 46% !important;
      background-size: cover !important;
      background-repeat: no-repeat !important;
      opacity: .78 !important;
      filter: saturate(.82) brightness(.62) contrast(1.05) !important;
      transform: scale(1.015);
    }

    html.v52-eu4-map-ready .v52-feature-card.v52-eu4-cover::after {
      background:
        linear-gradient(90deg, #070606 0%, rgba(7,6,6,.97) 38%, rgba(7,6,6,.82) 58%, rgba(7,6,6,.52) 100%),
        linear-gradient(180deg, rgba(7,6,6,.12) 0%, rgba(7,6,6,.24) 58%, rgba(7,6,6,.84) 100%) !important;
    }

    html.v52-eu4-map-ready body[data-event-slug="ppo-europe"] .event-hero {
      background:
        linear-gradient(90deg, #080707 0%, rgba(8,7,7,.95) 36%, rgba(8,7,7,.71) 64%, rgba(8,7,7,.38) 100%),
        linear-gradient(180deg, rgba(8,7,7,.13) 0%, rgba(8,7,7,.10) 58%, #080707 100%),
        var(--v52-eu4-map) center 46% / cover no-repeat !important;
    }

    @media (max-width: 900px) {
      html.v52-eu4-map-ready .v52-feature-card.v52-eu4-cover::before {
        background-position: 58% center !important;
        opacity: .66 !important;
      }

      html.v52-eu4-map-ready .v52-feature-card.v52-eu4-cover::after {
        background:
          linear-gradient(180deg, rgba(7,6,6,.86) 0%, rgba(7,6,6,.68) 42%, rgba(7,6,6,.90) 100%) !important;
      }

      html.v52-eu4-map-ready body[data-event-slug="ppo-europe"] .event-hero {
        background:
          linear-gradient(180deg, rgba(8,7,7,.78) 0%, rgba(8,7,7,.62) 46%, #080707 100%),
          var(--v52-eu4-map) 54% center / cover no-repeat !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function markCampaignCards(root = document) {
  root.querySelectorAll?.(".v52-feature-card").forEach(card => {
    const title = card.querySelector("h3")?.textContent?.trim() || "";
    if (title === "Grande campagne Europa Universalis IV") {
      card.classList.add("v52-eu4-cover");
    }
  });
}

async function loadMap() {
  const chunks = await Promise.all(MAP_PARTS.map(async path => {
    const response = await fetch(new URL(path, ROOT), { cache: "force-cache" });
    if (!response.ok) throw new Error(`EU4 map fragment unavailable: ${response.status}`);
    return (await response.text()).trim();
  }));

  const base64 = chunks.join("");
  if (base64.length !== EXPECTED_BASE64_LENGTH || !base64.startsWith("UklGR")) {
    throw new Error("EU4 map payload is invalid");
  }

  document.documentElement.style.setProperty(
    "--v52-eu4-map",
    `url("data:image/webp;base64,${base64}")`
  );
  document.documentElement.classList.add("v52-eu4-map-ready");
}

async function boot() {
  if (!IS_RELEVANT_PAGE) return;

  installMapStyles();
  markCampaignCards();

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.(".v52-feature-card")) markCampaignCards(node.parentElement || document);
        else if (node.querySelector?.(".v52-feature-card")) markCampaignCards(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  try {
    await loadMap();
    markCampaignCards();
  } catch (error) {
    console.warn("V5.2 EU4 map fallback active", error);
  }
}

boot();
