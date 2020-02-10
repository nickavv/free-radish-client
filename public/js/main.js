document.addEventListener("DOMContentLoaded", function(event) {
    var socket = new WebSocket(`ws://${window.location.hostname}:8523`);

    document.getElementById('join-game-button').addEventListener('click', function() {
        var roomCode = document.getElementById('form-roomcode').value;
        var nickname = document.getElementById('form-name').value;
        socket.send(`${nickname} joined room ${roomCode}`);
        document.getElementById('room-code-form').classList.add('hidden');
    });
});
