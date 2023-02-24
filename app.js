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
    socket.sessionId = generateSessionId();
    socket.color = generateColor();
    socket.name = getRandomName();
    sessionStore.saveSession(sessionId, {color: socket.color, name: socket.name});
    next();
});

io.on('connection', (socket) => {
    // send session to client
    socket.emit('session', {color: socket.color, sessionId: socket.sessionId, name: socket.name});

    socket.on("disconnect", async () => {
        // notify other users
        socket.broadcast.emit("user-disconnected", socket.sessionId);
        delete positions[socket.sessionId];
        delete socket.sessionId;
    });

    // set initial positions
    positions[socket.sessionId] = {x: 0, y: 0, color: socket.color, name: socket.name};

    // send all positions on initialization
    socket.emit('init', positions);

    // notify about new user joined
    socket.broadcast.emit('user-joined', positions[socket.sessionId], socket.sessionId);

    // on client changes, mouseevent, touch event
    socket.on('update-positions', (coordinates) => {
        positions[socket.sessionId] = {
            x: coordinates['x'],
            y: coordinates['y'],
            color: socket.color,
            name: socket.name
        };
        socket.broadcast.emit('update-positions-client', positions); // inform clients about current users changes
    });
});

server.listen(3001, () => {
    console.log('listening on *:3001');
});

function generateSessionId() {
    return Math.random().toString(36).replace(/[^a-z]+/g, '');
}

// generate color for svg
function generateColor() {
    let invert = Math.floor(Math.random() * 100) + 1 + '%';
    let sepia = Math.floor(Math.random() * 100) + 1 + '%';
    let saturate = Math.floor(Math.random() * 5000) + 1 + '%';
    let deg = Math.floor(Math.random() * 359) + 'deg';

    return `invert(${invert}) sepia(${sepia}) saturate(${saturate}) hue-rotate(${deg}) brightness(100%) contrast(100%)`;
}

// get random animal name from list
function getRandomName() {
    return reservedNames[Math.floor(Math.random() * reservedNames.length)]
}
