document.addEventListener("DOMContentLoaded", function(event) {
    var socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

    var roomCode = '';
    var nickname = '';
    var vip = false;

    document.querySelector('#join-game-button').addEventListener('click', function() {
        document.querySelector('#form-roomcode-invalid').classList.add('hidden');
        roomCode = document.querySelector('#form-roomcode').value;
        nickname = document.querySelector('#form-name').value;
        var joinedMsg = {
            messageType: 'JOINED_ROOM',
            roomCode,
            nickname
        };
        socket.send(JSON.stringify(joinedMsg));
    });

    socket.onmessage = (event) => {
        var message = JSON.parse(event.data);
        // Only respond to messages intended for us
        if (message.roomCode == roomCode && message.nickname == nickname) {
            switch(message.messageType) {
            case 'ERROR_INVALID_ROOM':
                document.querySelector('#form-roomcode-invalid').classList.remove('hidden');
                break;
            case 'JOINED_ROOM_SUCCESS':
                vip = message.vip;
                document.querySelector('#room-code-form').classList.add('hidden');
                fetch('/debate.html')
                    .then((response) => {
                        return response.text();
                    })
                    .then((body) => {
                        document.querySelector('#game-content').innerHTML = body;
                        document.querySelector('#name-bar').innerHTML = nickname;
                    });
                break;
            }
        }
    };
});
