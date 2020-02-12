express     = require('express');
bodyParser  = require('body-parser');
KamadanTrade = require(__dirname+'/KamadanTrade.class.js').KamadanTrade;
morgan      = require('morgan');
WebSocketServer = require('ws').Server;
/*
mongoose    = require(__dirname+'/app/OneQDatabase.js');
evalStr = '';
for(model_name in mongoose.connection.models)
	evalStr += "if(typeof "+model_name+" == 'undefined') "+model_name+" = mongoose.model('"+model_name+"');\n";
eval(evalStr);
PebbleEmailer = mongoose.model('Email');
passport	= require('passport');
require(__dirname+'/config/passport')(passport);
moment 		= require('moment');
stringify 	= require('csv-stringify');
path 		= require('path');
cookieParser = require('cookie-parser');
exec = require('child_process').exec;
mime = require('mime-types');
minify = require('express-minify');
url = require('url');
request = require('request');
http = require('http');
http.globalAgent.maxSockets = Math.max(http.globalAgent.maxSockets,20);  
https = require('https');
https.globalAgent.maxSockets = Math.max(https.globalAgent.maxSockets,20);  
uglifycss = require('uglifycss');
uglifyjs = require("uglify-js");
OneQShopify = require(__dirname+'/js/OneQShopify.class.js');
OneQVideo = require(__dirname+'/js/OneQVideo.class.js').OneQVideo;
ServerConfig = require(__dirname+'/../ServerConfig.class.js');
OneQSitemap = require(__dirname+'/app/OneQSitemap.class.js');
// Include various helper functions.
OneQ_TemplateParser = require(__dirname+'/app/OneQ_TemplateParser.class.js');
OneQ_BackendAPI = require(__dirname+'/app/OneQ_BackendAPI.class.js').init(ServerConfig.get());
jwt         = require('jwt-simple');


process.binding('http_parser').HTTPParser = require('http-parser-js').HTTPParser;*/