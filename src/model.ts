import { produce } from 'immer';
import { Animation, Animator, applyGameAnimation, applyIfaceAnimation, duration } from './animation';
import { COMBO_THRESHOLD, editTiles, NUM_TILES, PLAYER_WEIGHT, rotateTile, tools } from './constants';
import { expandBoundRect, getBoundRect, getCurrentLevel, getCurrentLevelData, getInitOverlay, getMobileById, getOverlay, setWorldFromView } from './game-state-access';
import { DynamicLayer, dynamicOfTile, dynamicTileOfStack, emptyTile, isEmptyTile, LayerStack, pointMapEntries, putDynamicTile, removeDynamicTile, tileEq, tileOfStack } from './layer';
import { LevelData } from './level';
import { Point, vadd, vequal, vplus, vsub } from './lib/point';
import { apply, composen, inverse, translate } from './lib/se2';
import { Board, entityAtPoint, ForcedBlock, ForceType, getItem, isClimb, isDeadly, isSupportedInStateExcluding } from './model-utils';
import { entityTick, fblock, SupportData } from './physics';
import { Combo, GameState, IfaceState, MainState, ModifyPanelState, Player, ToolState } from "./state";
import { getCanvasFromView, getWorldFromView, getWorldFromViewTiles } from './transforms';
import { DynamicTile, Facing, MotiveMove, Move, PlayerSprite, Tile, Tool } from './types';
import { clamp, mapValues, max } from './util';
import { ViewData, WidgetPoint } from './view';
import { EntityId, EntityState, entityWeight, eqEntityId } from './entity';

function layerStackOfState(s: GameState): LayerStack {
  return {
    t: 'overlay',
    top: getOverlay(s),
    rest: { t: 'base', layer: getInitOverlay(s) }
  };
}

function boardOfState(s: GameState): Board {
  return {
    player: s.player,
    trc: {
      busState: getCurrentLevel(s).busState,
      layerStack: layerStackOfState(s),
      time: s.time,
      playerPos: s.player.pos,
      playerPrevPos: s.player.prevPos,
      boundRect: getBoundRect(s),
    }
  };
}

function motiveOfMove(move: MotiveMove): Point {
  switch (move) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
    case 'up-left': return { x: -1, y: -1 };
    case 'up-right': return { x: 1, y: -1 };
  }
}

// null means "don't change the flip state"
function get_flip_state(move: MotiveMove): Facing | null {
  switch (move) {
    case 'left':
    case 'up-left':
      return 'left';
    case 'right':
    case 'up-right':
      return 'right';
    case 'up':
    case 'down':
      return null;
  }
}

export function tileOfState(s: MainState, p: Point, viewIntent?: boolean): Tile {
  return tileOfGameState(s.game, p, viewIntent);
}

export function dynamicTileOfState(s: MainState, p: Point): DynamicTile {
  return dynamicTileOfGameState(s.game, p);
}

// XXX move to model-utils to reduce circularity?
export function tileOfGameState(s: GameState, p: Point, viewIntent?: boolean): Tile {
  const { player, trc } = boardOfState(s);
  return tileOfStack(trc.layerStack, p, trc, viewIntent);
}

export function dynamicTileOfGameState(s: GameState, p: Point): DynamicTile {
  const { player, trc } = boardOfState(s);
  return dynamicTileOfStack(trc.layerStack, p);
}

export function _putTileInGameStateInitOverlay(s: GameState, p: Point, t: DynamicTile): GameState {
  return produce(s, s => {
    putDynamicTile(getInitOverlay(s), p, t);
    removeDynamicTile(getOverlay(s), p);
    expandBoundRect(s, p);
  });
}

export function _putTileInInitOverlay(s: MainState, p: Point, t: DynamicTile): MainState {
  return produce(s, s => {
    s.game = _putTileInGameStateInitOverlay(s.game, p, t);
  });
}

function forceBlock(s: GameState, pos: Point, tile: Tile): Animation[] {
  switch (tile.t) {
    case 'fragile_box':
      return [{ t: 'MeltAnimation', pos }];
    case 'side_breakable':
      return [{ t: 'MeltAnimation', pos }];
    case 'coin_wall':
      if ((s.inventory.coin ?? 0) >= 1) {
        return [{ t: 'SpendCoinAnimation', pos }];
      }
      else {
        return [];
      }
    case 'bus_button':
      return [{ t: 'BusButtonToggleAnimation', bus: tile.bus }];
    case 'button_on': // fallthrough intentional
    case 'button_off':
      return [{ t: 'ButtonToggleAnimation', pos }];
    default: return [];
  }
}

