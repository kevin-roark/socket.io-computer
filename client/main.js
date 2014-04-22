
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

function inRect(rect, ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var p = 60; // padding


  if (x <= rect.left - p || x >= rect.right + p || y <= rect.top - p || y >= rect.bottom + p)
    return false;
  return true;
}

$(document).keydown(function(ev) {
  ev.preventDefault();
  var qemuKey = keymap.qemukey(ev.keyCode);
  console.log(qemuKey);
  if(qemuKey)
    io.emit('keydown', qemuKey);
});

$(document).keyup(function(ev) {
  ev.preventDefault();
  keymap.keyup(ev.keyCode);
});

$(document).mousemove(function(ev) {
  var rect = xp.get(0).getBoundingClientRect();
  if (!inRect(rect, ev)) {
    keymap.updateMouse(rect);
    return;
  }

  var delta = keymap.mousemove(ev.clientX, ev.clientY);
  io.emit('mousemove', delta);
});

$(document).mousedown(function(ev) {
  var state = keymap.mouseclick(ev);
  io.emit('mouseclick', state);
  
  // turn click off after 20 ms (simulate a click)
  setTimeout(function() {
    io.emit('mouseclick', keymap.blankState);
  }, 20);
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
