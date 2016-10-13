let WebSocketServer = require('ws').Server;
let bunyan = require('bunyan');
let sanitize = require('validator');

let Server = require('./server');

let chatServer = new Server(WebSocketServer, bunyan, sanitize);

process
    .on('SIGINT', chatServer.gracefullyShutdown.bind(chatServer))
    .on('SIGTERM', chatServer.gracefullyShutdown.bind(chatServer));

chatServer.Run();

module.exports = chatServer;