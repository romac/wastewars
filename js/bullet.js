
var Crafty = require('./lib/crafty');

require('./bounded');

Crafty.c('Bullet', {

  bullet: function(options) {
    if(options.attr) {
      this.attr(options.attr);
    }
    if(options.color) {
      this.color(options.color);
    }
    return this;
  },

  init: function() {
    this.requires('Projectile, Color');
    this.color('#FA5656');
    this.bind('EnterFrame', this._enteredFrame);
    this.bind('HitBounds', this.destroy);
    this.bind('HitObject', this.destroy);
    this.attr({
      w: 3,
      h: 3,
      speed: 5,
      damages: 1
    });
    return this;
  }

});