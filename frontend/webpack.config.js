module.exports = {
  module: {
    rules: [
      {
        test: /\.svg$/,
        use: ['@svgr/webpack', 'url-loader'],
        options: {
          throwIfNamespace: false
        }
      }
    ]
  }
}; 