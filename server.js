let WebSocketServer = require('ws').Server;

const COMMAND_MESSAGE = 'message';
const COMMAND_CONNECT = 'connect';

class Server {
    constructor(WebSocket) {
        this.wss = new WebSocket({port: 8082});
        this.clients = [];
    }

    Run() {
        this.wss.on('connection', this.connectionHandler.bind(this));
    }

    connectionHandler(ws) {
        
        ws.on('message', (message) => {
            this.dispatch(ws, message);
        });
        ws.on('close', () => {
            this.clients.forEach((client, index) => {
                if(client.conn === ws) {
                    this.clients.splice(index, 1);
                }
            });
            console.log('closing');
        });
        ws.on('error', (error) => {
            //TODO: implement error Handler
            console.log(error);
        });
    }

    dispatch(ws, message) {
        //parse protocol /message {Message}
        //               /connect {Name} 
        // switch on 2 events - register, broadcast
        // if register check if unique name, then add to clients array, and broadcast info that client has connected
        // if broadcast send - name + message to all registered cleints
        // if disconnect remove user from client array, close connection, and broadcast event that user has disconnected
        // {command, payload }
        // 
        try {
            message = JSON.parse(message);
        } catch ( exception ) {
            // Log invalid json data
            return;
        }

        if ( !message.hasOwnProperty('command') ) {
            // Log wrong protocol interface
            return;
        }

        switch (message.command) {
            case COMMAND_CONNECT:
                if ( !message.hasOwnProperty('name') ) {
                    // Log wrong protocol interface
                    return;
                }
                console.log('client added:', message.name);
                this.clients.push({ conn: ws, name: message.name });
                this.broadcast('has joined chat.', ws);
                break;
            case COMMAND_MESSAGE:
                if ( !message.hasOwnProperty('text') ) {
                    // Log wrong protocol interface
                    return;
                }

                console.log('broadcasting message:', message.text);
                this.broadcast(message.text, ws);
                break;    
        }

    }

    broadcast(text, fromConnection) {
        let user = this.findUser(fromConnection);
        console.log(user);
        this.clients.forEach((client) => {
            client.conn.send(JSON.stringify({userName: user, text: text}));
        });
    }

    findUser(fromConn) {
        let username = '';
        this.clients.forEach((client) => {
            if(client.conn === fromConn) {
                username =  client.name; 
            }
        });

        return username;
    }

}

let server = new Server(WebSocketServer);

server.Run();

