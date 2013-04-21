
var Crafty = require('./lib/crafty');

require('./bounded');

Crafty.c('Bullet', {

  // FIXME: Optimize later, and refactor
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
    this.requires('Bounded, Color, Collision');
    this.attr({
      w: 3,
      h: 3,
      speed: 5
    });
    this.color('#FA5656');
    this.bind('EnterFrame', this._enteredFrame);
    this.bind('HitBounds', this.destroy);
    this.onHit('Solid', this._hitObject);
    return this;
  },

  _hitObject: function(e) {
    if(!e.length || !e[0].obj) return;
    e[0].obj.trigger('BulletHit', { bullet: this });
    this.destroy();
  },

  _enteredFrame: function(frame) {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  }

});