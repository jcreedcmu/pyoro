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


async function run(): Promise<void> {
  initView();
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
