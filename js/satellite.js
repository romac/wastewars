
var Crafty = require('./lib/crafty');

require('./projectile');

Crafty.c('Satellite', {
  init: function() {
    this.requires('Actor, Solid, Projectile, Color');
    this.bind('InBounds', function() {
      this.removeComponent('Offscreen');
      this.addComponent('Bounded');
    });
    this.color('#408FD9');
    this.bind('HitBounds', this.destroy);
    this.bind('HitObject', this.destroy);
    this.bind('ProjectileHit', this.destroy);
    this.attr({
      health: 20
    });
  }
} );
