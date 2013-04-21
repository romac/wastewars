
var connect = require('./socket');

module.exports = {
  id: null,

  connect: function(cb) {
    connect((function(ws) {
      ws.onmessage = this.onMessage.bind(this);
      cb && cb(ws);
    }).bind(this));
  },

  onMessage: function(e) {
    var data = JSON.parse(e.data);
    if(!data || !data.method || !this[data.method]) {
      console.error('Error, cannot call method: ', data || data.method || this[data.method]);
      return;
    }
    this[data.method].apply(this,data.params);
  },

  setID: function(id) {
    this.id = id;
  }
};

