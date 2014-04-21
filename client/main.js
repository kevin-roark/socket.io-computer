
var $ = require('jquery');
var io = require('socket.io-client')(config.io);
var keymap = require('./keymap');
var blobToImage = require('./blob');

var xp = $('.xp-image');

$(document).resize(resize);
function resize() {
  var wdiff = $(window).width() - 1200;  
  if (wdiff > 0) {
    $('#window-chrome').css('left', wdiff / 2 + 'px');
    $('#xp-window').css('left', (wdiff / 2 + 300)  +'px');
  }

  var hdiff = $(window).height() - 720;
  if (hdiff > 0) {
    $('#window-chrome').css('top', hdiff / 2 + 'px');
    $('#xp-window').css('top', (hdiff / 2 + 110) + 'px');
  }
}
resize();

$(document).keydown(function(ev) {
  var qemuKey = keymap.qemukey(ev.keyCode);
  console.log(qemuKey);
  if(qemuKey)
    io.emit('keydown', qemuKey);
});

$(document).keyup(function(ev) {
  keymap.keyup(ev.keyCode);
});

$(document).mousemove(function(ev) {
  var delta = keymap.mousemove(ev.clientX, ev.clientY);
  io.emit('mousemove', delta);
});

$(document).mousedown(function(ev) {
  var state = keymap.mouseclick(ev);
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
