// @ts-check

/** @type {import("tailwindcss/tailwind-config").TailwindConfig } */
const config = {
  corePlugins: { preflight: false },
  darkMode: "class",
  content: ["./packages/webview/src/**/*.tsx"],
  theme: { extend: { zIndex: { "-10": "-10" } } },
};

module.exports = config;
