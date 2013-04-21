
var Crafty = require('./lib/crafty');

require( './bounded' );

Crafty.c('Ship', {
  name: 'Ship',
  init: function() {
    this.requires('Actor, Shooter, Collision, PlayerSprite');
    this.attr({
      w: 24,
      h: 24,
      x: 100,
      y: 100,
      damages: 10,
      curAngle: 0
    });

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
    this.timeout(this._shoot, 120);
    if(!this.isShooting) {
      return;
    }
    this.shoot(this._dirAngle + Math.PI, 5);
  }
} );
