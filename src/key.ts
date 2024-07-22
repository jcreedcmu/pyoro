export type NameTable = { [k: number]: string };

export const table: NameTable = {
  188: ',',
  190: '.',
  192: '`',
  189: '-',
  187: '=',
  219: '[',
  220: '\\',
  221: ']',
  9: '<tab>',
  32: '<space>',
  186: ';',
  222: "'",
  191: '/',
  13: '<return>',
  45: 'KP0',
  35: 'KP1',
  40: 'KP2',
  34: 'KP3',
  37: 'KP4',
  12: 'KP5',
  39: 'KP6',
  36: 'KP7',
  38: 'KP8',
  33: 'KP9',
};

export const codeTable: { [k: string]: string } = {
  Comma: ',',
  Period: '.',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  Backslash: '\\',
  BracketRight: ']',
  Tab: '<tab>',
  Space: '<space>',
  Semicolon: ';',
  Quote: "'",
  Slash: '/',
  Enter: '<return>',
  Numpad0: 'KP0',
  Numpad1: 'KP1',
  Numpad2: 'KP2',
  Numpad3: 'KP3',
  Numpad4: 'KP4',
  Numpad5: 'KP5',
  Numpad6: 'KP6',
  Numpad7: 'KP7',
  Numpad8: 'KP8',
  Numpad9: 'KP9',
  ArrowUp: 'up',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'down',
};

export const shift_table: { [k: string]: string } = {
  ',': '<',
  '.': '>',
  '`': '~',
  '-': '_',
  '=': '+',
  '[': '{',
  '\\': '|',
  ']': '}',
  ';': ':',
  "'": '\'',
  '/': '?',
  '1': '!',
  '2': '@',
  '3': '#',
  '4': '$',
  '5': '%',
  '6': '^',
  '7': '&',
  '8': '*',
  '9': '(',
  '0': ')',
};

export function key(e: KeyboardEvent) {
  var base = '[' + e.keyCode + ']';
  if ((e.keyCode > 64 && e.keyCode <= 64 + 26)
    || (e.keyCode >= 48 && e.keyCode <= 48 + 9)) {
    base = String.fromCharCode(e.keyCode).toLowerCase();
  }
  if (table[e.keyCode]) {
    base = table[e.keyCode];
  }
  if (e.shiftKey) {
    if (shift_table[base]) {
      base = shift_table[base];
    }
    else {
      base = 'S-' + base;
    }
  }
  if (e.ctrlKey)
    base = 'C-' + base;
  if (e.altKey)
    base = 'A-' + base;
  if (e.metaKey)
    base = 'M-' + base;
  return base;
}

export function keyFromCode(e: KeyboardEvent) {
  const code = e.code;
  var base = '[' + code + ']';
  let m;
  if (m = code.match(/Key([A-Z])/)) {
    base = m[1].toLowerCase();
  }
  else if (m = code.match(/Digit([0-9])/)) {
    base = m[1]
  }
  else if (m = codeTable[code]) {
    base = m;
  }
  if (e.shiftKey) {
    if (shift_table[base]) {
      base = shift_table[base];
    }
    else {
      base = 'S-' + base;
    }
  }
  if (e.ctrlKey)
    base = 'C-' + base;
  if (e.altKey)
    base = 'A-' + base;
  if (e.metaKey)
    base = 'M-' + base;
  return base;
}
