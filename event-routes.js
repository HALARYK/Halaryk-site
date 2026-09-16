const CLEAN_EVENT_PATH = 'chroniques-europe/';
const LEGACY_EVENT_PATHS = ['ppo-europe/', 'grande-campagne-eu4/'];

function rewriteEventHref(href = '') {
  for (const legacy of LEGACY_EVENT_PATHS) {
    if (href === legacy || href.startsWith(`${legacy}#`) || href.startsWith(`${legacy}?`)) {
      return CLEAN_EVENT_PATH + href.slice(legacy.length);
    }

    const nestedLegacy = `evenements/${legacy}`;
    if (href.includes(nestedLegacy)) {
      return href.replace(nestedLegacy, `evenements/${CLEAN_EVENT_PATH}`);
    }
  }
  return href;
}

function cleanEventLinks(root = document) {
  root.querySelectorAll?.('a[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    const cleanHref = rewriteEventHref(href);
    if (cleanHref !== href) link.setAttribute('href', cleanHref);
  });
}

cleanEventLinks();
new MutationObserver(() => cleanEventLinks()).observe(document.documentElement, { childList: true, subtree: true });
