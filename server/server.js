console.log("Initializing node server...");
process.env.NODE_PATH = "/home/node_modules";
require("module").Module._initPaths();
var fs = fs || require('fs');

function loadModules(cb) {
	cb = cb || function(){};
	console.log("\n---------- Loading Modules via require() ----------\n");
	eval(fs.readFileSync(__dirname+'/server_modules.js')+'');
	console.log("\n--------------------------------\n");
	return cb.apply(this);
}
function loadHelperFunctions(cb) {
	cb = cb || function(){};
	console.log("\n---------- Loading Helper Functions/Classes ----------\n");
	var helper_functions = [
		__dirname+'/String.class.js'
	]
	for(var i in helper_functions)
		console.log(helper_functions[i]), eval(fs.readFileSync(helper_functions[i])+'');
	console.log("\n--------------------------------\n");
	return cb.apply(this);
}
function init(cb) {
  KamadanTrade.init();
	cb = cb || function(){}
	console.log("\n---------- Starting Web Server ----------\n");
  var wss = new WebSocketServer({ port: 9090 });
	function configureWebServer(app) {
    'use strict';
		if(!app)	app = express();
		var limit_bytes = 1024*1024*1;	// 1 MB limit.

		app.use(morgan('dev'));			// Logging of HTTP requests to the console when they happen
		//app.use(cookieParser());		// Used for parsing cookies (i.e. user tokens)
		// Set upper limits for request body via POST
		app.use(bodyParser.json({limit: limit_bytes, extended: true, parameterLimit:50000}));
		app.use(bodyParser.urlencoded({limit: limit_bytes, extended: true, parameterLimit:50000}));

		// Helper function for caching, and set ETag
		function expressCacheOptions(cache_time_ms) {
			var headers = {
				'Cache-Control': 'public, max-age='+(cache_time_ms/1000),
				'Expires':new Date(Date.now()+cache_time_ms).toUTCString()
			}
			return {
				etag:'strong',
				setHeaders:function(res) {
					res.set(headers);
				}
			}
		}
		app.set('etag', 'strong');
		app.set('x-powered-by', false);
    app.use(function (req, res, next) {  
      res.removeHeader("date");
      next();
    });
		//-----------------------------------
		// ACTUAL ROUTING BEGINS
		//-----------------------------------
		// We can afford to set cache to 2 weeks as long as we put the deployment_date into the path name (i.e. /css/test.css == /css20170101120101/test.css)
		// Deployment date is in format %Y%m%d%H%M%S and is found from ServerConfig.get('deployment_date')
		let two_week_cache = expressCacheOptions(14*24*60*60*1000);
    let two_year_cache = expressCacheOptions(2*365*24*60*60*1000);
		app.use('/.well-known/pki-validation',express.static(__dirname + '/.well-known/pki-validation',two_week_cache));
		app.use(/^\/images([0-9]{14})?/,express.static(__dirname + '/images',two_year_cache));
		app.use(/^\/css([0-9]{14})?/,express.static(__dirname + '/css',two_year_cache));
		app.use(/^\/js([0-9]{14})?/,express.static(__dirname + '/js',two_year_cache));
		app.use(/^\/fonts([0-9]{14})?/,express.static(__dirname + '/fonts',two_year_cache));
		app.use('/favicon.ico',function(req,res,next) {return res.redirect(301,'/images/favicon.ico');});
		
    var cached_message_log = JSON.stringify(KamadanTrade.live_message_log);
    
    function getIP(req) {
      return (req.header('x-forwarded-for') || req.connection.remoteAddress).split(':').pop();
    }
    function isLocal(req) {
      return  getIP(req) == '127.0.0.1';
    }
    
    app.get('/kill',function(req,res) {
      res.end();
      if(!isLocal(req)) 
        return console.error("POST called from "+getIP(req)+" - naughty!");
      process.exit();
    });
    
    app.post(['/','/add'],function(req,res) {
      res.end();
      if(!isLocal(req)) 
        return console.error("POST called from "+getIP(req)+" - naughty!");
      try { 
        var added_message = JSON.stringify(KamadanTrade.addMessage(req));
        if(added_message.length) {
          wss.clients.forEach(function each(client) {
            client.send(added_message);
          });
        }
      } catch(e) { 
        console.error(e);
      }
      cached_message_log = JSON.stringify(KamadanTrade.live_message_log);
    });
    app.get('/', function(req,res) {
      res.sendFile(__dirname+'/index.html');
    });
    app.get('/s/:term', function(req,res) {
      var term = ((req.params.term || req.query.term || '')+'').toLowerCase();
      KamadanTrade.search(term).then(function(rows) {
        res.json(rows);
      }).catch(function(e) {
        console.error(e);
        res.json([]);
      });
    });
    app.get('/u/:user', function(req,res) {
      var user = ((req.params.user || req.query.user || '')+'').toLowerCase();
      console.log("By user: "+user);
      KamadanTrade.getMessagesByUser(user).then(function(rows) {
        res.json(rows);
      }).catch(function(e) {
        console.error(e);
        res.json([]);
      });
    });
    app.get('/m',function(req,res) {
      var etag = req.header('if-none-match') || 'none';
      // 304 if no new messages
      if(KamadanTrade.last_message) {
        if(etag == KamadanTrade.last_message.h)
          return res.status(304).end();
        //console.log(KamadanTrade.last_message);
        res.setHeader('ETag', KamadanTrade.last_message.h);
      }
      // Return messages since last hash
      if(etag != 'none') {
        return res.json(KamadanTrade.getMessagesSince(etag));
      }
      // Otherwise return cached version
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.send(cached_message_log);
    });
		return app;
	}
	var listen_ports = [80];
	for(var i in listen_ports) {
		configureWebServer().listen(listen_ports[i]);
		console.log("Listening for connections on port "+listen_ports[i]);
	}
	console.log("\n--------------------------------\n");
	cb.apply(this);
}
loadModules();
loadHelperFunctions();
init();