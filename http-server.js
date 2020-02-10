'use strict';

const express = require('express');

const app = express();

app.use(express.json());

// HTTP Routes
app.use(express.static('public'));
app.post('/api/post-event', (req, res) => {
    console.log(req.body);
    res.send(`Event Received`);
});
app.get('/api/', (req, res) => {
    res.send('gotcha');
});

module.exports = app;
