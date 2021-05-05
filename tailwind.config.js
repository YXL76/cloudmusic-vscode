module.exports = {
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
      zIndex: { "-10": -10 },
    },
  },
  variants: {},
};
