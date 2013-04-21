
var socketState = {
  socket: null,
  opened: false,
  connect: function(cb) {
    if(!this.opened) {
      this.socket = new WebSocket('ws://localhost:8080');
      this.socket.onopen = (function() {
        this.opened = true;
        cb && cb(this.socket);
      }).bind(this);
    }
    return this.socket;
  }
};

module.exports = socketState.connect.bind(socketState);
