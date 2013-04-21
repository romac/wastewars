
var Crafty = require('./lib/crafty');

Crafty.c('NetShip', {
  name: 'NetShip',
  init: function() {
    this.requires('Ship');
  },

} );