function getDoorPassAnim(s: GameState, move: Move): Animation[] | undefined {
  const tileAt = tileOfGameState(s, s.player.pos);
  if (move == 'down' && tileAt.t == 'door') {
    const newLevel = tileAt.destinationLevel;
    const oldLevel = s.currentLevel;
    const destTiles = pointMapEntries(s.levels[newLevel].initOverlay);
    const reciprocalDoor = destTiles.find(({ loc, value }) => value.t == 'door' && value.destinationLevel == oldLevel);
    let newPosition;
    if (reciprocalDoor == undefined) {
      console.error(`couldn't find reciprocal door`);
      newPosition = { x: 0, y: 0 };
    }
    else {
      newPosition = reciprocalDoor.loc;
    }
    return [{ t: 'ChangeLevelAnimation', newLevel, oldLevel, newPosition }];
  }
  else
    return undefined;
}

// forceLocation is *relative* to the player.
function isBlockForceSuccess(player: Player, forceLocation: Point, forceTile: Tile): boolean {
  if (forceTile.t == 'side_breakable') {
    return player.combo != undefined
      && forceLocation.x != 0 && forceLocation.y == 0 // force is horizontal
      && player.combo.dir.x != 0 && player.combo.dir.y == 0 // motion is horizontal
      && player.combo.rep >= COMBO_THRESHOLD;
  }
  // By default, all forces work
  return true;
}

function getForceType(state: GameState, pos: Point): ForceType {
  const e = entityAtPoint(state, pos);
  if (e != undefined)
    return { t: 'entity', id: { t: 'mobileId', id: e.id } };
  return { t: 'tile', tile: tileOfGameState(state, pos) };
}


/**
 * This is the heart of computing what a move does.
 * @param state The state before the move
 * @param move The player's move
 * @returns A list of {@link Animation}s that result from the move.
 *
 * The animations we return here are concurrent
 * FUTURE: Maybe allow a DAG of animations related by causal
 * dependency. tom7 suggested this based on experience with Escape.
 */
