
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
    console.log(angle, speed);
    Crafty.e('Bullet').bullet({
      attr: {
        x: this.x,
        y: this.y,
        angle: angle,
        speed: speed || 5
      }
    });
  }
});
