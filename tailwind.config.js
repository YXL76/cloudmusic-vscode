// @ts-check

/** @type {import("tailwindcss/tailwind-config").TailwindConfig } */
const config = {
  // @ts-ignore
  corePlugins: { preflight: false },
  darkMode: "class",
  plugins: [],
  purge: {
    content: ["./packages/webview/src/**/*.tsx"],
    enabled: true,
    mode: "all",
    preserveHtmlElements: false,
  },
  theme: {
    extend: {
      // @ts-ignore
      zIndex: { "-10": -10 },
    },
  },
  variants: {},
};

module.exports = config;
