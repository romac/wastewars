
var Crafty = require('./lib/crafty');

require('./projectile');

Crafty.c('Satellite', {
  name: 'Satellite',
  init: function() {
    this.requires('Actor, Solid, Projectile, Color');
    this.bind('InBounds', function() {
      this.removeComponent('Offscreen');
      this.addComponent('Bounded');
    });
    this.color('#B70011');
    this.bind('HitBounds', this.destroy);
    this.bind('HitObject', this.destroy);
    this.attr({
      health: 2,
      damages: 10,
      speed: 3
    });
  },
  go: function() {
    this.target(Crafty('Planet'));
  }
} );
