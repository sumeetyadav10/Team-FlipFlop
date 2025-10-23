const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  devtool: process.env.NODE_ENV === 'production' ? false : 'inline-source-map',
  entry: {
    background: './src/background/service-worker.ts',
    'content-meet': './src/content/meet-final.ts',
    'content-universal': './src/content/universal.ts',
    popup: './src/popup/popup.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'public/manifest.json', to: 'manifest.json' },
        { from: 'public/icons', to: 'icons' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'src/popup/popup.css', to: 'popup.css' },
      ],
    }),
  ],
};