
var Crafty = require('./lib/crafty');

Crafty.c('Health', {

  init: function() {
    this.requires('2D, Canvas, Color');
    this.color('green');
    return this;
  },

  health: function(actor) {
    this.attr('healthWidth', Math.max((actor.radius) ? 2 * actor.radius : actor.w, 30));
    this.attr({
      maxHealth: actor.health,
      w: this.healthWidth,
      h: 4,
      x: actor.x,
      y: actor.y - 20
    });
    actor.bind('Change', this._updateHealth.bind(this));
    actor.bind('Moved', this._updateHealth.bind(this));
    this._updateHealth({health: actor.health, x: actor.x, y: actor.y});
  },

  _updateHealth: function(props) {
    if(!props) return;
    if('health' in props) {
      this.attr('w', Math.floor((props.health / this.maxHealth) * this.healthWidth));
    }
    if('x' in props) {
      this.attr('x', props.x);
    }
    if('y' in props) {
      this.attr('y', props.y - 20);
    }
  }

});