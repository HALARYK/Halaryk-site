import { CONFIG } from "./config.js";
globalThis.HALARYK_CONFIG = CONFIG;
await import("./shell-v52.js");
await import("./event-routes.js");
await import("./v5.2-map.js");
await import("./app-core.js");
await import("./v5.2-feedback.js");