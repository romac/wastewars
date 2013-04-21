
var Crafty = require('./lib/crafty');

require('./bullet');

Crafty.c('Shooter', {
  init: function() {
    this.requires('2D');
    this.attr({
      isShooting: false
    })
  },

  shoot: function(angle, speed) {
    Crafty.e('Bullet').bullet({
      attr: {
        x: this.x + Math.cos(angle) * Math.max(this.w, this.h),
        y: this.y + Math.sin(angle) * Math.max(this.w, this.h),
        angle: angle,
        speed: speed || 5
      }
    });
  }
});
