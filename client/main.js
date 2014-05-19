/*global config,URL*/

var $ = require('jquery');
var io = require('socket.io-client')(config.io);
var keymap = require('./keymap');
var blobToImage = require('./blob');

var xp = $('.xp-image');
var imWidth = parseInt(xp.width(), 10);
var imHeight = parseInt(xp.height(), 10);
var chWidth = 650;
var chHeight = 440;
var TURN_TIME = 15000;

var natWidth, natHeight;

var focused = false;
var waitingForTurn = false;
var hasTurn = false;
var turnInt;

function inRect(rect, ev) {
  return ev.clientX > rect.left && ev.clientX < rect.right
    && ev.clientY > rect.top && ev.clientY < rect.bottom;
}

var turnRequestPos;
var buttonsState = 0;

function checkFocus(ev) {
  var rect = xp.get(0).getBoundingClientRect();
  if (!focused && inRect(rect, ev)) {

    var pos = getPos(ev);

    if(!hasTurn && !waitingForTurn) {
      waitingForTurn = true;
      io.emit('turn-request', new Date());
      xp.addClass('waiting');
      turnRequestPos = pos;
      return focused;
    }

    focused =  true;
    xp.addClass('focused');
    io.emit('pointer', pos.x, pos.y, buttonsState);
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
  $('body').css('cursor', 'crosshair');
  if (turnInt) {
    clearInterval(turnInt);
    $('.turn-timer').html('');
  }
  waitingTimer('Your turn expires', TURN_TIME, false);
  var pos = turnRequestPos;
  io.emit('pointer', pos.x, pos.y, buttonsState);
}

function removeTurn() {
  hasTurn = false;
  focused = false;
  if (turnInt) {
    clearInterval(turnInt);
    $('.turn-timer').html('');
  }
  xp.removeClass('focused');
  $('body').css('cursor', 'default');
}

function getPos(ev) {
  var rect = xp.get(0).getBoundingClientRect();

  var x = ev.clientX - rect.left;
  var y = ev.clientY - rect.top;

  //x *= natWidth / imWidth;
  //y *= natHeight / imHeight;

  if (x < 0) x = 0;
  if (y < 0) y = 0;
  if (x > imWidth) x = imWidth;
  if (y > imHeight) y = imHeight;

  var pos = {x: Math.round(x / imWidth * natWidth), y: Math.round(y / imHeight * natHeight)};
  return pos;
}

io.on('your-turn', function() {
  giveTurn();
});

io.on('lose-turn', function() {
  removeTurn();
});

io.on('turn-ack', function(time) {
  waitingTimer('Waiting for turn', time, true);
});

function waitingTimer(text, ms, dot) {
  var dots = '';
  turnInt = setInterval(function() {
    ms -= 1000;
    var seconds = Math.floor(ms / 1000);
    if (seconds <= 0) {
      clearInterval(turnInt);
      $('.turn-timer').html('');
    } else {
      if (dots.length < 3)
        dots += '.';
      else
        dots = '';

      var str = text + ' in ~' + seconds + ' seconds';
      if (dot) str += dots;
      $('.turn-timer').html(str);
    }
  }, 1000);
}

$(document).keydown(function(ev) {
  if (!focused || !hasTurn) return;

  ev.preventDefault();
  var qemuKey = keymap.qemukey(ev.keyCode);
  if(qemuKey) {
    io.emit('keydown', qemuKey);
  }
});

$(document).keyup(function(ev) {
  if (!focused || !hasTurn) return;

  ev.preventDefault();
  keymap.keyup(ev.keyCode);
});

$(document).mousemove(function(ev) {
  if (!hasTurn) return;

  var rect = xp.get(0).getBoundingClientRect();
  if (inRect(rect, ev)) {
    $('body').css('cursor', 'crosshair');
  } else {
    $('body').css('cursor', 'default');
    return;
  }

  if (!natWidth || !natHeight) {
    return;
  }

  var pos = getPos(ev);
  io.emit('pointer', pos.x, pos.y, buttonsState);
});

$(document).mousedown(function(ev) {
  buttonsState |= getMouseMask(ev);

  //if (!checkFocus(ev)) return;
  checkFocus(ev);
  if (!hasTurn) return;

  ev.preventDefault();

  var pos = getPos(ev);
  io.emit('pointer', pos.x, pos.y, buttonsState);
});

$(document).mouseup(function(ev) {
  buttonsState ^= getMouseMask(ev);

  //if (!focused || !hasTurn) return;
  if(!hasTurn) return;

  ev.preventDefault();

  // click is finished
  var pos = getPos(ev);
  io.emit('pointer', pos.x, pos.y, buttonsState);
});

function getMouseMask(ev){
  var bmask;
  // from novnc
  if (ev.which) {
    /* everything except IE */
    bmask = 1 << ev.button;
  } else {
    /* IE including 9 */
    bmask = (ev.button & 0x1) +      // Left
            (ev.button & 0x2) * 2 +  // Right
            (ev.button & 0x4) / 2;   // Middle
  }
  return bmask;
}

var image = $('#xp-window img');
image.bind('contextmenu', function(e){
  return false;
});

var lastImage;
io.on('frame', function(frame) {
  var src = blobToImage(frame);
  if (!src) return;
  if (lastImage && 'undefined' != typeof URL) {
    URL.revokeObjectURL(lastImage);
  }

  image[0].src = blobToImage(frame);
  lastImage = image[0].src;
  getDimensions(image);
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
