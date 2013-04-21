
var Crafty = require('./lib/crafty'),
    connect = require('./socket');

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
  },

  callMethod: function(method /*, params... */) {
    return function() {
      this.socket.send(JSON.stringify({
        id: this.id,
        method: method,
        params: Array.prototype.slice.call(arguments, 1)
      }));
    }.bind(this);
  },

  onMessage: function(e) {
    var data = JSON.parse(e.data);
    console.log(data);
    if(!data || !data.method || !this[data.method]) {
      console.error('Error: cannot call method: ', data && data.method);
      return;
    }
    this[data.method].apply(this,data.params);
  },

  setID: function(id) {
    this.id = id;
  },

  spawn: function(type, attr) {
    console.log(type, attr);
    Crafty.e(type).attr(attr || {}).go();
  },

  play: function() {
    Crafty.scene('Game');
  }
};

