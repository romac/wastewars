
var Crafty = require('./lib/crafty');

require( './bounded' );

Crafty.c('Ship', {
  name: 'Ship',
  init: function() {
    this.requires('Actor, Color, Shooter, Collision');
    this.attr({
      w: 10,
      h: 20,
      x: 100,
      y: 100,
      damages: 10,
      curAngle: 0
    });
    this.color('white');

    this.bind('Change', function(props) {
      if(props.isShooting) {
        this.trigger('StartShooting');
      }
    });
    this._shoot();
    this.bind('HitBounds', this.stopMovement);
  },

  serialize: function() {
    return {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      _dirAngle: this._dirAngle,
      health: this.health,
      isShooting: this.isShooting,
      origin: this.origin
    };
  },

  _shoot: function()
  {
    this.timeout(this._shoot, 80);
    if(!this.isShooting) {
      return;
    }
    this.shoot(this._dirAngle + Math.PI, 5);
  }
} );
