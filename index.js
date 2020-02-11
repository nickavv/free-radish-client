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
rooms.set('test', []);

const wss = new Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        var radishMsg = JSON.parse(message);
        if (radishMsg.messageType == 'JOINED_ROOM') {
            if (!rooms.has(radishMsg.roomCode)) {
                // Tried to connect to a non-existent room
                const response = {
                    messageType: 'ERROR_INVALID_ROOM',
                    roomCode: radishMsg.roomCode,
                    nickname: radishMsg.nickname
                }
                ws.send(JSON.stringify(response));
            } else {
                // Connected successfully
                const players = rooms.get(radishMsg.roomCode);
                players.push(radishMsg.nickname);
                const response = {
                    messageType: 'JOINED_ROOM_SUCCESS',
                    roomCode: radishMsg.roomCode,
                    nickname: radishMsg.nickname,
                    vip: players.length == 1
                }
                ws.send(JSON.stringify(response));
            }
        }
    });
});

server.listen(port, () => console.log(`Free Radish is listening on port ${port}`));
