/**
 * Downloads everything the game needs to draw and play sound, keeping
 * track of how far along it is so the title screen can show a progress
 * bar.
 *
 * Loading starts as soon as this module is evaluated, rather than when
 * a component mounts, so that the requests go out on the connection
 * that just delivered the bundle. A request issued later, after the
 * player has spent a few seconds on the title screen, needs a fresh
 * connection, which is slow on a lossy link no matter how small the
 * file is.
 */

import { useEffect, useState } from 'react';

export type Assets = {
  spriteImg: HTMLImageElement,
  gearUrl: string,
  music: HTMLAudioElement,
};

export type LoadState =
  | { t: 'loading', loaded: number, total: number }
  | { t: 'done', assets: Assets }
  | { t: 'error', msg: string }
  ;

/**
 * `approxBytes` is only used to keep the progress bar sensible before a
 * response's Content-Length is known, or if it has none at all. Being
 * out of date makes the bar lumpy and nothing worse.
 */
const SPECS = [
  { url: 'assets/sprite.png', approxBytes: 16_000 },
  { url: 'assets/gear.svg', approxBytes: 5_000 },
  { url: 'assets/theme-from-time-badger.mp3', approxBytes: 1_230_000 },
];

type Bytes = { loaded: number, total: number | undefined };

function overall(bytes: Bytes[]): { loaded: number, total: number } {
  let loaded = 0;
  let total = 0;
  bytes.forEach((b, i) => {
    loaded += b.loaded;
    total += Math.max(b.total ?? SPECS[i].approxBytes, b.loaded);
  });
  return { loaded, total };
}

async function fetchBlob(url: string, report: (b: Bytes) => void): Promise<Blob> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`${url}: ${resp.status} ${resp.statusText}`);
  }
  const type = resp.headers.get('content-type') ?? '';
  const lengthHeader = resp.headers.get('content-length');
  const total = lengthHeader == null ? undefined : parseInt(lengthHeader);

  if (resp.body == null) {
    const blob = await resp.blob();
    report({ loaded: blob.size, total: blob.size });
    return blob;
  }

  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  report({ loaded, total });
  for (; ;) {
    const { done, value } = await reader.read();
    if (done)
      break;
    chunks.push(value);
    loaded += value.length;
    report({ loaded, total });
  }
  report({ loaded, total: loaded });
  return new Blob(chunks, { type });
}

/**
 * The object url is deliberately not revoked; the element goes on
 * using it for as long as the game runs.
 */
function imageOfBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('could not decode image'));
    img.src = URL.createObjectURL(blob);
  });
}

let state: LoadState = { t: 'loading', loaded: 0, total: 0 };
const listeners = new Set<(s: LoadState) => void>();

function setState(s: LoadState): void {
  state = s;
  listeners.forEach(l => l(s));
}

export function getLoadState(): LoadState {
  return state;
}

let inFlight = false;

/**
 * Identifies the current attempt. Requests from an abandoned attempt
 * can still be in flight during a retry, and we don't want their
 * progress reports fighting with the new attempt's.
 */
let generation = 0;

/** Starts downloading, or restarts after a failure. */
export function loadAssets(): void {
  if (inFlight)
    return;
  inFlight = true;
  generation++;
  const attempt = generation;
  const current = () => attempt == generation;

  const bytes: Bytes[] = SPECS.map(() => ({ loaded: 0, total: undefined }));
  setState({ t: 'loading', ...overall(bytes) });

  Promise.all(SPECS.map((spec, i) => fetchBlob(spec.url, b => {
    bytes[i] = b;
    if (current() && state.t == 'loading') {
      setState({ t: 'loading', ...overall(bytes) });
    }
  })))
    .then(async ([spriteBlob, gearBlob, musicBlob]) => {
      const assets: Assets = {
        spriteImg: await imageOfBlob(spriteBlob),
        gearUrl: URL.createObjectURL(gearBlob),
        music: new Audio(URL.createObjectURL(musicBlob)),
      };
      if (current()) {
        setState({ t: 'done', assets });
      }
    })
    .catch(e => {
      console.error(e);
      if (current()) {
        setState({ t: 'error', msg: e instanceof Error ? e.message : `${e}` });
      }
    })
    .then(() => {
      if (current()) {
        inFlight = false;
      }
    });
}

export function useLoadState(): LoadState {
  const [s, setS] = useState(getLoadState());
  useEffect(() => {
    setS(getLoadState()); // in case it changed before we subscribed
    listeners.add(setS);
    return () => { listeners.delete(setS); };
  }, []);
  return s;
}