export function animateMove(state: GameState, move: Move): Animation[] {
  const forcedBlocks: ForcedBlock[] = []
  const anims: Animation[] = [];

  const player = state.player;

  // If our move is a manual reset, or a forced reset because we died
  // on the last move, that should take precedence over other move
  // logic below.
  if (player.dead || move == 'reset') {
    return [{ t: 'ResetAnimation' }];
  }

  // If our move is to recenter the view on the player's position,
  // that should take precedence over other move logic below.
  if (move == 'recenter') {
    return [{ t: 'RecenterAnimation' }];
  }

  // If our move results in passage through a door, that should take
  // precedence over other move logic below.
  const doorPassAnim = getDoorPassAnim(state, move);
  if (doorPassAnim != undefined)
    return doorPassAnim;

  /* The position below our feet before movement */
  const belowBefore = vplus(player.pos, { x: 0, y: 1 });
  /* The tile in the position below our feet before movement */
  const tileBefore = tileOfGameState(state, belowBefore);
  /* Whether we were supported during the previous step */
  const supportedBefore = isSupportedInStateExcluding(state, player.pos, { t: 'player' }, PLAYER_WEIGHT);

  /* XXX Not totally convinced this is the right forced block logic. What if
  we're supported by ladder or water? */
  if (supportedBefore) {
    forcedBlocks.push(
      fblock(state, { pos: player.pos, impetus: { x: 0, y: 1 } }, { x: 0, y: 1 }, { x: 0, y: 0 })
    );
  }

  /* Whether we were in a "stable" state during the previous step */
  const stableBefore = supportedBefore || player.animState == 'player_wall'; // XXX is depending on anim_state fragile?

  function getRelSupport(rpos: Point): SupportData {
    return { rpos, forceType: getForceType(state, vadd(player.pos, rpos)) };
  }

  function getSupport(): SupportData | undefined {
    if (supportedBefore) return getRelSupport({ x: 0, y: 1 });
    if (player.animState == 'player_wall')
      return getRelSupport(player.flipState == 'left' ? { x: -1, y: 0 } : { x: 1, y: 0 });
  }

  const motive = motiveOfMove(move);
  const playerTickOutput = entityTick(state, {
    entity: { impetus: player.impetus, pos: player.pos },
    motive,
    support: getSupport()
  }, { t: 'player' });

  function flipStateOfMotive(motive: Point): Facing | null {
    if (motive.x < 0) return 'left';
    if (motive.x > 0) return 'right';
    return null;
  }

  const flipState = flipStateOfMotive(motive) || player.flipState;

  const nextPos = playerTickOutput.entity.pos;

  const entityNudges: { id: EntityId, impetus: Point }[] = [];
  playerTickOutput.forced.forEach(fb => {
    const pos = vplus(player.pos, fb.pos);
    switch (fb.forceType.t) {
      case 'tile':
        if (isBlockForceSuccess(player, fb.pos, tileOfGameState(state, pos)))
          anims.push(...forceBlock(state, pos, tileOfGameState(state, pos)));
        break;
      case 'entity':
        entityNudges.push({ id: fb.forceType.id, impetus: clamp(fb.force) });
        break;
    }
  });

  // XXX is there a more principled way of doing this?
  let stateForEntities = produce(state, s => {
    s.player.pos = playerTickOutput.entity.pos;
    s.player.impetus = playerTickOutput.entity.impetus;
  });

  getCurrentLevel(state).entities.forEach((entity) => {
    let motive = { x: 0, y: 0 };
    const nudge = entityNudges.find(({ id: idl }) => eqEntityId({ t: 'mobileId', id: entity.id }, idl));
    if (nudge != undefined) {
      motive = nudge.impetus;
    }
    const tout = entityTick(stateForEntities, {
      entity,
      motive,
      support: isSupportedInStateExcluding(stateForEntities, entity.pos, { t: 'mobileId', id: entity.id }, entityWeight(entity.etp)) ? getRelSupport({ x: 0, y: 1 }) : undefined,
    }, { t: 'mobileId', id: entity.id });
    anims.push({ t: 'EntityAnimation', id: entity.id, oldEntity: entity, newEntity: tout.entity });
    if (tout.posture == 'dead')
      anims.push({ t: 'EntityDeathAnimation', id: entity.id, oldEntity: entity });
  });

  // XXX should entity motion cause forced blocks? This seems a little
  // problematic as it would seem to cause convergence problems if
  // entities could force other entities in an uncontrolled way, but
  // maybe I'd like to let them force tiles.

  // I'm not sure how generally this will work, but it works for
  // predicting the next state of time-oscillating blocks.
  const nextTimeS = produce(state, s => { s.time++ });

  const tileAfter = tileOfGameState(nextTimeS, nextPos);
  const supportedAfter = isSupportedInStateExcluding(nextTimeS, nextPos, { t: 'player' }, PLAYER_WEIGHT);

  const dead = isDeadly(tileAfter) || playerTickOutput.posture == 'dead';

  let animState: PlayerSprite = 'player';
  if (playerTickOutput.posture == 'attachWall') {
    animState = 'player_wall';
  }
  else if (playerTickOutput.posture == 'crouch') {
    animState = 'player_crouch';
  }
  else {
    animState = supportedAfter ? 'player' : playerTickOutput.entity.impetus.y < 0 ? 'player_rise' : 'player_fall';
  }

  anims.push({ t: 'PlayerAnimation', pos: nextPos, animState, impetus: playerTickOutput.entity.impetus, flipState, dead });

  if (tileEq(tileAfter, { t: 'save_point' }))
    anims.push({ t: 'SavePointChangeAnimation', pos: nextPos });

  const item = getItem(tileAfter);
  if (item !== undefined)
    anims.push({ t: 'ItemGetAnimation', pos: nextPos, item });

  return anims;
}

/**
 * Suppose the player is moving to `p_in_world`. Return some appropriate animations
 * for sufficiently recentering the player in the viewport.
 */
export function animateViewPort(s: MainState, move: Move, p_in_world: Point | undefined): Animation[] {
  const anims: Animation[] = [];
  if (p_in_world !== undefined) {
    const p_in_viewTiles = apply(inverse(getWorldFromViewTiles(s.iface)), p_in_world);
    if (p_in_viewTiles.x >= NUM_TILES.x - 1)
      anims.push({ t: 'ViewPortAnimation', dpos_in_world: { x: 1, y: 0 } });
    if (p_in_viewTiles.x < 1)
      anims.push({ t: 'ViewPortAnimation', dpos_in_world: { x: -1, y: 0 } });
    if (p_in_viewTiles.y >= NUM_TILES.y - 1)
      anims.push({ t: 'ViewPortAnimation', dpos_in_world: { x: 0, y: 1 } });
    if (p_in_viewTiles.y < 1)
      anims.push({ t: 'ViewPortAnimation', dpos_in_world: { x: 0, y: -1 } });
  }
  return anims;
}

