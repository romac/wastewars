
var Crafty = require('./lib/crafty'),
    shared = require('../../shared');

Crafty.c('Offscreen', {
  init: function() {
    this.requires('2D, Canvas');
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
    return shared.randomOffscreenCoordinates(Crafty.viewport, this);
  }
} );
