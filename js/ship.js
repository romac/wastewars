
var Crafty = require('./lib/crafty');

require( './bounded' );
require( './shooter' );

Crafty.c('Ship', {
  init: function() {
    this.requires('Actor, Bounded, Shooter, Fourway, MouseFace, Color, Collision');
    this.fourway(4);
    this.attr({
      w: 10,
      h: 20,
      x: 100,
      y: 100,
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

    this.bind('MouseUp', function(e) {
      this.shoot(this._dirAngle + Math.PI, 5);
    });
  }
} );
