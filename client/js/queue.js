
var Crafty = require('./lib/crafty');

Crafty.scene('Queue', function() {
  Crafty.e('2D, DOM, Text')
    .attr({x: Crafty.viewport.width / 2 - 160, y: Crafty.viewport.height / 2 - 10, w: 320, h: 20})
    .text('Press space when you\'re ready...')
    .bind('KeyDown', function(e) {
      if(e.key !== Crafty.keys.SPACE) {
        return;
      }
      Crafty.scene('Game');
    });
});