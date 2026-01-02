const src = __dirname + "/src"
const dist = __dirname + "/dist"
const webpack = require('webpack');
const version = JSON.stringify(require('./package.json').version);

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  target: 'node',
  devServer: {
    contentBase: dist
  },
  context: src,
  entry: {
    'configloder': './configloder/ConfigLoder.js',
    'serializer': './configloder/Serializer.js',
    'finddifferences': './configloder/FindDifferences.js',
    'configtool': './tools/index.js',
  },
  output: {
    filename: '[name].bundle.js',
    sourceMapFilename: './map/[id].[chunkhash].js.map',
    chunkFilename: './chunk/[id].[chunkhash].js',
    path: dist,
    publicPath:"",
    libraryExport: 'default',
    libraryTarget: 'umd',
    library: 'configloder'
  },
  module: {
  },
  resolve: {
    modules: ['node_modules']
  },
  plugins: [
    new webpack.DefinePlugin({
        __VERSION__: version
    }),
    new webpack.BannerPlugin({
      banner: '#!/usr/bin/env node', raw: true
    })
  ]
}