
var $ = require('jquery');
var io = require('socket.io-client')();
var keymap = require('./keymap');

var xp = $('#xp-window');

xp.keydown(function(ev) {
  var qemuKey = keymap.qemukey(ev.keyCode);
  io.emit('keydown', qemuKey);
});

xp.keyup(function(ev) {
  keymap.keyup(ev.keyCode);
});

xp.mousemove(function(ev) {
  
});

io.on('frame', function(frame) {

});
