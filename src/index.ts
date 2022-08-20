import * as dat from 'dat.gui';
import { commandBindings, moveBindings } from './bindings';
import { DEBUG, FRAME_DURATION_MS, guiData } from './constants';
import { key, keyFromCode } from './key';
import { animator_for_move } from './model';
import { Action, Dispatch, Effect, reduce } from './reduce';
import { init_state, State } from './state';
import { Move, Tile } from './types';
import { imgProm } from './util';
import { drawView, FView, initView, resizeView, wpoint_of_canvas } from './view';

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

class App {
  c: HTMLCanvasElement;
  d: CanvasRenderingContext2D;
  spriteImg: HTMLImageElement | null = null;
  state: State = init_state;

  constructor() {
    this.c = document.getElementById('c') as HTMLCanvasElement;
    this.d = this.c.getContext('2d') as CanvasRenderingContext2D;
  }

  getFview(): FView | null {
    if (this.state.iface.vd == null) return null;
    if (this.spriteImg == null) return null;
    return { d: this.d, vd: this.state.iface.vd, spriteImg: this.spriteImg };
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
        effects.forEach(e => this.doEffect(dispatch, e));
      }
    }

    initView(dispatch);
    this.init_mouse(dispatch);

    const s = await imgProm('assets/sprite.png');
    this.spriteImg = s;
    this.resize(dispatch);
  }

  // XXX Eventually want to move this out of App once I'm confident I
  // don't need anything else in App's context.
  doEffect(dispatch: Dispatch, e: Effect) {
    switch (e.t) {
      case 'scheduleFrame':
        setTimeout(() => { dispatch({ t: 'nextFrame' }); }, FRAME_DURATION_MS);
        break;
    }
  }

  resize(dispatch: (a: Action) => void): void {
    dispatch({ t: 'resize', vd: resizeView(this.c) });
  }

  // XXX doesn't get called right now
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

  init_mouse(dispatch: Dispatch): void {
    const c = this.c;
    c.onmousedown = (e: MouseEvent) => {
      const fv = this.getFview();
      if (fv == null)
        return;
      const wpoint = wpoint_of_canvas(fv, { x: e.clientX, y: e.clientY }, this.state);
      if (DEBUG.mouse) {
        console.log(wpoint);
      }
      dispatch({ t: 'click', wpoint });
    };
  }
}
