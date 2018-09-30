/**
 * This file runs a webpack-dev-server, using the API.
 *
 * For more information on the options passed to WebpackDevServer,
 * see the webpack-dev-server API docs:
 * https://github.com/webpack/docs/wiki/webpack-dev-server#api
 */
const WebpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const config = require('./webpack.config.js');
const path = require('path');
const fs = require('fs');

const express = require('express');
const compiler = webpack(config);
const server = new WebpackDevServer(compiler, {
  contentBase: 'public',
  hot: true,
  filename: 'bundle.js',
  publicPath: '/',
  stats: {
	 colors: true,
  },
});

var bodyParser = require('body-parser')
server.use( bodyParser.json());
server.use(bodyParser.urlencoded({  extended: true }));
server.use('/save', (req, res) => {

  console.log('req.body', JSON.stringify(req.body));
  const json = JSON.stringify(req.body);
  const string_to_write = `import { LayerData } from './chunk';

export const initial_overlay: LayerData = ${json};
`;

  console.log(string_to_write);
  fs.writeFileSync('src/initial_overlay.ts', string_to_write, 'utf8');
  res.send(JSON.stringify('ok'));
});

server.listen(3000, 'localhost', function() {});
