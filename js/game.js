
var Crafty = require('./lib/crafty'),
    Stats  = require('./stats');

require('./loading');
require('./actor');
require('./ship');
require('./planet');

var Game = module.exports = {

  start: function() {
    Crafty.init(Crafty.DOM.window.width, Crafty.DOM.window.height);
    Crafty.canvas.init();
    Crafty.background('black');
    Crafty.scene('Loading');
    Stats.FPS(document.querySelector('#fps'));
  }

};

Crafty.scene( 'Game', function() {
  this.player = Crafty.e('Ship');
  this.player.x = -500;
  this.player.y = -300;
  this.planet = Crafty.e('Planet');

  Crafty.viewport.centerOn(this.planet, 1); 
} );

window.addEventListener('load', Game.start);
