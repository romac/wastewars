
var Crafty = require('./lib/crafty');

Crafty.scene('Loading', function() {
  var modules = {
    Shape: 'RELEASE',
    MouseFace: 'RELEASE'
  };
  
  Crafty.modules(modules, done);

  function done() {
    Crafty.scene('Game');
  }
});