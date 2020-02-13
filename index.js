'use strict';

const express = require('express');
const { Server } = require('ws');
const server = require('http').createServer();
const app = require('./http-server');

const port = process.env.PORT || 8524;

// Mount our express HTTP router into our server
server.on('request', app);

// Rooms is a map of room codes to a list of players in that room
const rooms = new Map();

// TODO adding a room manually until game-side exists
rooms.set('test', new Set());

const wss = new Server({ server });
// Used for connection liveness testing
function noop() {};
function heartbeat() {
    this.isAlive = true;
};
function leaveRoom(ws) {
    if (ws.inGame === true) {
        // Remove the player from the game's lobby
        const players = rooms.get(ws.room);
        players.delete(ws.nick);
        rooms.set(ws.room, players);
    }
}

// Establish connections and handle events
wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.room = '';
    ws.nick = '';
    ws.inGame = false;
    ws.on('pong', heartbeat);

    ws.on('message', (message) => {
        var radishMsg = JSON.parse(message);
        ws.room = radishMsg.roomCode.toLowerCase();
        ws.nick = radishMsg.nickname.toLowerCase();
        switch (radishMsg.messageType) {
        case 'ROOM_CREATED': {
            rooms.set(room, new Set());
            const response = {
                messageType: 'ROOM_CREATED_SUCCESS',
                roomCode: ws.room
            }
        }
        break;
        case 'JOINED_ROOM': {
            if (!rooms.has(ws.room)) {
                // Tried to connect to a non-existent room
                const response = {
                    messageType: 'ERROR_INVALID_ROOM',
                    roomCode: ws.room,
                    nickname: ws.nick
                }
                ws.send(JSON.stringify(response));
            } else {
                // Connected successfully
                const players = rooms.get(ws.room);
                if (players.has(ws.nick)) {
                    // Tried to connect to a non-existent room
                    const response = {
                        messageType: 'ERROR_NAME_TAKEN',
                        roomCode: ws.room,
                        nickname: ws.nick
                    }
                    ws.send(JSON.stringify(response));
                } else {
                    ws.inGame = true;
                    players.add(ws.nick);
                    rooms.set(ws.room, players);
                    const response = {
                        messageType: 'JOINED_ROOM_SUCCESS',
                        roomCode: ws.room,
                        nickname: ws.nick,
                        vip: players.size == 1
                    }
                    ws.send(JSON.stringify(response));
                }
            }
        }
        break;
        case 'DISCONNECTED': {
            leaveRoom(ws);
        }
        break;
        case 'GAME_STARTED': {
            console.log(`Game started by ${ws.nick}`);
        }
        break;
    }
    });
});
// Perform heartbeats to test for liveness
const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
        leaveRoom(ws);
        return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(noop);
  });
}, 1000);

server.listen(port, () => console.log(`Free Radish is listening on port ${port}`));
