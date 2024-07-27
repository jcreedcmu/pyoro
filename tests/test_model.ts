import { FULL_IMPETUS } from '../src/constants';
import { bootstrapDynamicLayer, boxTile, complexOfSimple, dynamicOfComplex, dynamicOfSimple, emptyTile, mapPointMap, PointMap } from '../src/layer';
import { _putTileInGameStateInitOverlay, animateMoveGame, getOverlayForSave, renderGameAnims, tileOfGameState } from '../src/model';
import { GameState, init_player } from '../src/state';
import { ComplexTile, Move, Tile } from '../src/types';

// XXX Deprecate
function basicLayer(): PointMap<Tile> {
  return {
    'tiles':
      { '0,1': 'up_box' }
  }
};

function complexLayer(): PointMap<ComplexTile> {
  return {
    'tiles':
      { '0,1': complexOfSimple('up_box') }
  }
};

// XXX Deprecate
function basicState(layer: PointMap<Tile>): GameState {
  return {
    initOverlay: bootstrapDynamicLayer(layer),
    inventory: { teal_fruit: undefined, },
    lastSave: { x: 0, y: 0 },
    overlay: bootstrapDynamicLayer(layer),
    player: init_player,
    time: 0,
  };
}

function complexState(layer: PointMap<ComplexTile>): GameState {
  return {
    initOverlay: mapPointMap(layer, dynamicOfComplex),
    inventory: { teal_fruit: undefined, },
    lastSave: { x: 0, y: 0 },
    overlay: mapPointMap(layer, dynamicOfComplex),
    player: init_player,
    time: 0,
  };
}

function executeMove(s: GameState, move: Move): GameState {
  return renderGameAnims(animateMoveGame(s, move), 'complete', s);
}

describe('State', () => {
  it('should allow jumping up', () => {

    let m = complexState(complexLayer());
    m = executeMove(m, 'up');
    const player = m.player;
    expect(player.animState).toBe("player_rise");
    expect(player.flipState).toBe('right');
    expect(player.pos).toEqual({ x: 0, y: -1 });
    expect(player.impetus).toBe(FULL_IMPETUS - 1);
  });

  it('should prevent jumping straight up into boxes', () => {
    const layer = complexLayer();
    layer.tiles['0,-1'] = boxTile();
    let m = complexState(layer);
    m = executeMove(m, 'up');

    const player = m.player;
    expect(player.animState).toBe('player');
    expect(player.flipState).toBe('right');
    expect(player.pos).toEqual({ x: 0, y: 0 });
    expect(player.impetus).toBe(FULL_IMPETUS);
  });

  it('should allow running over small gaps', () => {
    const layer = basicLayer();
    layer.tiles['-2,1'] = 'up_box';
    let m = basicState(layer);
    m = executeMove(m, 'left');
    {
      const player = m.player;
      expect(player.animState).toBe("player_fall");
      expect(player.flipState).toBe('left');
      expect(player.pos).toEqual({ x: -1, y: 0 });
      expect(player.impetus).toBe(0);
    }
    m = executeMove(m, 'left');
    {
      const player = m.player;
      expect(player.animState).toBe("player");
      expect(player.flipState).toBe('left');
      expect(player.pos).toEqual({ x: -2, y: 0 });
      expect(player.impetus).toBe(FULL_IMPETUS);
    }
  });

  it('should disallow narrow diagonal moves', () => {
    const layer = complexLayer();
    layer.tiles['-1,-2'] = boxTile();
    layer.tiles['0,-3'] = boxTile();
    let m = complexState(layer);
    m = executeMove(m, 'up');
    {
      const player = m.player;
      expect(player.animState).toBe("player_rise");
      expect(player.flipState).toBe('right');
      expect(player.pos).toEqual({ x: 0, y: -1 });
      expect(player.impetus).toBe(FULL_IMPETUS - 1);
    }
    m = executeMove(m, 'up');

    {
      const player = m.player;
      expect(player.animState).toBe("player_rise");
      expect(player.flipState).toBe('right');
      expect(player.pos).toEqual({ x: 0, y: -2 });
      expect(player.impetus).toBe(FULL_IMPETUS - 2);
    }
    m = executeMove(m, 'up-left');

    {
      const player = m.player;
      expect(player.animState).toBe("player_fall");
      expect(player.flipState).toBe('left');
      expect(player.pos).toEqual({ x: 0, y: -1 });
      expect(player.impetus).toBe(0);
    }
  });

  it('should disallow horizontally constrained diagonal moves', () => {
    const layer = complexLayer();
    layer.tiles['0,-1'] = boxTile();
    let m = complexState(layer);
    m = executeMove(m, 'up-left');

    const player = m.player;
    expect(player.animState).toBe("player_fall");
    expect(player.flipState).toBe('left');
    expect(player.pos).toEqual({ x: -1, y: 0 });
    expect(player.impetus).toBe(0);

  });

  it('should allow jumping and breaking ice bricks if there is enough impetus', () => {
    const layer = basicLayer();
    layer.tiles['0,' + (-FULL_IMPETUS)] = 'fragile_box';
    let m = basicState(layer);

    for (let i = 0; i < FULL_IMPETUS; i++)
      m = executeMove(m, 'up');

    expect(tileOfGameState(m, { x: 0, y: -FULL_IMPETUS })).toEqual(complexOfSimple('empty'));
  });

  it('should not breaking ice bricks if there is not enough impetus', () => {
    const layer = basicLayer();
    layer.tiles['0,' + (-FULL_IMPETUS - 1)] = 'fragile_box';
    let m = basicState(layer);

    for (let i = 0; i < FULL_IMPETUS + 1; i++)
      m = executeMove(m, 'up');

    expect(tileOfGameState(m, { x: 0, y: -FULL_IMPETUS - 1 })).toEqual(complexOfSimple('fragile_box'));
  });

});

describe('getOverlayForSave', () => {
  it('should filter out empties', () => {
    let s = basicState(basicLayer());
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 1 }, dynamicOfComplex(emptyTile())); // delete the existing box
    expect(getOverlayForSave(s)).toEqual({ tiles: {} });
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 2 }, dynamicOfComplex(boxTile())); // add some box
    s = _putTileInGameStateInitOverlay(s, { x: 0, y: 0 }, dynamicOfComplex(emptyTile())); // add another spurious empty
    expect(getOverlayForSave(s)).toEqual({ tiles: { '0,2': dynamicOfComplex(boxTile()) } });
  });
});
