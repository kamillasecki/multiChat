(function() {
    /*global angular*/
    /*global CryptoJS*/
    /*global io*/
    /*global $*/

    var app = angular.module('chatApp', []);
    app.controller('ChatController', [
        '$scope', '$compile',
        function($scope, $compile) {

            var socket = io.connect();
            var keySize = 256;
            var ivSize = 128;
            var iterations = 100;

            $scope.messages = [];
            $scope.roster = [];
            $scope.user = {};
            $scope.user.name = $('.uname').text();
            $scope.user.id = $('.uid').text();
            $scope.text = '';
            $scope.secret = '';

            socket.on('connect', function() {
                socket.emit('join', $scope.user);
                socket.emit('get-users');
                socket.emit('subscribe', 'priv/' + $scope.user.id);
                console.log("Connnecting")
            });

            socket.on('message-from-server', function(msg) {
                console.log("Received new message ");
                $scope.messages.push(msg);
                $scope.$apply();
            });

            socket.on('privateMessage-from-server', function(data) {
                console.log("Received new private message from " + data.name + " : " + data.text + " to be displayed in room :" + data.roomId);
                if ($scope.secret !== '') {
                    console.log("Decrypting: " + data.text);
                    $scope.decrypt(data.text, $scope.secret);
                    data.text = $scope.decrypted
                }
                $scope.messages.push(data);
                $scope.$apply();
            });

            socket.on('start-socket', function(data) {
                console.log("Received new chat request to join: priv/" + data.receiver.id + data.requester.id);
                $scope.newRoomFromServer(data);
                socket.emit('subscribe', 'priv/' + data.receiver.id + data.requester.id);
            });

            $scope.newRoomFromServer = function(data) {
                $('.nav-tabs').append('<li role="presentation"><a href="#' + data.requester.id + '" aria-controls="' + data.requester.id + '" role="tab" data-toggle="tab">' + data.requester.name + '</a></li>');
                var html = '<div role="tabpanel" class="tab-pane" id="' + data.requester.id + '">' +
                    '<table class="table table-striped table-bordered">' +
                    '<thead>' +
                    '<tr>' +
                    '<th class="col-md-2">Name</th>' +
                    '<th class="col-md-7">Message</th>' +
                    '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                    '<tr ng-repeat="msg in messages | filter:{roomId:\'' + data.receiver.id + data.requester.id + '\'}">' +
                    '<td class="col-md-2">' +
                    '<p>{{msg.name}}:</p>' +
                    '<p>' +
                    '<h6><small>{{msg.time}}</small></h6>' +
                    '</p>' +
                    '</td>' +
                    '<td class="col-md-7">{{msg.text}}</td>' +
                    '</tr>' +
                    '</tbody>' +
                    '</table>' +
                    '<div class="row">' +
                    '<form ng-submit="sendPrivate(\'' + data.receiver.id + data.requester.id + '\')" class="col-md-12">' +
                    '<input class="form-control col-md-9" ng-model="text" placeholder="Message" type="text">' +
                    '<button class="btn btn-primary col-md-3" ng-disabled="!text" type="submit">Send</button>' +
                    '</div>' +
                    '</form>' +
                    '</div>' +
                    '</div>';
                $('.tab-content').append($compile(html)($scope));
            }

            $scope.newRoom = function newRoom(receiver_id, receiver_name) {
                $('.nav-tabs').append('<li role="presentation"><a href="#' + receiver_id + '" aria-controls="' + receiver_id + '" role="tab" data-toggle="tab">' + receiver_name + '</a></li>');
                var html = '<div role="tabpanel" class="tab-pane" id="' + receiver_id + '">' +
                    '<table class="table table-striped table-bordered">' +
                    '<thead>' +
                    '<tr>' +
                    '<th class="col-md-2">Name</th>' +
                    '<th class="col-md-7">Message</th>' +
                    '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                    '<tr ng-repeat="msg in messages | filter:{roomId:\'' + receiver_id + $scope.user.id + '\'}">' +
                    '<td class="col-md-2">' +
                    '<p>{{msg.name}}:</p>' +
                    '<p>' +
                    '<h6><small>{{msg.time}}</small></h6>' +
                    '</p>' +
                    '</td>' +
                    '<td class="col-md-7">{{msg.text}}</td>' +
                    '</tr>' +
                    '</tbody>' +
                    '</table>' +
                    '<div class="row controls">' +
                    '<form ng-submit="sendPrivate(\'' + receiver_id + $scope.user.id + '\')" class="col-md-12">' +
                    '<input class="form-control col-md-9" ng-model="text" placeholder="Message" type="text">' +
                    '<button class="btn btn-primary col-md-3" ng-disabled="!text" type="submit">Send</button>' +
                    '</div>' +
                    '</form>' +
                    '</div>' +
                    '</div>';
                $('.tab-content').append($compile(html)($scope));

                //subscribing requester to new private chat room
                console.log('Joining new room:priv/' + receiver_id + $scope.user.id);
                socket.emit("subscribe", "priv/" + receiver_id + $scope.user.id);
                //requesting receiver to join new room
                socket.emit('start-new-room', { receiver: { id: receiver_id, name: receiver_name }, requester: $scope.user });
            }


            socket.on('all-users', function(users) {
                $scope.roster = users.filter(function(item) {
                    return item.id !== $scope.user.id;
                });

                $scope.$apply();
            });

            $scope.send = function send() {
                console.log('Sending message:', $scope.text);
                $scope.encrypt($scope.text, $scope.secret)
                socket.emit('message-from-client', $scope.text);
                $scope.text = '';

            };

            $scope.sendPrivate = function(room) {
                console.log('Sending private message to room : ', room);
                if ($scope.secret !== '') {
                    $scope.encrypt($scope.text, $scope.secret)
                    socket.emit('privateMessage-from-client', { text: $scope.encrypted, room: room });

                }
                else {
                    socket.emit('privateMessage-from-client', { text: $scope.text, room: room });
                }

                $scope.text = '';
            };

            $scope.encrypt = function(input, password) {

                var salt = CryptoJS.lib.WordArray.random(128 / 8);
                console.log("SALT:", salt.toString());
                var key = CryptoJS.PBKDF2(password, salt, {
                    keySize: keySize / 32,
                    iterations: iterations
                });
                console.log("KEY:", key.toString());
                var iv = CryptoJS.lib.WordArray.random(128 / 8);
                console.log("IV:", iv.toString());
                var encrypted = CryptoJS.AES.encrypt(input, key, {
                    iv: iv,
                    padding: CryptoJS.pad.Pkcs7,
                    mode: CryptoJS.mode.CBC
                });
                console.log("ENCRYPTED:", encrypted.toString());
                var transitmessage = salt.toString() + iv.toString() + encrypted.toString();

                $scope.message = input;
                $scope.encrypted = transitmessage;
            }

            $scope.decrypt = function(message, pass) {
                if (pass != null) {
                    var salt = CryptoJS.enc.Hex.parse(message.substr(0, 32));
                    var iv = CryptoJS.enc.Hex.parse(message.substr(32, 32))
                    var encrypted = message.substring(64);

                    var key = CryptoJS.PBKDF2(pass, salt, {
                        keySize: keySize / 32,
                        iterations: iterations
                    });

                    var decrypted = CryptoJS.AES.decrypt(encrypted, key, {
                        iv: iv,
                        padding: CryptoJS.pad.Pkcs7,
                        mode: CryptoJS.mode.CBC
                    })
                    try {
                        $scope.decrypted = decrypted.toString(CryptoJS.enc.Utf8);
                    }
                    catch (ex) {
                        if (decrypted.toString() != "") {
                            $scope.decrypted = decrypted.toString();
                        }
                        else {
                            $scope.decrypted = message;
                        }
                    }
                }
            }

        }
    ]);
}());
