express     = require('express');
bodyParser  = require('body-parser');
KamadanTrade = require(__dirname+'/KamadanTrade.class.js').KamadanTrade;
morgan      = require('morgan');
WebSocketServer = require('ws').Server;
ServerConfig = require(__dirname+'/ServerConfig.class.js');
lockFile = require('lockfile');
https = require('https');

String.prototype.unUnicodeArray = String.prototype.unUnicodeArray || function() {
  var str = this.trim();
  if(/^\[.*\]$/.test(str)) {
    // This is an array or char codes e.g. [19712, 27448, 19734, 58931456]
    try {
      var arr = JSON.parse(str); // Should be parsable
      var new_str = '';
      for(var i in arr) {
        new_str += String.fromCharCode(arr[i]);
      }
      str = new_str;
    } catch(e) {
      // idgaf
    }
  }
  return str;
}