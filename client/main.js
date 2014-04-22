
var $ = require('jquery');
var io = require('socket.io-client')(config.io);
var keymap = require('./keymap');
var blobToImage = require('./blob');

var xp = $('.xp-image');
var imWidth = 320;
var imHeight = 240;
var chWidth = 442;
var chHeight = 310;

var natWidth, natHeight;

var focused = false;

$(document).resize(resize);
function resize() {
  var wdiff = $(window).width() - chWidth;
  if (wdiff > 0) {
    $('#window-chrome').css('left', wdiff / 2 + 'px');
    $('#xp-window').css('left', (wdiff / 2 + 60)  + 'px');
  }

  var hdiff = $(window).height() - chHeight;
  if (hdiff > 0) {
    $('#window-chrome').css('top', hdiff / 2 + 'px');
    $('#xp-window').css('top', (hdiff / 2 + 20) + 'px');
  }
}
resize();

function inRect(rect, ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var p = 20; // padding

  if (x <= rect.left - p || x >= rect.right + p || y <= rect.top - p || y >= rect.bottom + p)
    return false;
  return true;
}

function checkFocus(ev) {
  var rect = xp.get(0).getBoundingClientRect();
  if (!focused && inRect(rect, ev)) {
    focused =  true;
    xp.addClass('focused');
    var pos = getQemuPos(ev);
    io.emit('mousemove', pos);
  } else if (focused && !inRect(rect, ev)) {
    focused = false;
    xp.removeClass('focused');
  }
  return focused;
}

function getQemuPos(ev) {
  var rect = xp.get(0).getBoundingClientRect();

  var x = ev.clientX - rect.left;
  var y = ev.clientY - rect.top;


  x *= natWidth / imWidth;
  y *= natHeight / imHeight;

  return {x: x, y: y};
}

$(document).keydown(function(ev) {
  if (!focused) return;

  ev.preventDefault();
  var qemuKey = keymap.qemukey(ev.keyCode);
  if(qemuKey) {
    console.log(qemuKey);
    io.emit('keydown', qemuKey);
  }
});

$(document).keyup(function(ev) {
  if (!focused) return;

  ev.preventDefault();
  keymap.keyup(ev.keyCode);
});

$(document).mousemove(function(ev) {
  if (!focused) return;

  var rect = xp.get(0).getBoundingClientRect();
  if (!inRect(rect, ev)) {
    return;
  }

  if (!natWidth || !natHeight) {
    return;
  }

  var pos = getQemuPos(ev);
  io.emit('mousemove', pos);
});

$(document).mousedown(function(ev) {
  if (!checkFocus(ev)) return;

  // start a click
  var state = keymap.mouseclick(ev);
  io.emit('mouseclick', state);
});

$(document).mouseup(function(ev) {
  if (!focused) return;

  // click is finished
  io.emit('mouseclick', keymap.blankState);
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
    getDimensions(image);
  }
});

function getDimensions(im) {
  if (!natHeight || !natWidth) {
    natHeight = im[0].naturalHeight;
    natWidth = im[0].naturalWidth;
    setTimeout(function() {
      getDimensions(im);
    }, 50);
  }
}
