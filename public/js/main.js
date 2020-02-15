document.addEventListener("DOMContentLoaded", function(event) {
    var socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

    var roomCode = '';
    var nickname = '';
    var inGame = false;
    var vip = false;
    var roundId = '';

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
        var nick = "";
        if (message.nickname) {
            nick = message.nickname.toLowerCase();
        }
        // Only respond to messages intended for our game
        if (room == roomCode) {
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
                if (nick == nickname) {
                    // We've joined!
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
                }
            break;
            case 'GAME_STARTED':
                document.querySelector('#pre-game').classList.add('hidden');
                document.querySelector('#waiting-for-instructions').classList.remove('hidden');
                document.querySelector('#skip-instructions-button').addEventListener('click', function handler() {
                    var messageToGame = {
                        messageType: 'SEND_GAME_DATA',
                        roomCode,
                        nickname,
                        dataType: "SKIP_INSTRUCTIONS"
                    };
                    socket.send(JSON.stringify(messageToGame));
                    this.removeEventListener('click', handler);
                });
            break;
            case 'GAME_TO_PLAYER':
                if (message.dataType == "DEBATE_TOPICS") {
                    showDebateInputs(message);
                }
            break;
            case 'SEND_BROADCAST':
                if (message.dataType == "ALL_PLAYERS_READY") {
                    document.querySelector('#waiting-for-other-players').classList.add("hidden");
                }
                if (message.dataType == "DEBATE_ROUND_STARTING") {
                    document.querySelector('#pre-voting').classList.remove("hidden");
                    document.querySelector('#pre-voting p').classList.remove("hidden");
                    document.querySelector('#voting').classList.add("hidden");
                    document.querySelector('#post-voting').classList.add("hidden");
                    displayTheirsAndMine(message);
                }
                if (message.dataType == "START_VOTING") {
                    document.querySelector('#pre-voting').classList.add("hidden");
                    document.querySelector('#voting').classList.remove("hidden");
                    displayTheirsAndMine(message);
                    var voteLeftButton = document.querySelector('#vote-left-button');
                    var voteRightButton = document.querySelector('#vote-right-button');
                    voteLeftButton.innerHTML = message.leftChoice;
                    voteRightButton.innerHTML = message.rightChoice;
                    voteLeftButton.addEventListener('click', function handler() {
                        document.querySelector('#voting .theirs').classList.add("hidden");
                        document.querySelector('#post-voting').classList.remove("hidden");
                        var messageToGame = {
                            messageType: 'SEND_GAME_DATA',
                            roomCode,
                            nickname,
                            dataType: "PLAYER_VOTE",
                            roundId,
                            choice: message.leftChoice
                        };
                        socket.send(JSON.stringify(messageToGame));
                        this.removeEventListener('click', handler);
                    });
                    voteRightButton.addEventListener('click', function handler() {
                        document.querySelector('#voting .theirs').classList.add("hidden");
                        document.querySelector('#post-voting').classList.remove("hidden");
                        var messageToGame = {
                            messageType: 'SEND_GAME_DATA',
                            roomCode,
                            nickname,
                            dataType: "PLAYER_VOTE",
                            roundId,
                            choice: message.rightChoice
                        };
                        socket.send(JSON.stringify(messageToGame));
                        this.removeEventListener('click', handler);
                    });
                }
                if (message.dataType == "GAME_OVER") {
                    document.querySelector('#voting').classList.add("hidden");
                    document.querySelector('#post-voting').classList.add("hidden");
                    document.querySelector('#post-game').classList.remove("hidden");
                    document.querySelector('#game-reset-button').addEventListener('click', function() {
                        var messageToGame = {
                            messageType: 'SEND_BROADCAST',
                            roomCode,
                            nickname,
                            dataType: "RESET_GAME"
                        };
                        socket.send(JSON.stringify(messageToGame));
                    });
                }
                if (message.dataType == "RESET_GAME") {
                    location.reload();
                }
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
                messageType: 'START_GAME_REQUEST',
                roomCode,
                nickname
            };
            socket.send(JSON.stringify(startMsg));
        });
    }

    function showDebateInputs(message) {
        roundId = message.roundId;

        document.querySelector('#waiting-for-instructions').classList.add('hidden');
        document.querySelector('#make-arguments').classList.remove('hidden');
        document.querySelector('#argument-for-topic').innerHTML = message.yours;
        document.querySelector('#argument-against-topic').innerHTML = message.theirs;

        var forSubmitButton = document.querySelector('#submit-argument-for-button');
        var forInputField = document.querySelector('#argument-for-input');
        var againstSubmitButton = document.querySelector('#submit-argument-against-button');
        var againstInputField = document.querySelector('#argument-against-input');

        forInputField.addEventListener('input', function() {
            if (forInputField.value.length == 0) {
                forSubmitButton.classList.add('disabled');
            } else {
                forSubmitButton.classList.remove('disabled');
            }
        });
        againstInputField.addEventListener('input', function() {
            if (againstInputField.value.length == 0) {
                againstSubmitButton.classList.add('disabled');
            } else {
                againstSubmitButton.classList.remove('disabled');
            }
        });

        forSubmitButton.addEventListener('click', function() {
            document.querySelector('#argument-for').classList.add('hidden');
            document.querySelector('#argument-against').classList.remove('hidden');
        });

        againstSubmitButton.addEventListener('click', function() {
            document.querySelector('#make-arguments').classList.add("hidden");
            document.querySelector('#waiting-for-other-players').classList.remove("hidden");
            var messageToGame = {
                messageType: 'SEND_GAME_DATA',
                roomCode,
                nickname,
                dataType: "DEBATE_ARGUMENTS",
                roundId,
                argumentFor: forInputField.value,
                argumentAgainst: againstInputField.value
            };
            socket.send(JSON.stringify(messageToGame));
        });
    }

    function displayTheirsAndMine(message) {
        if (message.roundId == roundId) {
            document.querySelectorAll('.theirs').forEach((item, i) => {
                item.classList.add('hidden');
            });
            document.querySelectorAll('.mine').forEach((item, i) => {
                item.classList.remove('hidden');
            });
        } else {
            document.querySelectorAll('.mine').forEach((item, i) => {
                item.classList.add('hidden');
            });
            document.querySelectorAll('.theirs').forEach((item, i) => {
                item.classList.remove('hidden');
            });
        }
    }

});
