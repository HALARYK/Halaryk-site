export const CONFIG = {
  SUPABASE_URL: "https://elnyjjasqfizkimoljvz.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_5MaM474nENQVzcpARDQlBg_NiDXL3Nx",
  TWITCH_CHANNEL_LOGIN: "halaryk",
  TWITCH_URL: "https://www.twitch.tv/halaryk",
  TWITCH_CLIPS: [
    "FreezingTallMinkUWot-3OwWXifqnd3dVznt",
    "SmallSquareKimchiSMOrc-tWYQ7KNuO-VIss3t",
    "ModernSpikySandwichCoolStoryBob-ziEGVxAKaUSoNuAx",
    "ObeseCheerfulSoybeanCmonBruh-3kf9fZ67xh8bXZ9a"
  ],
  CLIPPER_NAMES: [],
  SOCIALS: {
    twitch: "https://www.twitch.tv/halaryk",
    discord: "https://discord.gg/yCQjxRh6MV",
    instagram: "https://www.instagram.com/halaryk_/"
  }
};
export const BACKEND_CONFIGURED =
  !CONFIG.SUPABASE_URL.includes("VOTRE-PROJET") &&
  !CONFIG.SUPABASE_PUBLISHABLE_KEY.includes("VOTRE_CLE");

globalThis.HALARYK_CONFIG = CONFIG;
if (typeof document !== "undefined") {
  import("./v5.2.js").catch(error => console.error("V5.2 enhancement load failed", error));
}
