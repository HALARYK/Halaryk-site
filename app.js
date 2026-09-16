import { CONFIG } from "./config.js";
globalThis.HALARYK_CONFIG = CONFIG;

const bootModules = [
  "./shell-v52.js",
  "./event-routes.js",
  "./v5.2-map.js",
  "./app-core.js",
  "./v5.2-feedback.js"
];

const results = await Promise.allSettled(bootModules.map(path => import(path)));
results.forEach((result, index) => {
  if (result.status === "rejected") {
    console.error(`HALARYK module failed: ${bootModules[index]}`, result.reason);
  }
});
