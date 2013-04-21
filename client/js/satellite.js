
var Crafty = require('./lib/crafty');

require('./projectile');

Crafty.c('Satellite', {
  name: 'Satellite',
  init: function() {
    this.requires('Actor, Solid, Projectile, SatelliteSprite');
    this.bind('InBounds', function() {
      this.removeComponent('Offscreen');
      this.addComponent('Bounded');
    });
    this.bind('HitBounds', this.destroy);
    this.bind('HitObject', this.destroy);
    this.bind('EnterFrame', this._satEnterFrame)
    this.attr({
      health: 2,
      damages: 10,
      speed: 3
    });
  },
  
  go: function() {
    this.target(Crafty('Planet'));
  },

  _satEnterFrame: function() {
    this.rotation += 1.5;
  }
} );
