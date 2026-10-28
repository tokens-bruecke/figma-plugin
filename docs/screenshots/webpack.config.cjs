// Builds the screenshot harness from the plugin's own UI sources, reusing
// the loaders and aliases of the plugin build.
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const root = path.resolve(__dirname, '../..');
const plugin = require(path.join(root, 'webpack.config.js'))({}, {});

module.exports = {
  mode: 'development',
  devtool: false,
  context: root,
  entry: { harness: path.join(__dirname, 'harness.tsx') },
  module: {
    rules: plugin.module.rules.map((rule) =>
      String(rule.test) === String(/\.tsx?$/)
        ? {
            ...rule,
            use: {
              loader: 'ts-loader',
              options: {
                configFile: path.join(__dirname, 'tsconfig.json'),
                transpileOnly: true,
              },
            },
          }
        : rule
    ),
  },
  resolve: plugin.resolve,
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '.build'),
    publicPath: '',
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'harness.html'),
      filename: 'harness.html',
    }),
    new MiniCssExtractPlugin(),
  ],
};
