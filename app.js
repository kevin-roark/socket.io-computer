
var browserify = require('browserify-middleware');
var mustache = require('mustache-express');
var express = require('express');
var app = express();
var redis = require('./redis').web();

var port = process.env.COMPUTER_IO_WEB_PORT || 5000;

process.title = 'socket.io-computer';

app.listen(port);
console.log('listening on *:' + port);

app.engine('mustache', mustache());
app.set('views', __dirname + '/views');

if ('development' == process.env.NODE_ENV) {
  app.use('/build.js', browserify('./client/main.js'));
}

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  if (req.socket.listeners('error').length) return next();
  req.socket.on('error', function(err) {
    console.error(err.stack);
  });
  next();
});

var url = process.env.COMPUTER_IO_URL || 'http://localhost:6001';
app.get('/', function(req, res, next) {
  redis.get('computer:frame', function(err, image) {
    if (err) return next(err);
    redis.get('computer:connections-total', function(err, total) {
      if (err) return next(err);
      res.render('index.mustache', {
        img: image ? image.toString('base64') : '',
        count: total,
        io: url
      });
    });
  });
});
