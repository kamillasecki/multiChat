 var app = angular.module('chatApp', []);
 app.controller('ChatController', [
     '$scope', '$compile',
     function($scope, $compile) {

         var socket = io.connect();

         $scope.messages = [];
         $scope.roster = [];
         $scope.user = {};
         $scope.user.name = '<% if (user.local.name) { %><%= (user.local.name) %><% } else { if (user.facebook.name) { %><%= (user.facebook.name) %><% } else { if (user.google.name) { %><%= (user.google.name) %><% }}} %>';
         $scope.user.id = '<%= (user._id) %>'
         $scope.text = '';
         $scope.room = '';

         socket.on('connect', function() {
             $scope.setUser();
             console.log("Connnecting")
         });

         socket.on('message-from-server', function(msg) {
             $scope.messages.push(msg);
             $scope.$apply();
         });

         $scope.newRoom = function newRoom(conversation_id) {
             $(".nav-tabs").append('<li role="presentation"><a href="#' + conversation_id + '" aria-controls="' + conversation_id + '" role="tab" data-toggle="tab">' + conversation_id + '</a></li>');
             var html = '<div role="tabpanel" class="tab-pane" id="' + conversation_id + '">' +
                 '<table class="table table-striped table-bordered">' +
                 '<thead>' +
                 '<tr>' +
                 '<th class="span2">Name</th>' +
                 '<th class="span5">Text</th>' +
                 '<th class="span2">Time</th>' +
                 '</tr>' +
                 '</thead>' +
                 '<tbody>' +
                 '<tr ng-repeat="pmsg in pMessages">' +
                 '<td class="span2" ng-bind="pmsg.name"></td>' +
                 '<td class="span5" ng-bind="pmsg.text"></td>' +
                 '<td class="span2" ng-bind="pmsg.time"></td>' +
                 '</tr>' +
                 '</tbody>' +
                 '</table>' +
                 '<div class="row controls">' +
                 '<form ng-submit="sendPrivate()">' +
                 '<div class="input-append span7">' +
                 '<input type="text" class="span6" ng-model="text" placeholder="Message">' +
                 //'<input type="hidden" name="room" value="{{' + conversation_id + '}}" />'+
                 '<input type="submit" class="span1 btn btn-primary" value="Send" ng-disabled="!text">' +
                 '</div>' +
                 '</form>' +
                 '</div>' +
                 '</div>';
             $('.tab-content').append($compile(html)($scope));

             socket.emit('start-new-room', conversation_id);
         }

         socket.on('roster', function(users) {
             $scope.roster = users;
             $scope.$apply();
         });

         $scope.send = function send() {
             console.log('Sending message:', $scope.text);
             socket.emit('message-from-client', $scope.text);
             $scope.text = '';
         };

         $scope.sendPrivate = function() {
             console.log('Sending private message: ', $scope.text + 'to room: ' + $scope.room);
             //socket.emit('message-from-client', $scope.text);
             //$scope.text = '';
         };



         $scope.setUser = function setName() {
             socket.emit('identify', $scope.user);
         };
     }
 ]);
 