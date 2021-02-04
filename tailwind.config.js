module.exports = {
  corePlugins: { preflight: false },
  darkMode: "class",
  plugins: [],
  purge: {
    content: ["./src/webview/**/*.tsx"],
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
