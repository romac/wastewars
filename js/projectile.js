
var Crafty = require('./lib/crafty');

require('./offscreen');

Crafty.c('Projectile', {
  init: function() {
    this.requires('Actor, Color, Offscreen, Collision');
    this.attr({
      w: 20,
      h: 20,
      speed: 3
    });
    this.color('#408FD9');
    this.bind('InBounds', function() {
      this.removeComponent('Offscreen');
      this.addComponent('Bounded');
    });
    this.bind('EnterFrame', this._enteredFrame);
    return this;
  },

  projectile: function(options) {
    if(options.attr) {
      this.attr(options.attr);
    }
    if(options.color) {
      this.color(options.color);
    }
    return this;
  },

  target: function(entity) {
      var pos = new Crafty.math.Vector2D(this.x, this.y),
          target = new Crafty.math.Vector2D(entity.x, entity.y),
          angle = pos.angleTo(target);
      this.attr('angle', angle);
      return this;
  },

  _enteredFrame: function(frame) {
    // console.log( 'x:', this.x, 'y:', this.y );
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }
} );
