document.addEventListener("DOMContentLoaded", function(event) {
    var socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

    var roomCode = '';
    var nickname = '';
    var inGame = false;
    var vip = false;

    document.querySelector('#join-game-button').addEventListener('click', function() {
        document.querySelector('#form-roomcode-invalid').classList.add('hidden');
        document.querySelector('#form-name-invalid').classList.add('hidden');
        roomCode = document.querySelector('#form-roomcode').value.toLowerCase();
        nickname = document.querySelector('#form-name').value.toLowerCase();
        var joinedMsg = {
            messageType: 'ROOM_JOIN_REQUEST',
            roomCode,
            nickname
        };
        socket.send(JSON.stringify(joinedMsg));
    });

    socket.onmessage = (event) => {
        var message = JSON.parse(event.data);
        var room = message.roomCode.toLowerCase();
        var nick = message.nickname.toLowerCase();
        // Only respond to messages intended for us
        if (room == roomCode && nick == nickname) {
            switch(message.messageType) {
            case 'ERROR_INVALID_ROOM':
                document.querySelector('#form-roomcode-invalid').classList.remove('hidden');
            break;
            case 'ERROR_NAME_TAKEN':
                if (!inGame) {
                    document.querySelector('#form-name-invalid').classList.remove('hidden');
                }
            break;
            case 'PLAYER_JOINED':
                inGame = true;
                vip = message.vip;
                document.querySelector('#room-code-form').classList.add('hidden');
                fetch('/debate.html')
                    .then((response) => {
                        return response.text();
                    })
                    .then((body) => {
                        document.querySelector('#game-content').innerHTML = body;
                        initializeDebateGame();
                    });
            break;
            }
        }
    };

    window.onbeforeunload = function() {
        var disconnectedMsg = {
            messageType: 'DISCONNECTED',
            roomCode,
            nickname
        }
        socket.send(JSON.stringify(disconnectedMsg));
        socket.onclose = function () {}; // disable onclose handler first
        socket.close();
    };

    // Once the HTML for the debate game has loaded, set up all our listeners and such
    function initializeDebateGame() {
        document.querySelector('#name-bar span').innerHTML = nickname;
        if (vip == false) {
            document.querySelectorAll('.vip-only').forEach((item, i) => {
                item.classList.add('hidden');
            });
        } else {
            document.querySelectorAll('.non-vips').forEach((item, i) => {
                item.classList.add('hidden');
            });
        }

        document.querySelector('#all-in-button').addEventListener('click', function() {
            var startMsg = {
                messageType: 'GAME_STARTED',
                roomCode,
                nickname
            };
            socket.send(JSON.stringify(startMsg));
        });
    }
});
