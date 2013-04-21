
var Crafty = require('./lib/crafty');

Crafty.c('Planet', {
  name: 'Planet',
  init: function() {
    this.requires('Actor, Solid, Collision, EarthSprite');
    this.origin('center');
    this.attr({
      w: 121,
      h: 119,
      health: 200
    });
  },
} );
