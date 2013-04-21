
var Crafty = require('./lib/crafty');

require('./ship');

Crafty.c('NetShip', {
  name: 'NetShip',
  init: function() {
    this.requires('Ship, Bounded');
  }
} );
