
var Crafty = require('./lib/crafty');

require('./offscreen');

Crafty.c('Projectile', {
  init: function() {
    this.requires('2D, Canvas, Offscreen, Collision');
    this.attr({
      w: 20,
      h: 20,
      speed: 3,
      damages: 10
    });
    this.bind('EnterFrame', this._enteredFrame);
    this.onHit('Solid', this._hitObject);
    return this;
  },

  projectile: function(options) {
    if(options.attr) {
      this.attr(options.attr);
    }
    if(options.color) {
      this.color(options.color);
    }
    return this;
  },

  target: function(entity) {
    console.log(entity);
    console.log(entity.x);
      var pos = new Crafty.math.Vector2D(this.x, this.y),
          target = new Crafty.math.Vector2D(entity.x, entity.y),
          angle = pos.angleTo(target);
      this.attr('angle', angle);
      return this;
  },

  _enteredFrame: function(frame) {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
  },

  _hitObject: function(events) {
    var self = this;
    if(!events.length) return;
    events.forEach(function(event) {
      event.obj.trigger('ProjectileHit', { projectile: self });
      self.trigger('HitObject', { object: event.obj });
    });
  },
} );
