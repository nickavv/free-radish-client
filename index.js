'use strict';

const express = require('express');
const { Server } = require('ws');
const server = require('http').createServer();
const app = require('./http-server');

const port = process.env.PORT || 8524;

// Mount our express HTTP router into our server
server.on('request', app);

// WebSocket Handling
const wss = new Server({ server });
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log(message);
    });
});

server.listen(port, () => console.log(`Free Radish Client is listening on port ${port}`));
