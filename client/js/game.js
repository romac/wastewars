
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
  this.player.x = -200;
  this.player.y = -100;
  this.planet = Crafty.e('Planet');
  this.planet.bind('Die', function() {
    Crafty.trigger('GameOver');
  });
  
  Crafty.viewport.centerOn(this.planet, 1); 
});

Crafty.bind('GameOver', function() {
  Crafty.stop();
});

window.addEventListener('load', Game.start);
