// @ts-check

/** @type {import("tailwindcss/tailwind-config").TailwindConfig } */
const config = {
  // @ts-ignore
  corePlugins: { preflight: false },
  mode: "jit",
  darkMode: "class",
  purge: {
    content: ["./packages/webview/src/**/*.tsx"],
    enabled: true,
    mode: "all",
    preserveHtmlElements: false,
    // @ts-ignore
    options: {
      safelist: { greedy: [/^dark:text-white$/] },
      keyframes: true,
    },
  },
  theme: {
    extend: {
      // @ts-ignore
      zIndex: { "-10": -10 },
    },
  },
  variants: {
    extend: {
      textColor: ["dark"],
    },
  },
};

module.exports = config;
