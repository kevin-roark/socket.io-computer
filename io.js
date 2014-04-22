
var sio = require('socket.io');
var debug = require('debug');

var TURN_TIME = 15000;

process.title = 'socket.io-computer-io';

var port = process.env.COMPUTER_IO_PORT || 6001;
var io = module.exports = sio(port);
console.log('listening on *:' + port);

// redis socket.io adapter
var uri = require('redis').uri;
io.adapter(require('socket.io-redis')(uri, {key: 'xpemu'}));

// redis queries instance
var redis = require('./redis').io();

var uid = process.env.COMPUTER_IO_SERVER_UID || port;
debug('server uid %s', uid);

var turnQueue = [];
var activeTurn = false;

function checkQueue(newReq) {
  if (!activeTurn) {
    activeTurn = true;
    var sock = turnQueue.shift();
    sock.emit('your-turn');
    setTimeout(function() {
      sock.emit('lose-turn');
      activeTurn = false;
      checkQueue(false);
    }, TURN_TIME);
  } else if (newReq) {
    var time = queue.length * TURN_TIME;
    var sock = turnQueue[turnQueue.length - 1];
    sock.emit('turn-ack', time);
  }
}

io.total = 0;
io.on('connection', function(socket) {
  var req = socket.request;

  // send keypress to emulator
  socket.on('keydown', function(key){
    redis.publish('computer:keydown', key);
  });

  // send mouse move to emulator
  socket.on('mousemove', function(move) {
    var mstr = move.x + ':' + move.y;
    redis.publish('computer:mousemove', mstr);
  });

  // mouse click to emulator
  socket.on('mouseclick', function(state) {
    redis.publish('computer:click', state);
  });

  socket.on('turn-request', function(time) {
    turnQueue.push(socket);
    checkQueue(true);
  });

});

// socket broadcast shortcut
function broadcast(socket/*, …*/){
  var args = Array.prototype.slice.call(arguments, 1);
  socket.broadcast.emit.apply(socket, args);
}
