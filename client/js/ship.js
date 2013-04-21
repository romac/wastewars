
var Crafty = require('./lib/crafty');

require( './bounded' );

Crafty.c('Ship', {
  name: 'Ship',
  init: function() {
    this.requires('Actor, Color, Collision');
    this.attr({
      w: 10,
      h: 20,
      x: 100,
      y: 100,
      damages: 10,
      curAngle: 0
    });
    this.color('white');

    this.bind('StartShooting', this._shoot);
    this.bind('HitBounds', this.stopMovement);
  },

  serialize: function() {
    return {
      x: this.x,
      y: this.y,
      curAngle: this.curAngle,
      health: this.health
    }
  },

  _shoot: function()
  {
    if(!this.isShooting) {
      return;
    }
    this.shoot(this.getAngle(), 5);
    this.timeout(this._shoot, 80);
  }
} );
