
var Crafty = require('./lib/crafty');

Crafty.c('Planet', {
  init: function() {
    this.requires('Actor, Shape, Solid, Color, Collision, Tint');
    this.origin('center');
    this.circle(50);
    this.color('white');
    this.bind('BulletHit', this.pulsate('red'));
  },
  pulsate: function(color) {
    return (function() {
      this.tint(color, 0.3);
      this.timeout(function() {
        this.color('white');
      }.bind(this), 300);
    }).bind(this);
  }
} );
