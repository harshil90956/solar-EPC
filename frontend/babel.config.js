module.exports = {
  presets: ['react-app'],
  plugins: [],
  // Exclude papaparse from Babel processing to prevent infinite recursion
  exclude: [/node_modules[\\/]papaparse/]
};
