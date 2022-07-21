const path = require('path');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');

const server = express();
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({  extended: true }));
server.use('/', express.static(path.join(__dirname, 'public')));
server.use('/save', (req, res) => {

  console.log('req.body', JSON.stringify(req.body));
  const json = JSON.stringify(req.body, null, 2);
  const string_to_write = `import { Layer } from './layer';

export const initial_overlay: Layer = ${json};
`;

  console.log(string_to_write);
  fs.writeFileSync('src/initial_overlay.ts', string_to_write, 'utf8');
  res.send(JSON.stringify('ok'));
});

const PORT = 3000;
server.listen(PORT, 'localhost', () => {
  console.log(`listening on port ${PORT}...`);
});
