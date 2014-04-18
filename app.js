
var browserify = require('browserify-middleware');
var mustache = require('mustache-express');
var express = require('express');
var app = express();

var port = 3000;

process.title = 'socket.io-computer';

app.listen(port);
console.log('listening on *:' + port);

app.engine('mustache', mustache());
app.set('views', __dirname + '/views');

if ('development' == process.env.NODE_ENV) {
  app.use('/build.js', browserify('./client/main.js'));
}

app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next){
  req.socket.on('error', function(err){
    console.error(err.stack);
  });
  next();
});

var url = process.env.COMPUTER_IO_URL || 'http://localhost:3001';
app.get('/', function(req, res, next){
  res.render('index.mustache', {
    //img: image.toString('base64'),
    io: url
  });
});
