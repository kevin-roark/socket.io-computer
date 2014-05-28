var turnQueue = [];
var activeTurn = false;
var redis = require('./redis').emu();

var TURN_TIME = 15000;

module.exports.push = function(sockid) {
  turnQueue.push(sockid);
}

module.exports.checkQueue = checkQueue;
function checkQueue(newReq) {
  var io = require('socket.io-emitter')(redis, {key: 'xpemu'});

  if (!activeTurn && turnQueue.length >= 1) {
    activeTurn = true;
    var sockid = turnQueue.shift();
    io = io.in(sockid);
    io.emit('your-turn');

    setTimeout(function() {
      io.emit('lose-turn');
      activeTurn = false;
      checkQueue(false);
    }, TURN_TIME);

  } else if (newReq) {
    var time = turnQueue.length * TURN_TIME;
    var sockid = turnQueue[turnQueue.length - 1];
    io = io.in(sockid);
    io.emit('turn-ack', time);
  }
}
