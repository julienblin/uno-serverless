const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const distFolder = path.join(__dirname, 'dist');

module.exports = {
  context: path.join(__dirname, 'src'),
  entry: { index: './index' },
  devtool: 'source-map',
  mode: 'production',
  target: 'node',
  resolve: {
    extensions: [
      '.js',
      '.json',
      '.ts'
    ]
  },
  output: {
    libraryTarget: 'commonjs',
    path: distFolder,
    filename: '[name].js',
  },
  module: {
    rules: [
      { test: /\.ts(x?)$/, loader: 'ts-loader' },
    ],
  },
  plugins: [
    new CleanWebpackPlugin([distFolder]),
    new webpack.ContextReplacementPlugin(/yargs/, undefined),
    new webpack.ContextReplacementPlugin(/yargs-parser/, undefined),
    new webpack.ContextReplacementPlugin(/require-main-filename/, undefined),
    new webpack.ContextReplacementPlugin(/cross-spawn/, undefined)
  ],
  externals: {
    'typescript': 'typescript'
  }
};
