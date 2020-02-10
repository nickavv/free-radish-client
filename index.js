const express = require('express');
const ws = require('ws');
const http = require('http');

const app = express();
const port = 8524;

const server = http.createServer(app);
server.listen(8523);
const wss = new ws.Server({ server })

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

// WebSocket Handling
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log(message);
    });
});

app.listen(port, () => console.log(`Free Radish Client is listening on port ${port}`));
