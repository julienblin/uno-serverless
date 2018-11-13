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
      {
        test: /\.ts(x?)$/,
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            outDir: distFolder
          }
        }
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin([distFolder])
  ],
  externals: {
    'accounting': 'accounting',
    'currency-formatter': 'currency-formatter',
    'nunjucks': 'nunjucks',
    'handlebars': 'handlebars',
    'handlebars-dateformat': 'handlebars-dateformat',
    'pluralize': 'pluralize',
    'uno-serverless': 'uno-serverless'
  }
};
