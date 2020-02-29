console.log("Initializing node server...");
process.env.NODE_PATH = "../node_modules";
require("module").Module._initPaths();
var fs = fs || require('fs');
eval(fs.readFileSync(__dirname+'/server_modules.js')+'');

// Used for various SSL handling
global.ssl_info = { 
  enabled:false,
  ssl_domain: ServerConfig.get('ssl_domain'),
  ssl_email: ServerConfig.get('ssl_email')
};
if(!global.ssl_info.ssl_domain || !global.ssl_info.ssl_email) {
  console.error("No SSL domain/email defined in server config (ssl_domain, ssl_email).\nThis server won't be running in SSL.");
} else {
  try {
    global.ssl_info.key = fs.readFileSync('/etc/letsencrypt/live/'+global.ssl_info.ssl_domain+'/privkey.pem','utf8');
    global.ssl_info.cert = fs.readFileSync('/etc/letsencrypt/live/'+global.ssl_info.ssl_domain+'/cert.pem','utf8');
    global.ssl_info.ca = fs.readFileSync('/etc/letsencrypt/live/'+global.ssl_info.ssl_domain+'/chain.pem','utf8');
    global.ssl_info.enabled = true;
  } catch(e) {
    console.error("There was a problem getting SSL keys for "+global.ssl_info.ssl_domain+".\nThis could be because the server is local.\nThis server won't be running in SSL.");
  }
}

// Valid source IP Addresses that can submit new trade messages
var whitelisted_sources = [
'127.0.0.1',
'10.10.10.1',
'142.44.211.74', // Greg
'176.248.118.201'// Me
];
var lock_file = __dirname+'/add.lock';
fs.unlink(lock_file,function(){});

var cached_message_log = "[]";
var ascalon_message_log = "[]";
var render_cache = {};
var compile_cache = {};
function renderFile(file,is_presearing) {
  compile_cache[file] = compile_cache[file] || Handlebars.compile(fs.readFileSync(file)+'');
  return compile_cache[file]({config:global.config,is_presearing:is_presearing});
}

var http_server;
var https_server;
var ws_server;
var wss_server;

global.stats = {
  server_started:new Date(),
  connected_sockets:0,
  most_connected_sockets:0
};
function getIP(req) {
  return (req.header('x-forwarded-for') || req.connection.remoteAddress).split(':').pop();
}
function isLocal(req) {
  return  getIP(req) == '127.0.0.1';
}
// Has this request object come from a trusted source?
function isValidTradeSource(req) {
  return  whitelisted_sources.indexOf(getIP(req)) != -1;
}
function isPreSearing(request) {
  if(typeof request.is_presearing != 'undefined')
    return request.is_presearing ? true : false;
  var referer = request.header ? request.header('Referer') : false;
  if(referer && /presear|ascalon/.test(referer))
    return true;
  if(typeof request.path == 'string' && /presear|ascalon/.test(request.path))
    return true;
  var host = false;
  if(request.hostname) host = request.hostname;
  else if(request.headers && request.headers.host) host = request.headers.host;
  else if(request.host) host = request.host;
  if(typeof host == 'string' && /presear|ascalon/.test(host))
    return true;
  return false;
}

function updateStats() {
  var ssl_sockets = 0;
  var non_ssl_sockets = 0;
  if(ws_server) {
    ws_server.clients.forEach(function(client) {
      if(client == ws_server)
        return;
      non_ssl_sockets++;
    });
  }
  if(wss_server) {
    wss_server.clients.forEach(function(client) {
      if(client == wss_server)
        return;
      ssl_sockets++;
    });
  }
  global.stats.connected_sockets = ssl_sockets + non_ssl_sockets;
  if(global.stats.connected_sockets > global.stats.most_connected_sockets ) {
    global.stats.most_connected_sockets = global.stats.connected_sockets;
    global.stats.most_connected_at = new Date();
  }
  global.stats.ssl_enabled = global.ssl_info.enabled ? 1 : 0;
  global.stats.ssl_domain = global.ssl_info.ssl_domain;
  global.stats.ssl_expiry = global.ssl_info.ssl_expiry;
  global.stats.status = "active";
  return new Promise(function(resolve,reject) {
    KamadanDB.query("SELECT max(t) t FROM kamadan_"+(new Date()).getUTCFullYear()).then(function(res) {
      if(!res.length)
        return;
      global.stats.last_trade_message = new Date(res[0].t);
    }).catch(function(e) {
      console.error(e);
    }).finally(function() {
      if(!global.stats.last_trade_message || global.stats.last_trade_message.getTime() < Date.now() - 36e5)
        global.stats.status = "stale";
      return resolve(global.stats);
    });
  });
}

