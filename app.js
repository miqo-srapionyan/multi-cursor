const express = require('express');
const app = express();
app.use(express.static('public'));
const {InMemorySessionStore} = require("./sessionStore");
const sessionStore = new InMemorySessionStore();
const http = require('http');
const server = http.createServer(app);
const {Server} = require("socket.io");
const io = new Server(server);

const positions = {};
const reservedNames = require('./names.json');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (sessionId) {
        // find existing session
        const session = sessionStore.findSession(sessionId);
        if (session) {
            socket.sessionId = sessionId;
            socket.color = session.color;
            socket.name = session.name;
            return next();
        }
    }

    // create new session
    socket.sessionId = generateId();
    socket.color = generateColor();
    socket.name = getRandomName();
    sessionStore.saveSession(sessionId, {color: socket.color, name: socket.name});
    next();
});

io.on('connection', (socket) => {
    socket.emit('session', {color: socket.color, sessionId: socket.sessionId, name: socket.name});

    socket.on("disconnect", async () => {
        // notify other users
        socket.broadcast.emit("user-disconnected", socket.sessionId);
        delete positions[socket.sessionId];
        delete socket.sessionId;
    });

    positions[socket.sessionId] = {x: 0, y: 0, color: socket.color, name: socket.name};

    socket.emit('init', positions);
    socket.on('update-positions', (coordinates) => {
        positions[socket.sessionId] = {x: coordinates['x'], y: coordinates['y'], color: socket.color, name: socket.name};
        socket.broadcast.emit('update-positions-client', positions);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

function generateId() {
    return Math.random().toString(36).replace(/[^a-z]+/g, '');
}

function generateColor() {
    let invert = Math.floor(Math.random() * 100) + 1 + '%';
    let sepia = Math.floor(Math.random() * 100) + 1 + '%';
    let saturate = Math.floor(Math.random() * 5000) + 1 + '%';
    let deg = Math.floor(Math.random() * 359) + 'deg';

    return `invert(${invert}) sepia(${sepia}) saturate(${saturate}) hue-rotate(${deg}) brightness(100%) contrast(100%)`;
}

function getRandomName() {
    return reservedNames[Math.floor(Math.random() * reservedNames.length)]
}
