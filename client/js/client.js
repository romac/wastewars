
var Crafty = require('./lib/crafty'),
    connect = require('./socket'),
    slice = Array.prototype.slice;

require('./netship');
require('./satellite');

module.exports = {
  id: null,
  socket: null,

  connect: function(cb) {
    connect((function(ws) {
      this.socket = ws;
      ws.onmessage = this.onMessage.bind(this);
      this.bindEvents();
      cb && cb(ws);
    }).bind(this));
  },

  bindEvents: function() {
    Crafty.bind('Ready', this.callMethod('ready'));
    Crafty.bind('GameOver', this.callMethod('gameOver'));
    Crafty.bind('UpdateShip', function(ship) {
      this.callMethod('updateShip', ship)();
    }.bind(this));
    Crafty.bind('DestroyShip', this.callMethod('destroyShip'));
  },

  callMethod: function(method /*, params... */) {
    var params = slice.call(arguments, 1);
    return function() {
      this.socket.send(JSON.stringify({
        id: this.id,
        method: method,
        params: params
      }));
    }.bind(this);
  },

  onMessage: function(e) {
    var data = JSON.parse(e.data);
    if(!data || !data.method || !this[data.method]) {
      console.error('Error: cannot call method: ', data && data.method);
      return;
    }
    this[data.method].apply(this,data.params);
  },

  setID: function(id) {
    this.id = id;
  },

  ships: {},

  updateShip: function(id, attr) {
    if(id === this.id) return;
    if(!this.ships[id]) {
      this.ships[id] = Crafty.e('NetShip');
    }
    this.ships[id].attr(attr);
  },

  destroyShip: function(id) {
    if(id === this.id) return;
    this.ships[id] && this.ships[id].destroy();
    delete this.ships[id];
  },

  spawn: function(type, attr) {
    var obj = Crafty.e(type);
    obj.attr(attr || {});
    if (typeof obj.go === 'function') {
        obj.go();
    }
  },


  play: function() {
    Crafty.scene('Game');
  }
};

