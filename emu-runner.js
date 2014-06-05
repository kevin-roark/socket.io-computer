var forever = require('forever-monitor');

function startEmu() {
  var child = new (forever.Monitor)('emu.js', {
      max: 1,
      silent: false,
      options: []
  });

  child.on('exit', function () {
    console.log('THE EMULATOR DIED');
    setTimeout(function() {
      startEmu();
    }, 500);
  });

  child.start();
}

startEmu();