var KamadanTrade = new TradeModule();
KamadanTrade.table_prefix = 'kamadan_';
var AscalonTrade = new TradeModule();
AscalonTrade.table_prefix = 'ascalon_';

function init(cb) {
	cb = cb || function(){}
	console.log("\n---------- Starting Web Server ----------\n");

	function configureWebServer(app) {
    'use strict';
		if(!app)	app = express();
		var limit_bytes = 1024*1024*1;	// 1 MB limit.
    if(ServerConfig.isLocal())
      app.use(morgan('dev'));			// Logging of HTTP requests to the console when they happen

    app.get('*',function(request, response,next){
      if(!request.secure && global.ssl_info.enabled && global.ssl_info.ssl_domain == request.hostname){
        console.log("redirected to https");
        response.writeHead(301, { "Location": "https://" + request.headers.host + request.url });
        response.end();
        return;
      }
      next();
    });
		//app.use(cookieParser());		// Used for parsing cookies (i.e. user tokens)
		// Set upper limits for request body via POST
    app.use(bodyParser.text({limit: limit_bytes, extended: true, parameterLimit:50000}));
		app.use(bodyParser.json({limit: limit_bytes, extended: true, parameterLimit:50000}));
		app.use(bodyParser.urlencoded({limit: limit_bytes, extended: true, parameterLimit:50000}));

		// Helper function for caching, and set ETag
		function expressCacheOptions(cache_time_ms) {
			var headers = {
				'Cache-Control': 'max-age='+(cache_time_ms/1000)+', immutable',
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
      res.set('X-Clacks-Overhead',"GNU Terry Pratchett"); // For Terry <3
      next();
    });
		//-----------------------------------
		// ACTUAL ROUTING BEGINS
		//-----------------------------------
		// We can afford to set cache to 2 weeks as long as we put the deployment_date into the path name (i.e. /css/test.css == /css20170101120101/test.css)
		// Deployment date is in format %Y%m%d%H%M%S and is found from ServerConfig.get('deployment_date')
		let two_week_cache = expressCacheOptions(14*24*60*60*1000);
    let two_year_cache = expressCacheOptions(2*365*24*60*60*1000);
		app.use('/.well-known/pki-validation',express.static(__dirname + '/.well-known/pki-validation'));
    app.use('/.well-known/acme-challenge',express.static(__dirname + '/.well-known/acme-challenge'));
		app.use(/^\/images([0-9]{14})?/,express.static(__dirname + '/images',two_year_cache));
		app.use(/^\/css([0-9]{14})?/,express.static(__dirname + '/css',two_year_cache));
		app.use(/^\/js([0-9]{14})?/,express.static(__dirname + '/js',two_year_cache));
		app.use(/^\/fonts([0-9]{14})?/,express.static(__dirname + '/fonts',two_year_cache));
		app.use('/favicon.ico',function(req,res,next) {return res.redirect(301,'/images/favicon.ico');});

    app.get('/stats',function(req,res) {
      updateStats().then(function(stats) {
        res.json(stats);
      }).catch(function(e) {
        res.json({"status":"error"});
      });;
    });
    
    app.post(['/','/add'],function(req,res) {
      res.end();
      if(!isValidTradeSource(req)) 
        return console.error("/add called from "+getIP(req)+" - naughty!");
      lockFile.lock(lock_file, {retries: 20, retryWait: 100}, (err) => {
        if(err) console.error(err);
        var is_pre = isPreSearing(req);
        var Trader = is_pre ? AscalonTrade : KamadanTrade;
        // Don't drop out on error; we'll unlock the stale file later
        Trader.addMessage(req).then(function(added_message) {
          if(!added_message) {
            console.log("No added message?");
            return; // Error adding message
          }
          try {
            added_message = JSON.stringify(added_message);
            if(added_message.length) {
              var sent_to = 0;
              if(ws_server) {
                ws_server.clients.forEach(function each(client) {
                  if (client == ws_server || client.readyState !== WebSocket.OPEN)
                    return;
                  if(is_pre != isPreSearing(client))
                    return;
                  client.send(added_message);
                  sent_to++;
                });
              }
              if(wss_server) {
                wss_server.clients.forEach(function each(client) {
                  if (client == wss_server || client.readyState !== WebSocket.OPEN)
                    return;
                  if(is_pre != isPreSearing(client))
                    return;
                  client.send(added_message);
                  sent_to++;
                });
              }
              console.log("Sent to "+sent_to+" connected sockets");
            }
            Trader.cached_message_log = JSON.stringify(Trader.live_message_log);
          } catch(e) {
            console.error(e);
          }
        }).catch(function(e) {
          console.error(e);
        }).finally(function() {
          lockFile.unlock(lock_file);
        });
      });
    });
    app.get('/', function(req,res) {
      res.send(renderFile(__dirname+'/index.html',isPreSearing(req)));
    });
    app.get('/s/:term/:from?/:to?', function(req,res) {
      var Trader = isPreSearing(req) ? AscalonTrade : KamadanTrade;
      Trader.search(req.params.term,req.params.from,req.params.to).then(function(rows) {
        res.json(rows);
      }).catch(function(e) {
        console.error(e);
        res.json([]);
      });
    });
    app.get('/u/:term/:from?/:to?', function(req,res) {
      var Trader = isPreSearing(req) ? AscalonTrade : KamadanTrade;
      var user = ((req.params.term || req.query.term)+'').replace(/^user:/,'');
      Trader.search('user:'+user,req.params.from,req.params.to).then(function(rows) {
        res.json(rows);
      }).catch(function(e) {
        console.error(e);
        res.json([]);
      });
    });
    app.get('/m',function(req,res) {
      var etag = req.header('if-none-match') || 'none';
      var Trader = isPreSearing(req) ? AscalonTrade : KamadanTrade;
      // 304 if no new messages
      if(!Trader.last_message)
        return res.status(304).end();
      if(etag == Trader.last_message.t)
        return res.status(304).end();
      //console.log(KamadanTrade.last_message);
      res.setHeader('ETag', Trader.last_message.t);
      
      // Return messages since last hash
      if(etag != 'none') {
        return res.json(Trader.getMessagesSince(etag));
      }
      // Otherwise return cached version
      res.setHeader('content-type', 'application/json; charset=utf-8');
      return res.send(cached_message_log);
    });
    
    
		return app;
	}
  function configureWebsocketServer(server) {
    var websrvr = new WebSocketServer({
      server: server
    });
    
    websrvr.on('connection', function(ws, request) {
      ws.is_presearing = isPreSearing(request);
      updateStats();
      ws.on('message', function(message) {
        if(!message.length) return;
        var obj;
        try {
          obj = JSON.parse(message);
        } catch(e) {
          console.error("Malformed websocket message");
          console.log(message);
          return;
        }
        var Trader = isPreSearing(ws) ? AscalonTrade : KamadanTrade;
        if(typeof obj.since != 'undefined') {
          var rows = Trader.getMessagesSince(obj.since || 'none');
          return ws.send(JSON.stringify({since:obj.since, num_results:rows.length,results:rows}));
        }
        if(typeof obj.query != 'undefined') {
          return Trader.search(obj.query,obj.from || 0, obj.to || 0).then(function(rows) {
            ws.send(JSON.stringify({query:obj.query, num_results:rows.length,results:rows}));
          }).catch(function(e) {
            console.error(e);
            ws.send(JSON.stringify({query:obj.query, num_results:0}));
          });
        }
      });
    });
    return websrvr;
  }

  var app = configureWebServer();
  if(global.ssl_info.enabled) {
    try {
      if(https_server) {
        https_server.close();
        https_server = null;
      }
      https_server = https.createServer({
        key: global.ssl_info.key,
        cert: global.ssl_info.cert,
        ca: global.ssl_info.ca
      });
      wss_server = configureWebsocketServer(https_server);
      https_server.on('request', app);
      https_server.listen(443, function() {
        console.log("https/wss server listening on port 443");
      });
      // Load a HTTP server, but only set up for redirection to https
      if(http_server) {
        http_server.close();
        http_server = null;
      }
    } catch(e) {
      global.ssl_info.enabled = false;
      console.error(e);
    }
  }
  // Fallback to normal http
  // - Do the listening
  if(http_server) {
    http_server.close();
    http_server = null;
  }
  http_server = require('http').createServer();
  ws_server = configureWebsocketServer(http_server);
  http_server.on('request', app);
  http_server.listen(80, function() {
    console.log("http/ws server listening on port 80");
  });
	console.log("\n--------------------------------\n");
	cb.apply(this);
}
preload().then(function() {
  // Check/renew SSL certificates daily.
  repeat_script('renew_ssl_certificates.js',864e5);
  KamadanTrade.init().then(function() {
    cached_message_log = JSON.stringify(KamadanTrade.live_message_log);
      AscalonTrade.init().then(function() {
        cached_message_log = JSON.stringify(AscalonTrade.live_message_log);
        init();
      });
  });
});