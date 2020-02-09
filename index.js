const express = require('express');
const app = express();
const port = 8284;

app.use(express.json());

app.post('/api/post-event', (req, res) => {
    console.log(req.body);
    res.send(`Event Received`);
});

app.get('/api/', (req, res) => {
    res.send('gotcha');
});

app.listen(port, () => console.log(`Free Radish Client is listening on port ${port}`));
