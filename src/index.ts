import * as dat from 'dat.gui';
import { DEBUG, FRAME_DURATION_MS, guiData } from './constants';
import { Action, Dispatch, Effect, reduce } from './reduce';
import { init_state, State } from './state';
import { Tile } from './types';
import { imgProm } from './util';
import { drawView, FView, initView, resizeView } from './view';

window.addEventListener('load', onload);
async function onload() {
  await run();

  if (DEBUG.datgui) {
    const gui = new dat.GUI();
    const colorCtr = gui.addColor(guiData, 'background_color');
    const stageCtr = gui.addColor(guiData, 'stage_color');
    colorCtr.onChange((value: string) => {
      guiData.background_color = value;
      //      app.redraw(); // XXX doesn't work now
    });
    stageCtr.onChange((value: string) => {
      guiData.stage_color = value;
      //    app.redraw(); // XXX doesn't work now
    });
  }
}

function doEffect(dispatch: Dispatch, e: Effect) {
  switch (e.t) {
    case 'scheduleFrame':
      setTimeout(() => { dispatch({ t: 'nextFrame' }); }, FRAME_DURATION_MS);
      break;
  }
}

type RichState = {
  c: HTMLCanvasElement;
  d: CanvasRenderingContext2D;
  spriteImg: HTMLImageElement;
};

type Blob = {
  richState: RichState | null;
  state: State
}

const blob: Blob = {
  richState: null,
  state: init_state,
}

function getFview(): FView | null {
  if (blob.state.iface.vd == null) return null;
  if (blob.richState == null) return null;
  return { d: blob.richState.d, vd: blob.state.iface.vd, spriteImg: blob.richState.spriteImg };
}

function dispatch(a: Action): void {
  const { state: newState, effects } = reduce(blob.state, a);
  if (blob.state != newState) {
    blob.state = newState
    const fv = getFview();
    if (fv !== null) {
      drawView(fv, newState);
    }
  }
  if (effects) {
    effects.forEach(e => doEffect(dispatch, e));
  }
}

async function run(): Promise<void> {
  if (DEBUG.globals) {
    (window as any)['_app'] = blob;
  }

  window.addEventListener('resize', () => dispatch({ t: 'resize', vd: resizeView(blob.richState!.c) }));

  initView(dispatch);

  const spriteImg = await imgProm('assets/sprite.png');
  const c = document.getElementById('c') as HTMLCanvasElement;
  const d = c.getContext('2d') as CanvasRenderingContext2D;
  blob.richState = { spriteImg, c, d };
  dispatch({ t: 'resize', vd: resizeView(blob.richState!.c) });
}


// XXX doesn't get called right now
/*
  drag_world(dispatch: Dispatch, tileToPut: Tile): void {
    const c = this.c;

    const mouseUp = (e: MouseEvent) => {
      c.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
    }
    const mouseMove = (e: MouseEvent) => {
      const fv = this.getFview();
      if (fv == null)
        return;
      const wpoint = wpoint_of_canvas(fv, { x: e.clientX, y: e.clientY }, this.state);
      if (wpoint.t == 'World')
        dispatch({ t: 'putTile', p: wpoint.p, tile: tileToPut });
      c.addEventListener('mousemove', mouseMove);
      document.addEventListener('mouseup', mouseUp);
    }
  }
*/
