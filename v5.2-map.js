const ROOT = new URL('./', import.meta.url);
const PAGE = document.body?.dataset?.page || '';
const IS_RELEVANT_PAGE = PAGE === 'home' || PAGE === 'events' || PAGE === 'event';

const MAP_PARTS = [
  'assets/eu4/europe-1444-political-v52.b64.001a1',
  'assets/eu4/europe-1444-political-v52.b64.001a2',
  'assets/eu4/europe-1444-political-v52.b64.001a3',
  'assets/eu4/europe-1444-political-v52.b64.001a4_1',
  'assets/eu4/europe-1444-political-v52.b64.001a4_2',
  'assets/eu4/europe-1444-political-v52.b64.001a4_3_1',
  'assets/eu4/europe-1444-political-v52.b64.001a4_3_2',
  'assets/eu4/europe-1444-political-v52.b64.001a4_3_3',
  'assets/eu4/europe-1444-political-v52.b64.001a4_3_4',
  'assets/eu4/europe-1444-political-v52.b64.001a4_3_5',
  'assets/eu4/europe-1444-political-v52.b64.001a4_4',
  'assets/eu4/europe-1444-political-v52.b64.001b',
  'assets/eu4/europe-1444-political-v52.b64.002',
  'assets/eu4/europe-1444-political-v52.b64.003',
  'assets/eu4/europe-1444-political-v52.b64.004'
];
const EXPECTED_BASE64_LENGTH = 60652;

async function loadMap() {
  if (!IS_RELEVANT_PAGE) return;
  const chunks = await Promise.all(MAP_PARTS.map(async path => {
    const response = await fetch(new URL(path, ROOT), { cache: 'force-cache' });
    if (!response.ok) throw new Error(`EU4 map fragment unavailable: ${response.status}`);
    return (await response.text()).trim();
  }));
  const base64 = chunks.join('');
  if (base64.length !== EXPECTED_BASE64_LENGTH || !base64.startsWith('UklGR')) throw new Error('EU4 map payload is invalid');
  document.documentElement.style.setProperty('--v52-eu4-map', `url("data:image/webp;base64,${base64}")`);
  document.documentElement.classList.add('v52-eu4-map-ready');
}

loadMap().catch(error => console.warn('V5.2 EU4 map fallback active', error));
