// @ts-check

/** @type {import("tailwindcss/tailwind-config").TailwindConfig } */
const config = {
  // @ts-ignore
  corePlugins: { preflight: false },
  darkMode: "class",
  content: ["./packages/webview/src/**/*.tsx"],
  theme: {
    extend: {
      // @ts-ignore
      zIndex: { "-10": -10 },
    },
  },
};

module.exports = config;
