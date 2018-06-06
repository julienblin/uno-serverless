const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

const distFolder = path.join(__dirname, 'dist');

module.exports = {
  context: path.join(__dirname, 'src'),
  entry: './index',
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
    filename: 'index.js',
  },
  module: {
    rules: [
      { test: /\.ts(x?)$/, loader: 'ts-loader' },
    ],
  },
  plugins: [
    new CleanWebpackPlugin([distFolder]),
  ],
  externals: {
    'ajv': 'ajv',
    'aws-sdk': 'aws-sdk',
    'axios': 'axios',
  }
};
