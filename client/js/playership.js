
var Crafty = require('./lib/crafty');

require( './ship' );
require( './bounded' );
require( './mouseshooter' );

Crafty.c('PlayerShip', {
  name: 'PlayerShip',
  init: function() {
    this.requires('Ship, Bounded, MouseShooter, Fourway, MouseFace');
    this.fourway(4);
    this.stopOnSolid();
    this.MouseFace({x: 0, y: 0});

    this.bind('MouseMoved', function(e) {
      this.origin('center');
      this.curAngle = e.grad + 90;
      this.rotation = this.curAngle;
    });

    this.bind('StartShooting', this._shoot);
    this.bind('HitBounds', this.stopMovement);

    setInterval(function() {
      Crafty.trigger('UpdateShip', this.serialize());
    }.bind(this), 50);
  },

} );
