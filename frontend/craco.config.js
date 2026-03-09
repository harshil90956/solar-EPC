// CRACO configuration to exclude papaparse from babel-loader
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Find the babel-loader rule and modify it to exclude papaparse
      const babelLoaderRule = webpackConfig.module.rules
        .find(rule => rule.oneOf)
        ?.oneOf?.find(
          rule => 
            rule.loader && 
            rule.loader.includes('babel-loader')
        );

      if (babelLoaderRule) {
        // Add exclude for papaparse
        babelLoaderRule.exclude = [
          ...(babelLoaderRule.exclude || []),
          /node_modules[\\/]papaparse/
        ];
      }

      return webpackConfig;
    }
  }
};
