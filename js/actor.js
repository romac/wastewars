
var Crafty = require('./lib/crafty');

Crafty.c('Actor', {
  init: function() {
    this.requires('2D, Canvas');
  },
  stopOnSolid: function() {
    this.onHit('Solid', this.stopMovement);
    return this;
  },
  stopMovement: function() {
    this._speed = 0;
    if (this._movement) {
      this.x -= this._movement.x;
      this.y -= this._movement.y;
    }
  }
} );