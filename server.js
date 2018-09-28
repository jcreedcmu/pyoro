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

  console.log(req.body);
  res.send(JSON.stringify('hello'));
});

server.listen(3000, 'localhost', function() {});
