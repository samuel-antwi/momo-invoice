export default defineAppConfig({
  ui: {
    primary: "blue",
    gray: "slate",
    icons: {
      dynamic: true,
    },
    button: {
      default: {
        rounded: "rounded-2xl",
        size: {
          xl: "text-base px-6 py-3.5",
        },
      },
    },
    card: {
      default: {
        rounded: "rounded-3xl",
        shadow: "shadow-2xl shadow-indigo-950/10",
      },
    },
    badge: {
      default: {
        rounded: "rounded-full",
      },
    },
  },
});
