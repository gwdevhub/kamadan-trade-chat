express     = require('express');
bodyParser  = require('body-parser');
KamadanTrade = require(__dirname+'/KamadanTrade.class.js').KamadanTrade;
morgan      = require('morgan');
WebSocketServer = require('ws').Server;
ServerConfig = require(__dirname+'/ServerConfig.class.js');
lockFile = require('lockfile');
https = require('https');