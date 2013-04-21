
var Crafty = require('./lib/crafty');

Crafty.c('Offscreen', {
  init: function() {
    this.requires('2D');
    this.bind('Moved', function(from) {
      if(this.isInBounds()) {
        this.trigger('InBounds');
      }
    });
  },

  offscreen: function() {
    var pos = this.randomOffscreenCoordinates();
    this.x = pos.x;
    this.y = pos.y;
    return this;
  },

  isInBounds: function() {
    return this.x + this.w < Crafty.viewport.width / 2 ||
           this.x - 10 > -Crafty.viewport.width / 2 ||
           this.y + this.h < Crafty.viewport.height / 2 ||
           this.y - 10 > -Crafty.viewport.height / 2;
  },

  randomOffscreenCoordinates: function() {
    var angle = Math.random() * 2 * Math.PI,
        radius = Math.max(Crafty.viewport.width / 2, Crafty.viewport.height / 2)
               + Math.max(this.w, this.h);
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    };
  }
} );
