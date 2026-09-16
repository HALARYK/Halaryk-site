const CLEAN_EVENT_PATH = 'chroniques-europe/';

function cleanEventLinks(root = document) {
  root.querySelectorAll?.('a[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href === 'ppo-europe/' || href.startsWith('ppo-europe/#') || href.startsWith('ppo-europe/?')) {
      link.setAttribute('href', href.replace(/^ppo-europe\//, CLEAN_EVENT_PATH));
    }
    if (href.includes('evenements/ppo-europe/')) {
      link.setAttribute('href', href.replace('evenements/ppo-europe/', `evenements/${CLEAN_EVENT_PATH}`));
    }
  });
}

cleanEventLinks();
new MutationObserver(() => cleanEventLinks()).observe(document.documentElement, { childList: true, subtree: true });
