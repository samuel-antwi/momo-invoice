// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    paystack: {
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
    },
    // Public environment variables (exposed to client)
    public: {
      appUrl: process.env.APP_URL || "http://localhost:3000",
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
    },
  },

  modules: [["@nuxt/ui", { fonts: false }], "@vueuse/nuxt", "@nuxtjs/supabase"],

  colorMode: {
    preference: "light",
    fallback: "light",
    hid: "nuxt-color-mode-script",
    globalName: "__NUXT_COLOR_MODE__",
    componentName: "ColorScheme",
    classPrefix: "",
    classSuffix: "",
    storageKey: "nuxt-color-mode",
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirect: false,
  },
});
