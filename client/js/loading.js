
var Crafty = require('./lib/crafty'),
    client = require('./client');

require('./queue');

Crafty.scene('Loading', function() {
  var modules = {
      Shape: 'RELEASE',
      MouseFace: 'RELEASE'
    },
    i = 2;

  Crafty.modules(modules, done);
  client.connect(done);

  function done() {
    if(--i === 0) {
      Crafty.scene('Queue');
    }
  }
});