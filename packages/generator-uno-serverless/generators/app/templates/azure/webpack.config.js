const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const yaml = require('js-yaml');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const SpawnPlugin = require("webpack-spawn-plugin");

const handlersPath = 'src/handlers';

const getApiVersion = () => {
  const processStdio = { stdio: ['pipe', 'pipe', 'ignore'] };

  const package = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  try {
    const gitShortCommit = childProcess.execSync('git rev-parse --short HEAD', processStdio).toString().trim();
    let isDirty = false;
    try {
      childProcess.execSync('git diff --no-ext-diff --quiet --exit-code', processStdio);
    } catch (error) {
      isDirty = true;
    }
    return `${package.version}+${gitShortCommit}${isDirty ? "-dirty" : ""}`;
  } catch (error) {
    return package.version;
  }
};

const apiVersion = getApiVersion();

const entries = fs.readdirSync(handlersPath).reduce((acc, cur) => {
  if (cur.match(/.*\.json/ig)) {
    const basename = path.basename(cur, '.json');
    acc[basename] = path.join(handlersPath, `${basename}.ts`);
  }
  return acc;
}, {});

const distFolder = path.join(__dirname, 'dist');

module.exports = (env) => {
  env = env || 'production';

  const plugins = [
    new ForkTsCheckerWebpackPlugin({ checkSyntacticErrors: true }),
    new webpack.ContextReplacementPlugin(/ms-rest/, undefined),
    new CopyWebpackPlugin([
      { from: 'src/handlers/*.json', to: '[name]/function.json' },
      { from: 'host.json', to: 'host.json' },
      { from: 'local.settings.json', to: 'local.settings.json' },
      {
        from: 'proxies.json',
        to: 'proxies.json',
        transform: (content) => {
          return Buffer.from(
            content.toString('utf8')
              .replace("{{version}}", apiVersion)
              .replace("{{timestamp}}", new Date().toISOString()));
        }
      },
      {
        from: 'openapi.yml',
        to: 'openapi.json',
        transform: (content) => {
          const openApiContent = yaml.safeLoad(content.toString('utf8'));
          openApiContent.info.version = apiVersion;
          return Buffer.from(JSON.stringify(openApiContent));
        }
      }
    ])
  ];

  if (env === 'production') {
    plugins.push(
      new ZipPlugin({
        filename: '<%= projectName %>.zip'
      }));
  } else {
    plugins.push(
      new SpawnPlugin('func', ['start', '--language-worker="--inspect=5858"'], {
        cwd: 'dist',
        when: 'done',
        encoding: 'utf-8',
        persistent: true,
        maxBuffer: 10485760 // 10MB
      }));
  }

  return ({
    entry: entries,
    devtool: env === 'production' ? 'cheap-module-source-map' : 'eval-source-map',
    mode: env,
    target: 'node',
    stats: 'normal',
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
    plugins,
    output: {
      libraryTarget: 'commonjs',
      path: path.join(distFolder),
      filename: '[name]/index.js',
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            { loader: 'cache-loader' },
            { loader: 'thread-loader', options: { workers: require('os').cpus().length - 1 } },
            { loader: 'ts-loader', options: { happyPackMode: true } }
          ]
        }
      ],
    }
  });
};
