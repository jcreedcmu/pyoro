import * as dat from 'dat.gui';
import { guiData } from './constants';
import { DEBUG } from './logger';
import { initView } from './view';

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
