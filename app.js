import { CONFIG } from "./config.js";
globalThis.HALARYK_CONFIG = CONFIG;
await import("./shell-v52.js");
await import("./app-core.js");
