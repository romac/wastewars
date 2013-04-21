
var Crafty = require('./lib/crafty'),
    client = require('./client');

require('./queue');

Crafty.scene('Loading', function() {
  var modules = {
      Shape: 'RELEASE',
      MouseFace: 'RELEASE'
    },
    i = 4;

  Crafty.modules(modules, done);
  Crafty.load(['assets/ship.png'], done);
  Crafty.load(['assets/assault.png'], done);
  Crafty.load(['assets/earth.png'], done);
  client.connect(done);

  function done() {
    if(--i === 0) {
      Crafty.sprite(24, 'assets/ship.png', { PlayerSprite: [ 0, 0 ] } );
      Crafty.sprite(1, 'assets/assault.png', { SatelliteSprite: [ 0, 0, 24, 19 ] } );
      Crafty.sprite(1, 'assets/earth.png', { EarthSprite: [ 0, 0, 121, 118 ] } );
      Crafty.scene('Queue');
    }
  }
});