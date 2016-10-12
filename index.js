let WebSocketServer = require('ws').Server;
let bunyan = require('bunyan');

let Server = require('./server');

let server = new Server(WebSocketServer, bunyan);

process.on('SIGINT', server.gracefullyShutdown.bind(server)).on('SIGTERM', server.gracefullyShutdown.bind(server));
server.Run();

