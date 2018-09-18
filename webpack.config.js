const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  context: path.join(__dirname, 'src'),
  entry: [
    './zplat.js',
  ],
  output: {
    path: path.join(__dirname, 'public'),
    filename: 'js/bundle.js',
    publicPath: '/',
  },
  plugins: [
  ],
};
