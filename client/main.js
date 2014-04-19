
var $ = require('jquery');
var io = require('socket.io-client')(config.io);
var keymap = require('./keymap');
var blobToImage = require('./blob');

var xp = $('.xp-image');

$(document).keydown(function(ev) {
  var qemuKey = keymap.qemukey(ev.keyCode);
  console.log(qemuKey);
  io.emit('keydown', qemuKey);
});

$(document).keyup(function(ev) {
  keymap.keyup(ev.keyCode);
});

$(document).mousemove(function(ev) {
  var delta = keymap.mousemove(ev.clientX, ev.clientY);
  io.emit('mousemove', delta);
});

$(document).click(function(ev) {
  var state = keymap.mouseclick(ev.clientX, ev.clientY);
  io.emit('mouseclick', state);
});

var image = $('#xp-window img');
var lastImage;
io.on('frame', function(frame) {
  var src = blobToImage(frame);
  if (src) {
    if (lastImage && 'undefined' != typeof URL) {
      URL.revokeObjectURL(lastImage);
    }

    image.attr('src', blobToImage(frame));
    lastImage = image.attr('src');
  }
});