function hasNextPos(anim: Animation): Point | undefined {
  switch (anim.t) {
    case 'PlayerAnimation': return anim.pos;
    case 'ItemGetAnimation': return anim.pos;
    case 'SavePointChangeAnimation': return anim.pos;
    default:
      return undefined;
  }
}

export function renderGameAnims(anims: Animation[], fr: number | 'complete', s: GameState): GameState {
  anims.forEach(anim => {
    s = applyGameAnimation(anim, s, fr);
  });
  return s;
}

export function renderIfaceAnims(anims: Animation[], fr: number | 'complete', s: MainState): IfaceState {
  anims.forEach(anim => {
    s = produce(s, s => { s.iface = applyIfaceAnimation(anim, s, fr) });
  });
  return s.iface;
}

export function animator_for_move(s: MainState, move: Move): Animator {
  const animsGame = animateMove(s.game, move);
  const nextPos = animsGame.map(hasNextPos).find(x => x !== undefined);
  const animsViewport = animateViewPort(s, move, nextPos);
  const dur = max([...animsGame.map(a => duration(a)), ...animsViewport.map(a => duration(a))]);

  return {
    dur,
    anims: [{ t: 'GenericMoveAnimation' }, ...animsGame, ...animsViewport],
  }
}

// Just used for editing purposes, whether clicking on the "same" tile
// should erase instead of overwriting.
function similarStaticTiles(ct1: Tile, ct2: Tile): boolean {
  switch (ct1.t) {
    case 'spike': return ct2.t == 'spike';
    default: return ct1.t == ct2.t;
  }
}

// Just used for editing purposes, whether clicking on the "same" tile
// should erase instead of overwriting.
function similarTiles(ct1: DynamicTile, ct2: DynamicTile): boolean {
  switch (ct1.t) {
    case 'static': return ct2.t == 'static' && similarStaticTiles(ct1.tile, ct2.tile);
    case 'timed': return ct2.t == 'timed';
    case 'buttoned': return ct2.t == 'buttoned';
    case 'bus_button': return ct2.t == 'bus_button' && ct1.bus == ct2.bus;
    case 'bus_block': return ct2.t == 'bus_block' && ct1.bus == ct2.bus;
    case 'door': return ct2.t == 'door';
    case 'motion': return ct2.t == 'motion' && ct1.direction == ct2.direction;
  }
}

function defaultDynamicTileToPut(tile: Tile): DynamicTile {
  switch (tile.t) {
    case 'timed_wall': return { t: 'timed', phase: 0, on_for: 1, off_for: 1 };
    case 'buttoned_wall': return { t: 'buttoned', button_source: { x: -1, y: 0 } }; // FIXME, this is a default for testing before I can edit
    case 'bus_block': return { t: 'bus_block', bus: tile.bus, invert: false };
    case 'bus_button': return { t: 'bus_button', bus: tile.bus };
    case 'door': return { t: 'door', destinationLevel: tile.destinationLevel };
    case 'motion_block': return { t: 'motion', direction: tile.direction };
    default: return dynamicOfTile(tile);
  }
}

function determineTileToPut(s: MainState, worldPoint: Point): DynamicTile {
  const newTile = defaultDynamicTileToPut(rotateTile(editTiles[s.iface.editPageIx][s.iface.editTileIx], s.iface.editTileRotation));

  return similarTiles(dynamicTileOfState(s, worldPoint), newTile) ? dynamicOfTile(emptyTile()) : newTile;
}

export function modifyPanelStateForTile(s: MainState, worldPoint: Point): ModifyPanelState {
  const ct = dynamicTileOfState(s, worldPoint);
  switch (ct.t) {
    case 'static': return { t: 'none' };
    case 'bus_button': return { t: 'none' };
    case 'bus_block': return { t: 'none' };
    case 'motion': return { t: 'none' };
    case 'timed': return {
      t: 'timed',
      off_for: ct.off_for + '',
      on_for: ct.on_for + '',
      phase: ct.phase + '',
    };
    case 'buttoned': return {
      t: 'buttoned',
      x: ct.button_source.x + '',
      y: ct.button_source.y + '',
    }
    case 'door': return {
      t: 'door',
      destinationLevel: ct.destinationLevel,
    }
  }
}

