
var Crafty = require('./lib/crafty');

require('./shooter');

Crafty.c('MouseShooter', {
  init: function() {
    this.requires('Shooter');
    this.bind('MouseDown', function() {
      this.attr('isShooting', true);
      this.trigger('StartShooting');
    });
    this.bind('MouseUp', function() {
      this.attr('isShooting', false);
      this.trigger('StopShooting');
    });
  }
});
