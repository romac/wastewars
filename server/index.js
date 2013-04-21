
/*
 * wastewars
 * https://github.com/romac/wastewars
 *
 * Copyright (c) 2013 Romain Ruetschi, Dimiter Petrov
 * Licensed under the MIT license.
 */

'use strict';

var WebSocket = require('ws'),
    uuid = require('uuid').v1,
    shared = require('../shared'),
    slice = Array.prototype.slice;

var wsServer = new WebSocket.Server({ port: 8080 }),
    viewport = { width: 800, height: 600 };

WebSocket.prototype.rpc = function(method /*, params... */) {
  this.send(JSON.stringify({
    method: method,
    params: slice.call(arguments, 1)
  }));
};

var server = {
  clients: {},
  clientsNum: 0,
  clientsReady: 0,

  addClient: function(client) {
    var id = uuid();
    client.id = id;
    client.rpc('setID', id);
    this.clients[id] = client;
    this.clientsNum++;
  },

  removeClient: function(client) {
    delete this.clients[client.id];
    this.clientsNum--;
    if(client.ready) {
      this.clientsReady--;
    }
  },

  rpc: function(method /*, params... */) {
    var params = slice.call(arguments, 1);
    for(var id in this.clients) {
      this.clients[id].send(JSON.stringify({
        method: method,
        params: params
      })); 
    }
  },

  ready: function(id) {
    this.clientsReady++;
    this.clients[id].ready = true;
    if(this.clientsReady === this.clientsNum) {
      this.rpc('play');
      setInterval(function() {
        this.spawnSatellite(this.clientsReady * 3);
      }.bind(this), 3000);
    }
  },

  spawnSatellite: function(num) {
    var size = { w: 20, h: 20 };
    for(var i = 0; i < num; i++) {
      var coords = shared.randomOffscreenCoordinates(viewport, size);
      server.rpc('spawn', 'Satellite', {x: coords.x, y: coords.y, w: size.w, h: size.h});
    }
  },

  updateShip: function(id, attr) {
    this.rpc('updateShip', id, attr);
  },

  destroyShip: function(id) {
    this.rpc('destroyShip', id);
  },

  gameOver: function(id) {
    console.log('Game OVER!');
  }
};

wsServer.on('connection', function(ws) {
  console.log('Client connected!');
  server.addClient(ws);
  ws.on('message', function(msg) {
    var data = JSON.parse(msg);
    if(!data || !data.method || !server[data.method]) {
      console.error('Error: cannot call method: ', data && data.method);
      return;
    }
    data.params.unshift(data.id);
    server[data.method].apply(server, data.params);
  });
  ws.on('close', function() {
    console.log('Client disconnected...');
    server.removeClient(ws);
  });
});