export function handle_world_mousedown(s: MainState, rawPoint: Point, worldPoint: Point): MainState {
  const toolState = s.iface.toolState;
  switch (toolState.t) {
    case 'pencil_tool':
      const tileToPut = determineTileToPut(s, worldPoint);
      return produce(_putTileInInitOverlay(s, worldPoint, tileToPut), s => { s.iface.mouse = { t: 'tileDrag', tile: tileToPut }; });
    case 'hand_tool':
      return produce(s, s => { s.iface.mouse = { t: 'panDrag', init: rawPoint, initWorldFromView: getWorldFromView(s.iface) } });
    case 'modify_tool':
      return produce(s, s => {
        s.iface.toolState = { t: 'modify_tool', modifyCell: worldPoint, panelState: modifyPanelStateForTile(s, worldPoint) };
      });
    case 'play_tool':
      return s;
    case 'test_tool':
      return s;
  }
}

export function handle_world_drag(s: MainState, vd: ViewData, p_in_canvas: Point, widgetPoint: WidgetPoint): MainState {
  const mouse = s.iface.mouse;
  switch (mouse.t) {
    case 'tileDrag':
      if (widgetPoint.t == 'World') {
        return _putTileInInitOverlay(s, widgetPoint.p_in_world, mouse.tile);
      }
      else {
        return s;
      }
    case 'panDrag':
      const canvas_from_view = getCanvasFromView(vd);
      const view_from_canvas = inverse(canvas_from_view);
      const canvas_from_new_canvas = translate(vsub(mouse.init, p_in_canvas));
      const newIface = setWorldFromView(s.iface, composen(
        mouse.initWorldFromView,
        view_from_canvas,
        canvas_from_new_canvas,
        canvas_from_view,
      ));
      return produce(s, s => {
        s.iface = newIface;
      });
    default:
      console.error(`inconsistent mouse state: ` +
        `processing drag event but mouse stat isn't "drag". ` +
        `Not sure how this happened?`);
      return s;
  }
}

function initialToolState(t: Tool): ToolState {
  switch (t) {
    case 'pencil_tool': return { t: 'pencil_tool' };
    case 'hand_tool': return { t: 'hand_tool' };
    case 'modify_tool': return { t: 'modify_tool', modifyCell: null, panelState: { t: 'none' } };
    case 'play_tool': return { t: 'play_tool' };
    case 'test_tool': return { t: 'test_tool', testToolState: { testIx: 0, testTime: 0 } };
  }
}

export function handle_toolbar_mousedown(s: MainState, p: Point, buttons: number): MainState {
  const editPage = editTiles[s.iface.editPageIx];
  if (p.y == 0) {
    if (buttons == 2) { // right mouse button means toggle bus state
      const tile = editPage[p.x];
      if (tile.t == 'bus_block' || tile.t == 'bus_button') {
        const bus = tile.bus;
        const oldBusState = getCurrentLevelData(s.game).busState[bus];
        return produce(s, s => {
          getCurrentLevelData(s.game).busState[bus] = !oldBusState;
        });
      }
      else
        return s;
    }
    else {
      return produce(s, s => {
        if (p.x < editPage.length && p.x >= 0)
          s.iface.editTileIx = p.x;
      });
    }
  }
  else if (p.y == 1) {
    return produce(s, s => {
      if (p.x < tools.length && p.x >= 0)
        s.iface.toolState = initialToolState(tools[p.x]);
    });
  }
  else {
    return s;
  }
}

export function show_empty_tile_override(s: MainState): boolean {
  return !s.iface.keysDown['KeyN']; // XXX Debugging
}

export function getAllLevels(s: GameState): Record<string, LevelData> {
  return mapValues(s.levels, ld => {
    const layer: DynamicLayer = { tiles: {} };
    for (const [k, v] of Object.entries(ld.initOverlay.tiles)) {
      if (!isEmptyTile(v))
        layer.tiles[k] = v;
    }
    return {
      initOverlay: layer,
      boundRect: ld.boundRect,
      busState: ld.busState,
    };
  });
}

export function computeCombo(c: Combo, motion: Point): Combo {
  if (c == undefined) {
    return { t: 'combo', dir: motion, rep: 1 };
  }
  if (vequal(c.dir, motion)) {
    return { t: 'combo', dir: motion, rep: c.rep + 1 };
  }
  else {
    return { t: 'combo', dir: motion, rep: 1 };
  }
}
