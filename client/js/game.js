
var Crafty = require('./lib/crafty'),
    Stats  = require('./stats');

require('./loading');
require('./actor');
require('./ship');
require('./planet');
require('./satellite');

var Game = module.exports = {

  start: function() {
    Crafty.init(Crafty.DOM.window.width, Crafty.DOM.window.height);
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
    Crafty.stage.fullscreen = true;
    Crafty.canvas.init();
    Crafty.background('black');
    Crafty.scene('Loading');
    Stats.FPS(document.querySelector('#fps'));
  }

};

Crafty.scene('Game', function() {
  this.player = Crafty.e('Ship');
  this.player.x = -500;
  this.player.y = -300;
  this.planet = Crafty.e('Planet');
  Crafty.viewport.centerOn(this.planet, 1); 
  setInterval(function() {
    Crafty.e('Satellite').offscreen().target(this.planet);
  }.bind(this), 800);
});

window.addEventListener('load', Game.start);
