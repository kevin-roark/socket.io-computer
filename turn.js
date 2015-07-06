var turnQueue = [];
var activeTurn = false;
var activeSocketId = module.exports.activeSocketId = null;
var redis = require('./redis').emu();

var TURN_TIME = 15000;

module.exports.push = function(sockid) {
	// Check if the socket ID is already in the queue
	if (turnQueue.indexOf(sockid) != -1 || sockid == module.exports.activeSocketId)
		return false;
  turnQueue.push(sockid);
  return true;
}

module.exports.checkQueue = checkQueue;
function checkQueue(newReq) {
  var io = require('socket.io-emitter')(redis, {key: 'xpemu'});

  if (!activeTurn && turnQueue.length >= 1) {
    activeTurn = true;
    var sockid = turnQueue.shift();
    io = io.in(sockid);
    io.emit('your-turn');
	// Change the active socket ID that has control over the VM
	module.exports.activeSocketId = sockid;

    setTimeout(function() {
      io.emit('lose-turn');
      activeTurn = false;
	  // Set the active socket ID to null
	  module.exports.activeSocketId = null;
      checkQueue(false);
    }, TURN_TIME);

  } else if (newReq) {
    var time = turnQueue.length * TURN_TIME;
    var sockid = turnQueue[turnQueue.length - 1];
    io = io.in(sockid);
    io.emit('turn-ack', time);
  }
}
