
var Crafty = require('./lib/crafty');

Crafty.c('Actor', {
  init: function() {
    this.requires('2D, Canvas');
    this.attr({
      health: 100
    });
    this.bind('ProjectileHit', this._wasHit);
    this.bind('Die', this.die);
  },

  die: function() {
    this.destroy();
  },
  
  stopOnSolid: function() {
    this.onHit('Solid', function() {
      this.stopMovement();
    });
    return this;
  },
  
  stopMovement: function(lastPosition) {
    this._speed = 0;
    if(lastPosition) {
      this.x = lastPosition.x;
      this.y = lastPosition.y;
    }
    else if (this._movement) {
      this.x -= this._movement.x;
      this.y -= this._movement.y;
    }
  },

  _wasHit: function( event ) {
    var newHealth = this.health - event.projectile.damages;
    this.attr('health', newHealth);
    if( newHealth <= 0 ) {
      this.trigger('Die');
    }
  }
} );