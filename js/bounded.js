
var Crafty = require( './lib/crafty' );

Crafty.c('Bounded', {
  init: function() {
    this.requires('2D, Canvas');
    this.bind('Moved', function(from) {
      if(this.isOutOfBounds()) {
          this.trigger('HitBounds');
          this.attr({
            x: from.x, 
            y: from.y
          });
      }
    });
  },
  isOutOfBounds: function() {
    return this.x + this.w > Crafty.viewport.width / 2 ||
           this.x - 10 < -Crafty.viewport.width / 2 ||
           this.y + this.h > Crafty.viewport.height / 2 ||
           this.y - 10 < -Crafty.viewport.height / 2;
  }
} );