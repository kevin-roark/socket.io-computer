
var redis = require('redis');
var uri = process.env.COMPUTER_REDIS_URI || 'localhost:6379';
module.exports.uri = uri;
var pieces = uri.split(':');

module.exports.web = function() {
  return redis.createClient(pieces[1], pieces[0], {return_buffers: true});
}

module.exports.io = function() {
  return redis.createClient(pieces[1], pieces[0], {return_buffers: true});
};

module.exports.emu = function() {
  return redis.createClient(pieces[1], pieces[0], {return_buffers: true});
}
