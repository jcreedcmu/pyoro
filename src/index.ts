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

async function run(): Promise<void> {
  initView();
}
