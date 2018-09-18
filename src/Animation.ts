import * as _ from 'underscore';
import { Layer } from './Chunk';
import { FULL_IMPETUS } from './constants';
import { vplus, vscale } from './util';

export function Animation() { }
Animation.prototype.apply = function(state, t) { }
Animation.prototype.tileHook = function(map, t) { return new Layer(); }

export function PlayerAnimation(props) {
  this.pos = { x: 0, y: 0 };
  this.animState = 'player';
  this.impetus = FULL_IMPETUS;
  _.extend(this, props);
}

PlayerAnimation.prototype = new Animation();

PlayerAnimation.prototype.apply = function(state, t) {
  state.player =
    new Player({
      pos: vplus(vscale(state.player.pos, 1 - t), vscale(this.pos, t)),
      animState: this.animState,
      flipState: this.flipState,
      impetus: this.impetus
    });
}

export function ViewPortAnimation(dpos, props) {
  this.dpos = dpos;
  _.extend(this, props);
}

ViewPortAnimation.prototype = new Animation();

ViewPortAnimation.prototype.apply = function(state, t) {
  state.viewPort = vplus(state.viewPort, vscale(this.dpos, t));
}

export function MeltAnimation(pos, tile) { this.pos = pos; }
MeltAnimation.prototype = new Animation();

MeltAnimation.prototype.tileHook = function(map, t) {
  var rv = new Layer();
  rv.putTile(this.pos, t > 0.5 ? 'empty' : 'broken_box');
  return rv;
}

export function Player(props) {
  this.animState = 'player';
  this.flipState = false;
  this.pos = { x: 0, y: 0 };
  this.impetus = FULL_IMPETUS;
  _.extend(this, props);
}

Player.prototype.getAnimState = function() {
  return this.animState;
}

Player.prototype.getFlipState = function() {
  return this.flipState;
}
