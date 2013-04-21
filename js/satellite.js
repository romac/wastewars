
var Crafty = require('./lib/crafty');

require('./projectile');

Crafty.c('Satellite', {
  init: function() {
    this.requires('Projectile');
  }
} );
