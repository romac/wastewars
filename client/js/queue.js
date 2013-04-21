
var Crafty = require('./lib/crafty');

Crafty.scene('Queue', function() {
  Crafty.e('2D, DOM, Text')
    .attr({x: 400, y: 400, w: 500, h: 200})
    .text('Press space when you\'re ready...')
    .bind('KeyDown', function(e) {
      if(e.key !== Crafty.keys.SPACE) {
        return;
      }
      Crafty.scene('Game');
    });
});