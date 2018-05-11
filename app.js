let express = require('express');
let app = express();
let io = require('socket.io-client');
let apiSocket = require('./controllers/apiSocket');
let server = process.env.PORT || 5050;

apiSocket(io);

app.listen(server);