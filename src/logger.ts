export const DEBUG = {
  chatty: false,
  globals: false,
  mouse: false,
  keys: false,
  datgui: false,
  devicePixelRatio: false,
  networkRequest: false,
  error: true,
};

export function logger(level: keyof (typeof DEBUG), ...args: any[]) {
  if (DEBUG[level]) {
    console.log(...args);
  }
}
