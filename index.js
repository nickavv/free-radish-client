'use strict';

const express = require('express');
const WebSocket = require('ws');
const server = require('http').createServer();
const app = require('./http-server');

const port = process.env.PORT || 8524;

// Mount our express HTTP router into our server
server.on('request', app);

// Rooms is a map of room codes to a list of players in that room
const rooms = new Map();
// RoomClients is a map of room codes to the room client itself
const roomClients = new Map();

// TODO adding a room manually until game-side exists
rooms.set('test', []);

const wss = new WebSocket.Server({ server });
// Used for connection liveness testing
function noop() {};
function heartbeat() {
    this.isAlive = true;
};
function leaveRoom(ws) {
    if (ws.inGame === true) {
        // Remove the player from the game's lobby
        const players = rooms.get(ws.room);
        players.splice(players.indexOf(ws.nick), 1);
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
        if (radishMsg.nickname) {
            ws.nick = radishMsg.nickname.toLowerCase();
        }
        switch (radishMsg.messageType) {
        case 'CREATE_ROOM_REQUEST': {
            rooms.set(ws.room, []);
            roomClients.set(ws.room, ws);
            const response = {
                messageType: 'ROOM_CREATED_SUCCESS',
                roomCode: ws.room
            }
            ws.send(JSON.stringify(response));
        }
        break;
        case 'ROOM_JOIN_REQUEST': {
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
                if (findPlayerInRoom(ws.room, ws.nick) != undefined) {
                    // Tried to connect to a room where your name was already taken
                    const response = {
                        messageType: 'ERROR_NAME_TAKEN',
                        roomCode: ws.room,
                        nickname: ws.nick
                    }
                    ws.send(JSON.stringify(response));
                } else {
                    ws.inGame = true;
                    const players = rooms.get(ws.room);
                    players.push({
                        nick: ws.nick,
                        client: ws
                    });
                    rooms.set(ws.room, players);
                    const response = {
                        messageType: 'PLAYER_JOINED',
                        roomCode: ws.room,
                        nickname: ws.nick,
                        vip: players.length == 1
                    }
                    broadcast(JSON.stringify(response));
                }
            }
        }
        break;
        case 'DISCONNECTED': {
            leaveRoom(ws);
        }
        break;
        case 'START_GAME_REQUEST': {
            const response = {
                messageType: 'GAME_STARTED',
                roomCode: ws.room
            }
            broadcast(JSON.stringify(response));
        }
        break;
        case 'SEND_PLAYER_DATA': {
            const target = findPlayerInRoom(ws.room, radishMsg.targetPlayer).client;
            const gameToPlayer = {...radishMsg};
            gameToPlayer.messageType = "GAME_TO_PLAYER";
            gameToPlayer.nickname = radishMsg.targetPlayer;
            target.send(JSON.stringify(gameToPlayer));
        }
        break;
        case 'SEND_GAME_DATA': {
            const target = roomClients.get(ws.room);
            const playerToGame = {...radishMsg};
            playerToGame.messageType = "PLAYER_TO_GAME";
            target.send(JSON.stringify(playerToGame));
        }
        break;
        case 'ALL_PLAYERS_READY': {
            // Pass this message along to all players so they can show a new screen
            broadcast(message);
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

function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });

}

function findPlayerInRoom(room, nickname) {
    const players = rooms.get(room);
    if (players === undefined) {
        return null;
    } else {
        return players.find((item) => item.nick == nickname);
    }
}

server.listen(port, () => console.log(`Free Radish is listening on port ${port}`));
