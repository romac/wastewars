
var Crafty = require('./lib/crafty');

require( './bounded' );
require( './mouseshooter' );
var throttle = require('./lib/throttle').throttle;

Crafty.c('Ship', {
  name: 'Ship',
  init: function() {
    this.requires('Actor, Bounded, MouseShooter, Fourway, MouseFace, Color, Collision');
    this.fourway(4);
    this.attr({
      w: 10,
      h: 20,
      x: 100,
      y: 100,
      damages: 10,
      curAngle: 0
    });
    this.origin('center');
    this.color('white');
    this.stopOnSolid();
    this.MouseFace({x: 0, y: 0});

    this.bind('MouseMoved', function(e) {
      this.origin('center');
      this.curAngle = e.grad + 90;
      this.rotation = this.curAngle;
    });

    this.bind('StartShooting', this._shoot);
    this.bind('HitBounds', this.stopMovement);
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
