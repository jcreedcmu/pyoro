import * as dat from 'dat.gui';
import { DEBUG, FRAME_DURATION_MS, guiData } from './constants';
import { Action, Dispatch, Effect, reduce } from './reduce';
import { init_state, State } from './state';
import { Tile } from './types';
import { imgProm } from './util';
import { drawView, FView, initView, resizeView } from './view';

async function onload() {
  const app = new App;
  await app.run();

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

window.addEventListener('load', onload);

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

class App {
  richState: RichState | null = null;
  state: State = init_state;

  constructor() {
  }

  getFview(): FView | null {
    if (this.state.iface.vd == null) return null;
    if (this.richState == null) return null;
    return { d: this.richState.d, vd: this.state.iface.vd, spriteImg: this.richState.spriteImg };
  }

  async run(): Promise<void> {
    if (DEBUG.globals) {
      (window as any)['_app'] = this;
    }

    window.addEventListener('resize', () => this.resize(dispatch));

    const dispatch = (a: Action) => {
      const { s: newState, effects } = reduce(this.state, a);
      if (this.state != newState) {
        this.state = newState
        const fv = this.getFview();
        if (fv !== null) {
          drawView(fv, newState);
        }
      }
      if (effects) {
        effects.forEach(e => doEffect(dispatch, e));
      }
    }

    initView(dispatch);

    const spriteImg = await imgProm('assets/sprite.png');
    const c = document.getElementById('c') as HTMLCanvasElement;
    const d = c.getContext('2d') as CanvasRenderingContext2D;
    this.richState = { spriteImg, c, d };
    this.resize(dispatch);
  }



  resize(dispatch: (a: Action) => void): void {
    dispatch({ t: 'resize', vd: resizeView(this.richState!.c) });
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

}
