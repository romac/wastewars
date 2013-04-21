
var Crafty = require('./lib/crafty'),
    Stats  = require('./stats');

require('./loading');
require('./actor');
require('./playership');
require('./planet');
require('./satellite');

var Game = module.exports = {

  start: function() {
    Crafty.init(800, 600);
    Crafty.viewport.bounds = {
      min: {
        x: -Crafty.viewport.width / 2,
        y: -Crafty.viewport.height / 2
      },
      max: {
        x: Crafty.viewport.width / 2,
        y: Crafty.viewport.height / 2
      }
    };
    Crafty.canvas.init();
    Crafty.background('black');
    Crafty.scene('Loading');
    Stats.FPS(document.querySelector('#fps'));
  }

};

Crafty.scene('Game', function() {
  this.player = Crafty.e('PlayerShip');
  this.player.attr({ x: Crafty.math.randomInt(-350, 350), y: Crafty.math.randomInt(-100, -250) });
  this.player.go();
  this.planet = Crafty.e('Planet');
  this.planet.bind('Die', function() {
    Crafty.trigger('GameOver');
  });
  Crafty.viewport.centerOn(this.planet, 1); 
});

Crafty.bind('GameOver', function() {
  Crafty('Actor').destroy();
  Crafty.scene('GameOver');
});

Crafty.scene('GameOver', function() {
  Crafty.e('2D, DOM, Text')
    .attr({x: -50, y: -10, w: 200, h: 20})
    .text('Game OVER!');
});

window.addEventListener('load', Game.start);
