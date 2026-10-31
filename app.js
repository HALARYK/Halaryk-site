import { CONFIG } from "./config.js";
globalThis.HALARYK_CONFIG = CONFIG;

const bootModules=[
  "./shell-v52.js",
  "./event-routes.js",
  "./app-core.js",
  "./v5.2-extras.js",
  "./v5.2-diplomacy.js",
  "./v5.2-dossiers.js",
  "./v5.2-visual-fixes.js"
];

const results=await Promise.allSettled(bootModules.map(path=>import(path)));
results.forEach((result,index)=>{
  if(result.status==="rejected") console.error(`HALARYK module failed: ${bootModules[index]}`,result.reason);
});

// Chargé après les autres modules pour prioriser les ajustements responsives.
import("./mobile-ux.js").catch(error => console.error("Mobile UX failed:", error));
