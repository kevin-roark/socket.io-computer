
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
var waitingForTurn = false;
var hasTurn = false;
var turnInt;

$(window).resize(resize);
function resize() {
  var wdiff = $(window).width() - chWidth;
  if (wdiff > 0) {
    var left = wdiff / 2;
    $('#window-chrome').css('left', left + 'px');
    $('#xp-window').css('left', (left + 60)  + 'px');
    $('.turn-timer').css('left', (left + 10) + 'px');
  }

  var hdiff = $(window).height() - chHeight;
  if (hdiff > 0) {
    var top = hdiff / 3;
    $('#window-chrome').css('top', top + 'px');
    $('#xp-window').css('top', (top + 20) + 'px');
    $('.turn-timer').css('top', (top + 20 + chHeight) + 'px');
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

    if(!hasTurn && !waitingForTurn) {
      waitingForTurn = true;
      io.emit('turn-request', new Date());
      xp.addClass('waiting');
    }

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

function giveTurn() {
  focused =  true;
  hasTurn = true;
  waitingForTurn = false;
  xp.removeClass('waiting');
  xp.addClass('focused');
  if (turnInt)
    clearInterval(turnInt);
  $('.turn-timer').html('');
}

function removeTurn() {
  hasTurn = false;
  focused = false;
  xp.removeClass('focused');
}

function getQemuPos(ev) {
  var rect = xp.get(0).getBoundingClientRect();

  var x = ev.clientX - rect.left;
  var y = ev.clientY - rect.top;

  x *= natWidth / imWidth;
  y *= natHeight / imHeight;

  return {x: x, y: y};
}

io.on('your-turn', function() {
  giveTurn();
});

io.on('lose-turn', function() {
  removeTurn();
});

io.on('turn-ack', function(time) {
  var dots = '';
  turnInt = setInterval(function() {
    time -= 1000;
    var seconds = Math.floor(time / 1000);
    if (seconds <= 0) {
      clearInterval(turnInt);
      $('.turn-timer').html('');
    } else {
      if (dots.length < 3)
        dots += '.';
      else
        dots = '';

      $('.turn-timer').html('Waiting for turn in ~' + seconds + ' seconds' + dots);
    }
  }, 1000);
});

$(document).keydown(function(ev) {
  if (!focused || !hasTurn) return;

  ev.preventDefault();
  var qemuKey = keymap.qemukey(ev.keyCode);
  if(qemuKey) {
    console.log(qemuKey);
    io.emit('keydown', qemuKey);
  }
});

$(document).keyup(function(ev) {
  if (!focused || !hasTurn) return;

  ev.preventDefault();
  keymap.keyup(ev.keyCode);
});

$(document).mousemove(function(ev) {
  if (!focused || !hasTurn) return;

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
  if (!hasTurn) return;
  if (!checkFocus(ev)) return;

  ev.preventDefault();

  // start a click
  var state = keymap.mouseclick(ev);
  io.emit('mouseclick', state);
});

$(document).mouseup(function(ev) {
  if (!focused || !hasTurn) return;

  ev.preventDefault();

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
