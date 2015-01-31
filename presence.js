
// shamelessly lifted from https://github.com/rauchg/weplay-presence
// Thanks guillermo

var redis = require('./redis').presence();
var io = require('socket.io-emitter')(redis, {key: 'xpemu'});
var interval = process.env.COMPUTER_INTERVAL || 5000;

console.log("\nI'm starting to accumulate connections for you ...\n");

setInterval(function() {
  redis.hgetall('computer:connections', function(err, counts) {
    if (!counts) return;

    var count = 0;
    for (var i in counts) count += Number(counts[i]);

    redis.set('computer:connections-total', count);
    io.emit('connections', count);
  });
}, interval);
