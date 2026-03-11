const { override, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
  // Ensure babel-loader excludes node_modules and papaparse specifically
  addWebpackModuleRule({
    test: /\.(js|jsx|ts|tsx)$/,
    exclude: [
      /node_modules[\\/]papaparse/,
      /node_modules[\\/]source-map/,
      /node_modules[\\/]@babel/,
    ],
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['react-app'],
        cacheDirectory: true,
      }
    }
  }),
  // Override the default babel-loader to exclude papaparse
  (config) => {
    // Find and modify the existing babel-loader rule
    const babelLoaderRule = config.module.rules.find(
      rule => rule.use && 
              Array.isArray(rule.use) && 
              rule.use.some(u => u.loader && u.loader.includes('babel-loader'))
    );
    
    if (babelLoaderRule) {
      // Ensure exclude includes papaparse
      if (!babelLoaderRule.exclude) {
        babelLoaderRule.exclude = [/node_modules[\\/]papaparse/, /node_modules[\\/]source-map/];
      } else if (Array.isArray(babelLoaderRule.exclude)) {
        babelLoaderRule.exclude.push(/node_modules[\\/]papaparse/, /node_modules[\\/]source-map/);
      } else {
        babelLoaderRule.exclude = [babelLoaderRule.exclude, /node_modules[\\/]papaparse/, /node_modules[\\/]source-map/];
      }
    }
    
    return config;
  }
);
