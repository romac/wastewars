
var Crafty = require('./lib/crafty');

Crafty.c('Bounded', {
  init: function() {
    this.requires('2D, Canvas');
    this._lastInBoundsPosition = null;
    this.bind('EnterFrame', function() {
      if(this.isOutOfBounds()) {
        this.trigger('HitBounds', this._lastInBoundsPosition);
      } else {
        this._lastInBoundsPosition = {
          x: this.x,
          y: this.y
        };
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