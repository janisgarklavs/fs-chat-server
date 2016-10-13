const COMMAND_MESSAGE = 'message';
const COMMAND_CONNECT = 'connect';
const SYSTEM_USER = 'system';

const PORT = process.env.PORT || 8082;
const INACTIVITY_TIMEOUT = process.env.INACTIVITY_TIMEOUT || 60000;


class Server {
    constructor(WebSocket, Logger, sanitize) {
        this.wss = new WebSocket({port: PORT});
        this.logger = Logger.createLogger({name: 'fs-chat'});
        this.sanitize = sanitize;
        this.clients = [];
    }

    Run() {
        this.logger.info("Server started");
        this.wss.on('connection', this.connectionHandler.bind(this));
    }

    connectionHandler(ws) {
        ws.on('message', (message) => {           
            this.dispatch(ws, message);
        });
        ws.on('close', (code) => {
            let user = this.findUser(ws);
            this.clients.forEach((client, index) => {
                if(client.conn === ws) {
                    this.clients.splice(index, 1);
                }
            });
            if (code === 1001) {
                return;
            }
            if (user) {
                if (code === 1003) {
                    this.broadcast(SYSTEM_USER, user.name + ' was disconnected due to inactivity');
                } else {
                    this.logger.info({user: user.name}, 'User left the chat.');
                    this.broadcast(SYSTEM_USER, user.name + ' left the chat, connection lost');
                }
            }
        });
    }

    dispatch(ws, message) {
        try {
            message = JSON.parse(message);
        } catch ( exception ) {
            this.logger.warn({err: exception}, 'Could not parse incoming message');
            return;
        }
        if ( !message.hasOwnProperty('command') ) {
            return;
        }
        let user = null;
        switch (message.command) {
            
            case COMMAND_CONNECT:
                if ( !message.hasOwnProperty('name') ) {
                    return;
                }
                message.name = this.sanitize.escape(message.name);
                if (this.userExists(message.name)) {
                    this.logger.info({user: message.name}, 'Username allready exists.');
                    ws.close(1000, "Failed to connect. Nickname already taken.");
                    return;
                }

                user = { conn: ws, name: message.name };
                user.timeout = this.inactivityTimeout(ws, user);
                this.clients.push(user);

                this.broadcast(SYSTEM_USER, user.name + ' has joined chat.');
                this.logger.info({user: user.name}, 'User joined the chat');
                break;
            case COMMAND_MESSAGE:
                user = this.findUser(ws);
                if ( !message.hasOwnProperty('text') ) {
                    return;
                }
                message.text = this.sanitize.escape(message.text);
                clearTimeout(user.timeout);

                this.broadcast(user.name, message.text);
                this.logger.info({user: user.name, message: message.text}, 'User sent message.');

                user.timeout = this.inactivityTimeout(ws, user);
                break;
        }

    }

    inactivityTimeout(socket, user) {
        return setTimeout(() => {
            socket.close(1003, "Disconnected by the server due to inactivity.");
            this.logger.info({user: user.name}, 'User was disconnected due to timeout.');
        }, INACTIVITY_TIMEOUT);
    }

    broadcast(author, text) {
        this.clients.forEach((client) => {
            client.conn.send(JSON.stringify({userName: author, text: text}));
        });
    }

    findUser(fromConn) {
        let user = null;
        this.clients.forEach((client) => {
            if(client.conn === fromConn) {
                user = client; 
            }
        });

        return user;
    }

    userExists(name) {
        let exists = false;
        this.clients.forEach((client) => {
            if(client.name === name) {
                exists = true; 
            }
        });
        return exists;
    }

    gracefullyShutdown() {
        this.clients.forEach((client) => {
            client.conn.close(1001, 'Server unavailable.');
        });
        this.clients = [];
        this.wss.close((error) => {
            if (error) {
                this.logger.error({err:error}, 'Something went wrong while shutting down.');
            }
        });
        this.logger.info('Server shutdown.');
        process.exit(1);
    }

}

module.exports = Server;