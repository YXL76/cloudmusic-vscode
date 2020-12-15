module.exports = {
  corePlugins: {},
  purge: {
    enabled: true,
    mode: "all",
    preserveHtmlElements: false,
    content: ["./src/webview/**/*.tsx"],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {},
  variants: {},
  plugins: [],
};
