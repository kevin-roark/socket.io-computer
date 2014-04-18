
var $ = require('jquery');
var io = require('socket.io-client')(config.io);
var keymap = require('./keymap');
var blobToImage = require('./blob');

var xp = $('#xp-window');

xp.keydown(function(ev) {
  var qemuKey = keymap.qemukey(ev.keyCode);
  io.emit('keydown', qemuKey);
});

xp.keyup(function(ev) {
  keymap.keyup(ev.keyCode);
});

xp.mousemove(function(ev) {
  var delta = keymap.mousemove(ev.clientX, ev.clientY);
  io.emit('mousemove', delta);
});

xp.click(function(ev) {
  var state = keymap.mouseclick(ev.clientX, ev.clientY);
  io.emit('mouseclick', state);
});

var image = $('#xp-window img');
var lastImage;
io.on('frame', function(frame) {
  console.log('got a frame');
  if (lastImage && 'undefined' != typeof URL) {
    URL.revokeObjectURL(lastImage);
  }

  image.attr('src', blobToImage(frame));
  lastImage = image.attr('src');
});
