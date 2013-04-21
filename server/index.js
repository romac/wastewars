
/*
 * wastewars
 * https://github.com/romac/wastewars
 *
 * Copyright (c) 2013 Romain Ruetschi, Dimiter Petrov
 * Licensed under the MIT license.
 */

'use strict';

var WebSocket = require('ws'),
    uuid = require('uuid').v1;

WebSocket.prototype.call = function(method /*, params... */ ) {
  this.send(JSON.stringify({
    method: method,
    params: Array.prototype.slice.call(arguments, 1)
  }));
};

var server = new WebSocket.Server({ port: 8080 }),
    clients = [];

server.on('connection', function(ws) {
  console.log('Client connected!');
  ws.on('message', function(msg) {
    console.log('Received: %s', msg);
  });
  var id = uuid();
  ws.call('setID', id);
  clients[id] = ws;
});