/*global config,URL*/

var $ = require('jquery');
var io = require('socket.io-client')(config.io);
var keymap = require('./keymap');
var blobToImage = require('./blob');
var Queue = require('queue3');

var xp = $('.xp-image');
var imWidth = parseInt(xp.width(), 10);
var imHeight = parseInt(xp.height(), 10);
var chWidth = 650;
var chHeight = 440;
var TURN_TIME = 15000;

var natWidth = 800;
var natHeight = 600;

var focused = false;
var waitingForTurn = false;
var hasTurn = false;
var turnInt;

function inRect(rect, ev) {
  // iphone
  if (ev.originalEvent) ev = ev.originalEvent;
  if (null == ev.clientX) {
    ev.clientX = ev.layerX;
    ev.clientY = ev.layerY;
  }

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

  // iphone
  if (ev.originalEvent) ev = ev.originalEvent;
  if (null == ev.clientX) {
    ev.clientX = ev.layerX;
    ev.clientY = ev.layerY;
  }

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

var eventDown = 'ontouchstart' in document ? 'touchstart' : 'mousedown';

$(document).bind(eventDown, function(ev) {
  buttonsState |= getMouseMask(ev);

  //if (!checkFocus(ev)) return;
  checkFocus(ev);
  if (!hasTurn) return;

  ev.preventDefault();

  var pos = getPos(ev);
  io.emit('pointer', pos.x, pos.y, buttonsState);

  if ('ontouchend' in document) {
    buttonsState ^= getMouseMask(ev);
    io.emit('pointer', pos.x, pos.y, buttonsState);
  }
});

if ('onmouseup' in document) {
  $(document).mouseup(function(ev) {
    buttonsState ^= getMouseMask(ev);

    //if (!focused || !hasTurn) return;
    if(!hasTurn) return;

    ev.preventDefault();

    // click is finished
    var pos = getPos(ev);
    io.emit('pointer', pos.x, pos.y, buttonsState);
  });
}

function getMouseMask(ev){
  if ('ontouchstart' in document) return 1;

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

xp.bind('contextmenu', function(e){
  return false;
});

var lastImage;
var replaced;
var canvas;
var ctx;

var image = $('.xp-image img');
var queue = new Queue({ concurrency: 1 });

io.on('raw', function(frame) {
  queue.push(function(fn){
    var src = blobToImage(frame.image);
    if (!src) return;

    var img = document.createElement('img');
    img.src = src;
    img.onload = function(){
      if (!replaced) {
        canvas = document.createElement('canvas');
        canvas.width = natWidth;
        canvas.height = natHeight;
        image.replaceWith(canvas);
        ctx = canvas.getContext('2d');
        replaced = true;
      }

      ctx.drawImage(img, frame.x, frame.y);

      if ('undefined' != typeof URL) {
        URL.revokeObjectURL(src);
      }

      fn();
    };
  });
});

io.on('copy', function(rect){
  queue.push(function(fn){
    var imgData = ctx.getImageData(rect.src.x, rect.src.y, rect.width, rect.height);
    ctx.putImageData(imgData, rect.x, rect.y);
    fn();
  });
});

io.on('connections', function(count) {
  console.log('got connections: ' + count);
  $('.count').text(count);
});
