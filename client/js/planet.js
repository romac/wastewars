
var Crafty = require('./lib/crafty');

Crafty.c('Planet', {
  name: 'Planet',
  init: function() {
    this.requires('Actor, Shape, Solid, Color, Collision, Tint');
    this.origin('center');
    this.circle(50);
    this.color('white');
    this.bind('ProjectileHit', this._planetWasHit);
    this.attr({
      health: 200
    });
  },

  pulsate: function(color) {
    this.tint(color, 0.5);
    this.timeout(function() {
      this.color('white');
    }.bind(this), 200);
  },

  _planetWasHit: function(event) {
    this.pulsate('red');
  }

} );
