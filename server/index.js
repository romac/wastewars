
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
    slice = Array.prototype.slice;

WebSocket.prototype.rpc = function(method /*, params... */ ) {
  this.send(JSON.stringify({
    method: method,
    params: slice.call(arguments, 1)
  }));
};

var server = new WebSocket.Server({ port: 8080 }),
    clients = {},
    viewport = { width: 800, height: 600 };

Object.defineProperty(clients, 'rpc', {
  enumerable: false,
  value: function() {
    for(var id in this) {
      this[id].rpc.apply(this[id], slice.call(arguments));
    }
  }
});

server.on('connection', function(ws) {
  console.log('Client connected!');
  ws.on('message', function(msg) {
    console.log('Received: %s', msg);
  });
  ws.on('close', function() {
    console.log('Client disconnected...');
  });
  var id = uuid();
  ws.rpc('setID', id);
  clients[id] = ws;
});

setInterval(function() {
  clients.rpc('spawn', 'Satellite', {x: -500, y: -500});
}, 800);