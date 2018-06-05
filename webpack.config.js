const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const distFolder = path.join(__dirname, 'dist');

module.exports = {
  context: path.join(__dirname, 'src'),
  entry: {
    './index': './index',
    './middlewares/index': './middlewares/index',
    './services/index': './services/index',
  },
  devtool: 'source-map',
  mode: 'production',
  target: 'node',
  resolve: {
    extensions: [
      '.js',
      '.json',
      '.ts'
    ],
    plugins: [
      new TsconfigPathsPlugin()
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
  ],
  externals: {
    'aws-sdk': 'aws-sdk',
    'axios': 'axios',
  }
};
