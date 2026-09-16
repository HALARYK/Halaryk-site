import { CONFIG } from './config.js';
globalThis.HALARYK_CONFIG = CONFIG;

const modules = [
  './shell-v52.js',
  './v5.2-map.js',
  './v5.2-feedback.js'
];

const results = await Promise.allSettled(modules.map(path => import(path)));
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`V5.2 preview module failed: ${modules[index]}`, result.reason);
  }
});

document.documentElement.classList.add('v52-preview-bootstrap-ready');
