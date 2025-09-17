// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    // Public environment variables (exposed to client)
    public: {
      appUrl: process.env.APP_URL || "http://localhost:3000",
    },
  },

  modules: [["@nuxt/ui", { fonts: false }], "@vueuse/nuxt"],
});
