//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');
var mongoose = require('mongoose');
var configDB = require('./config/database.js');
var passport = require('passport');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var flash = require('connect-flash');
var moment = require('moment');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

// configuration ===============================================================
mongoose.connect(configDB.url); // connect to database
require('./config/passport')(passport); // passport configuration

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);
var chat = require('./app/models/chat');

router.use(express.static(path.resolve(__dirname, 'client')));
router.use(morgan('dev')); // log every request to the console
router.use(cookieParser()); // read cookies (needed for auth)
router.use(bodyParser()); // get information from html forms
router.set('view engine', 'ejs');

// passport
router.use(session({ secret: 'dfhgfjhgkjhdfe3256hge46' }));
router.use(passport.initialize());
router.use(passport.session());
router.use(flash());

// routes ======================================================================
require('./app/routes.js')(router, passport);

var messages = [];
var sockets = [];
var users = [];

io.on('connection', function(socket) {
  messages.forEach(function(data) {
    socket.emit('message', data);
  });

  sockets.push(socket);

  socket.on('disconnect', function() {
    users = users.filter(function (item) {
      return item.id !== socket.user.id;
    });
    io.emit('all-users', users);
    sockets.splice(sockets.indexOf(socket), 1);
  });

  socket.on('message-from-client', function(msg) {
    var text = String(msg || '');
    var time = moment();
    var time_format = time.format('DD MMM HH:mm');

    if (!text)
      return;
    
      var data = {
        name: socket.user.name,
        text: text,
        time: time_format,
        roomId: 'main'
      };

      console.log("Broadcasting: ", data);
      broadcast('message-from-server', data);
      messages.push(data);
  });
  
  socket.on('privateMessage-from-client', function(dataIn) {
    var text = String(dataIn.text || '');
    var time = moment();
    var time_format = time.format('DD MMM HH:mm');

    if (!text)
      return;

      var dataOut = {
        name: socket.user.name,
        text: text,
        time: time_format,
        roomId: dataIn.room
      };

      console.log("Broadcasting private message: ", dataOut.text + " to the room " + dataIn.room);
      //console.log(sockets.clients());
      io.to('priv/' + dataIn.room).emit('privateMessage-from-server', dataOut);
      console.log(dataOut);
      messages.push(dataOut);
  });

  socket.on('start-new-room', function(data) {
    console.log('Request to start new room from '+ data.requester.name + " for " + data.receiver.name );
    socket.broadcast.to('priv/' + data.receiver.id).emit('start-socket', data);
  })
  
  socket.on('subscribe', function(room) {
    console.log('joining room', room);
    socket.join(room);
  });
  
  socket.on('get-users', function() {
      socket.emit('all-users', users);
  });

  socket.on('join', function(user) {
    console.log(user);
    console.log(users);
    
    socket.user = user;
    users[socket.user.id] = socket;
    users.push(user);
    
    io.emit('all-users', users);
  });
});

function broadcast(event, data) {
  sockets.forEach(function(socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function() {
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
