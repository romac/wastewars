
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
    console.log('ready: %d, num: %d', this.clientsReady, this.clientsNum);
    if( this.clientsReady == this.clientsNum ) {
      this.rpc('play');
      setInterval(function() {
        var size = { w: 20, h: 20 },
            coords = shared.randomOffscreenCoordinates(viewport, size);
        server.rpc('spawn', 'Satellite', {x: coords.x, y: coords.y, w: size.w, h: size.h});
      }, 1000);
    }
  },

  updateShip: function(id, attr) {
    this.rpc('updateShip', id, attr);
  },

  gameOver: function(id) {
    console.log('GameOVER!');
  }
};

wsServer.on('connection', function(ws) {
  console.log('Client connected!');
  ws.on('message', function(msg) {
    console.log('Received: %s', msg);
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
  server.addClient(ws);
});
