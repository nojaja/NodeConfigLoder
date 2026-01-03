const path = require('path');
const webpack = require('webpack');
const fs = require('fs');

const src = path.join(__dirname, "src");
const dist = path.join(__dirname, "dist");
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const version = JSON.stringify(packageJson.version);

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  target: 'node',
  devServer: {
    contentBase: dist
  },
  context: src,
  entry: {
    'configloder': './configloder/ConfigLoder.ts',
    'serializer': './configloder/Serializer.ts',
    'finddifferences': './configloder/FindDifferences.ts',
    'conftool': './tools/index.ts',
  },
  output: {
    filename: '[name].bundle.js',
    sourceMapFilename: './map/[id].[chunkhash].js.map',
    chunkFilename: './chunk/[id].[chunkhash].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath:"",
    library: {
      name: 'configloder',
      type: 'umd',
      export: 'default'
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js'],
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
};
