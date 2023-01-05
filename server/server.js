console.log("Initializing node server...");
process.env.NODE_PATH = "../node_modules";
require("module").Module._initPaths();
var fs = fs || require('fs');
eval(fs.readFileSync(__dirname+'/server_modules.js')+'');

// Used for various SSL handling
global.ssl_info = {
  enabled:false,
  ssl_domains: {},
  ssl_email: ServerConfig.get('ssl_email')
};
let ssl_domains = ServerConfig.get('ssl_domains') || [ServerConfig.get('ssl_domain')];
for(let i in ssl_domains) {
  if(!ssl_domains[i]) continue;
  if(!global.ssl_info.ssl_email) {
    console.error("No SSL email defined in server config (ssl_email).\nThis server won't be running in SSL.");
    break;
  }
  global.ssl_info.ssl_domains[ssl_domains[i]] = { enabled:false }
  try {
    global.ssl_info.ssl_domains[ssl_domains[i]].key = fs.readFileSync('/etc/letsencrypt/live/'+ssl_domains[i]+'/privkey.pem','utf8');
    global.ssl_info.ssl_domains[ssl_domains[i]].cert = fs.readFileSync('/etc/letsencrypt/live/'+ssl_domains[i]+'/fullchain.pem','utf8');
    //global.ssl_info.ssl_domains[ssl_domains[i]].ca = fs.readFileSync('/etc/letsencrypt/live/'+ssl_domains[i]+'/chain.pem','utf8');
    global.ssl_info.ssl_domains[ssl_domains[i]].secureContext = require('tls').createSecureContext({
      key:  global.ssl_info.ssl_domains[ssl_domains[i]].key,
      cert: global.ssl_info.ssl_domains[ssl_domains[i]].cert
    });
    global.ssl_info.ssl_domains[ssl_domains[i]].enabled = true;
    global.ssl_info.key = global.ssl_info.key || global.ssl_info.ssl_domains[ssl_domains[i]].key;
    global.ssl_info.cert = global.ssl_info.cert || global.ssl_info.ssl_domains[ssl_domains[i]].cert;
    //global.ssl_info.key = global.ssl_info.ca || global.ssl_info.ssl_domains[ssl_domains[i]].ca;
    global.ssl_info.enabled = true;
  } catch(e) {
    console.error("There was a problem getting SSL keys for "+ssl_domains[i]+".\nThis could be because the server is local.\nThis server won't be running in SSL.");
    log_error(e);
  }
}
//console.log(global.ssl_info);

// Valid source IP Addresses that can submit new trade messages
let whitelisted_sources = [
    '1',
'127.0.0.1',
'10.10.10.1',
'142.44.211.74', // Greg
'81.101.64.164'// Me
];
let blacklisted_ips = [
  //'162.158.*.*'
];
let sockets_by_ip = {

}
let lock_file = __dirname+'/add.lock';
fs.unlink(lock_file,function(){});

let render_cache = {};
let compile_cache = {};

Handlebars.registerHelper("relativeTime", function(t) {
  return (new Date(t)).relativeTime();
});
Handlebars.registerHelper("toJson", function(t) {
  return JSON.stringify(t);
});
function renderFile(file,args) {
  compile_cache[file] = compile_cache[file] || Handlebars.compile(fs.readFileSync(file)+'');
  if(ServerConfig.isLocal())
    compile_cache[file] = Handlebars.compile(fs.readFileSync(file)+'');
  args = args || {};
  args.config = global.config;
  args.is_presearing = isPreSearing(args.req);
  return compile_cache[file](args);
}

let http_server;
let https_server;
let ws_server;
let wss_server;
let last_search_by_ip = {

};

global.stats = {
  server_started:new Date(),
  connected_sockets:0,
  most_connected_sockets:0
};
function getUserAgent(req) {
  let ua = '';
  if(typeof req.headers == 'function')
    ua = req.headers('user-agent');
  else if(typeof req.headers != 'undefined')
    ua = req.headers['user-agent'];
  else if(typeof req.get == 'function')
    ua = req.get('user-agent');
  return ua;
}
function getIP(req) {
  let ip = req.connection.remoteAddress;
  if(typeof req.header != 'undefined')
    ip = req.header('x-forwarded-for') || ip;
  return ip.split(':').pop();
}
function isLocal(req) {
  return  getIP(req) == '127.0.0.1';
}
// Should this request be gzip compressed?
function shouldCompress (req, res) {
  if(/stats/.test(req.url))
    return false; // Disabled for /stats endpoint.
  return compression.filter(req, res);
}
// Has this request object come from a trusted source?
function isValidTradeSource(req) {
  return isWhitelisted(req);
}
function isWhitelisted(req) {
  return whitelisted_sources.indexOf(getIP(req)) != -1;
}
function isBlacklisted(req) {
  let ip = getIP(req);
  if(!ip) return true;
  let parts = /([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/.exec(ip);
  if(!parts) return false;
  let wildcards = [
    parts[1] + '.*.*.*',
    parts[1] + '.' + parts[2] + '.*.*',
    parts[1] + '.' + parts[2] + '.' + parts[3] + '.*',
    ip
  ];
  for(let i in wildcards) {
    if(blacklisted_ips.indexOf(wildcards[i]) != -1)
      return true;
  }
  return false;
}
function isPreSearing(request) {
  if(typeof request.is_presearing != 'undefined')
    return request.is_presearing ? true : false;
  let referer = request.header ? request.header('Referer') : false;
  if(referer && /presear|ascalon/.test(referer))
    return true;
  if(typeof request.path == 'string' && /presear|ascalon/.test(request.path))
    return true;
  let host = false;
  if(request.hostname) host = request.hostname;
  else if(request.headers && request.headers.host) host = request.headers.host;
  else if(request.host) host = request.host;
  if(typeof host == 'string' && /presear|ascalon/.test(host))
    return true;
  return false;
}

function extendedStats() {
  let getSocketInfo = function(ws) {
    let info = {};
    for(let i in ws) {
      if(i.indexOf('_') == 0)
        continue;
      info[i] = ws[i];
    }
    return info;
  }
  let extended_stats = {sockets:{ws:[],wss:[]}};
  if(ws_server) {
    ws_server.clients.forEach(function(client) {
      if(client == ws_server)
        return;
      extended_stats.sockets.ws.push(getSocketInfo(client));
    });
  }
  if(wss_server) {
    wss_server.clients.forEach(function(client) {
      if(client == wss_server)
        return;
      extended_stats.sockets.wss.push(getSocketInfo(client));
    });
  }
  return extended_stats;
}

async function updateStats() {
  let ssl_sockets = 0;
  let non_ssl_sockets = 0;
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
  global.stats.ssl_domains = [];
  for(let i in global.ssl_info.domains) {
    if(!global.ssl_info.domains.enabled) continue;
    global.stats.ssl_domains.push(i);
  }
  global.stats.status = "active";

  try {
    let res = await KamadanDB.query("SELECT max(t) t FROM kamadan_"+(new Date()).getUTCFullYear());
    if(res.length)
       global.stats.last_trade_message = new Date(res[0].t);
  } catch(e) {
    console.error(e);
  }
  if(!global.stats.last_trade_message || global.stats.last_trade_message.getTime() < Date.now() - 36e5)
    global.stats.status = "stale";
  return global.stats;
}

let KamadanTrade = new TradeModule();
KamadanTrade.table_prefix = 'kamadan_';
let AscalonTrade = new TradeModule();
AscalonTrade.table_prefix = 'ascalon_';

// Middleware
function redirectSSL(request, response,next){
   if(/stats/.test(request.url))
    return next(); // Disabled for /stats endpoint.
  if(!request.secure && global.ssl_info.ssl_domains[request.hostname] && global.ssl_info.ssl_domains[request.hostname].enabled){
    console.log("redirected "+request.headers.host + request.url+" to https");
    response.writeHead(301, { "Location": "https://" + request.headers.host + request.url });
    response.end();
    return;
  }
  next();
}

// Websocket functions
function configureWebsocketServer(server) {
  let websrvr = new WebSocketServer({
    server: server
  });

  function heartbeat() {
    this.isAlive = true;
  }

  websrvr.on('connection', function(ws, request) {
    ws.is_presearing = isPreSearing(request);
    ws.compression='none';
    ws.isAlive = true;
    ws.ip = getIP(request);
    ws.ua = getUserAgent(request);
    ws.recv = 0;
    if(isBlacklisted(request)) {
      console.log("Rejecting blacklisted websocket "+getIP(request));
      dropSocket(ws);
      return;
    }
    sockets_by_ip[ws.ip] = sockets_by_ip[ws.ip] || [];
    while(sockets_by_ip[ws.ip].length > 3) {
      // 3 socket per ip.
      dropSocket(sockets_by_ip[ws.ip].shift());
    }
    sockets_by_ip[ws.ip].push(ws);
    ws.on('pong', heartbeat);
    updateStats();
    ws.on('message', function(message) {
      return onWebsocketMessage(message,ws);
    });
  });
  const interval = setInterval(function ping() {
    websrvr.clients.forEach(function each(ws) {
      if (ws.isAlive === false) {
        dropSocket(ws);
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  return websrvr;
}
function dropSocket(client) {
  console.log("Dropping socket "+client.ip+", "+client.ua);
  var i = client.ip && sockets_by_ip[client.ip] ? sockets_by_ip[client.ip].indexOf(client) : -1;
  if(i != -1) {
    sockets_by_ip[client.ip].splice(i,1);
  }
  client.terminate();
}
async function onWebsocketMessage(message,ws) {
  ws.isAlive = true;
  ws.recv++;
  if(typeof message != 'object') {
    if(!message.length) return;
    if(ws.compression == 'lz') {
      console.log("Decompressed websocket message\n",message+'',message = LZString.decompress(message));
    }
    try {
      message = JSON.parse(message);
    } catch(e) {
      console.error("Malformed websocket message");
      console.log(message);
      return;
    }
  }
  if(message.compression)
    ws.compression = message.compression;
  if(message.send_prices)
    ws.send_prices = 1;
  let Trader = isPreSearing(ws) ? AscalonTrade : KamadanTrade;
  if(typeof message.since != 'undefined') {
    let rows = Trader.getMessagesSince(message.since || 'none');
    return ws.send(JSON.stringify({since:message.since, num_results:rows.length,results:rows}));
  }
  if(typeof message.query != 'undefined') {
    let rows = [];
    if((last_search_by_ip[ws.ip] || 0) < 4) {
      last_search_by_ip[ws.ip] = last_search_by_ip[ws.ip] || 0;
      last_search_by_ip[ws.ip]++;
      try {
        if((last_search_by_ip[ws.ip] || 0) < 4) {
          rows = await Trader.search(message.query,message.from || 0, message.to || 0);
        }
      } catch(e) {
        console.error(e);
      }
      delete last_search_by_ip[ws.ip];
    }
    return ws.send(JSON.stringify({query:message.query, num_results:rows.length,results:rows}));
  }
}
function pushPrices(prices,is_pre) {
  try {
    prices = JSON.stringify(prices);
  } catch(e) {
    prices = '';
  }
  if(!prices.length)
    return;
  let compressed = {
    none:prices,
    lz:LZString.compressToUTF16(prices)
  };
  let sent_to = 0;
  if(ws_server) {
    ws_server.clients.forEach(function each(client) {
      if (client == ws_server || client.readyState !== WebSocket.OPEN)
        return;
      if(is_pre != isPreSearing(client))
        return;
      if(!client.send_prices)
        return;
      client.send(compressed[client.compression] || compressed['none']);
      sent_to++;
    });
  }
  if(wss_server) {
    wss_server.clients.forEach(function each(client) {
      if (client == wss_server || client.readyState !== WebSocket.OPEN)
        return;
      if(is_pre != isPreSearing(client))
        return;
      if(!client.send_prices)
        return;
      client.send(compressed[client.compression] || compressed['none']);
      sent_to++;
    });
  }
}
function pushMessage(added_message,is_pre) {
  try {
    added_message = JSON.stringify(added_message);
  } catch(e) {
    added_message = '';
  }
  if(!added_message.length)
    return;
  let compressed = {
    none:added_message,
    lz:LZString.compressToUTF16(added_message)
  };
  let sent_to = 0;
  if(ws_server) {
    ws_server.clients.forEach(function each(client) {
      if (client == ws_server || client.readyState !== WebSocket.OPEN)
        return;
      if(is_pre != isPreSearing(client))
        return;
      client.send(compressed[client.compression] || compressed['none']);
      sent_to++;
    });
  }
  if(wss_server) {
    wss_server.clients.forEach(function each(client) {
      if (client == wss_server || client.readyState !== WebSocket.OPEN)
        return;
      if(is_pre != isPreSearing(client))
        return;
      client.send(compressed[client.compression] || compressed['none']);
      sent_to++;
    });
  }
}

// Promisified lockFile.
function lock() {
  return new Promise(function(resolve,reject) {
    lockFile.lock(lock_file, {retries: 20, retryWait: 100}, (err) => {
      if(err) {
        // Don't drop out on error; we'll unlock the stale file later
        console.error(err);
      }
      return resolve();
    });
  });
}
function unlock() {
  lockFile.unlock(lock_file);
}

// Webserver functions
function configureWebServer(app) {
  'use strict';
  if(!app)	app = express();
  let limit_bytes = 1024*1024*1;	// 1 MB limit.
  //if(ServerConfig.isLocal())
 //   app.use(morgan('dev'));			// Logging of HTTP requests to the console when they happen
  if(typeof compression != 'undefined') {
    app.use(compression({ filter: shouldCompress }))

  }
  app.use(compression())
  app.get(redirectSSL);
  app.use(bodyParser.text({limit: limit_bytes, extended: true, parameterLimit:50000}));
  app.use(bodyParser.json({limit: limit_bytes, extended: true, parameterLimit:50000}));
  app.use(bodyParser.urlencoded({limit: limit_bytes, extended: true, parameterLimit:50000}));

  // Helper function for caching, and set ETag
  function expressCacheOptions(cache_time_ms) {
    let headers = {
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
  app.use(/^\/\.well-known/, express.static(__dirname + '/.well-known'));
  app.use(/^\/images([0-9]{14})?/,express.static(__dirname + '/images',two_year_cache));
  app.use(/^\/css([0-9]{14})?/,express.static(__dirname + '/css',two_year_cache));
  app.use(/^\/js([0-9]{14})?/,express.static(__dirname + '/js',two_year_cache));
  app.use(/^\/fonts([0-9]{14})?/,express.static(__dirname + '/fonts',two_year_cache));
  app.use('/favicon.ico',function(req,res,next) {return res.redirect(301,'/images/favicon.ico');});
  app.get('/loaderio-41ff037f96c3dfe9e3c8a7d4634b6239',function(req,res) {
    res.send('loaderio-41ff037f96c3dfe9e3c8a7d4634b6239');
  });
  app.get('/quarantine',async function(req,res) {
      let from = (new Date()).toStartOfMonth();
      let end = (new Date()).toEndOfDay();
      let results = await KamadanTrade.getQuarantine(from.getTime(),end.getTime());
      let headers = Object.keys(results[0]);
      let csv = [];
      let line = [];
      csv.push(headers);
      for(let i in results) {
        line = [];
        for(let j in headers) {
          line.push(results[i][headers[j]]);
        }
        csv.push(line.toString());
      }
      res.attachment('quarantine_'+from.isoDate()+'_to_'+end.isoDate()+'.csv').send(csv.join("\n"));
  })
  app.post('/message',function(req,res) {
    res.end();
    let body = req.body || '';
    if(typeof body == 'string') {
      try {
        body = JSON.parse(body);
      } catch(e) {}
    }
    let type = parseInt(body.t || '99999');
    console.log("Message type "+type+": '"+(body.s || '')+"' '"+(body.m || '')+"'");
    switch(type) {
      case MessageType_Chat_Trade:
      case MessageType_PartySearch_Trade: // TODO: SPLIT THIS.
        return addMessage(req,res,type);
      case MessageType_Chat_All:
        return addMessage(req,res,Channel_All);
      case MessageType_Chat_Whisper:
        return addWhisper(req,res);
    }
  });
  app.post('/whisper',addWhisper);
  app.post(['/trader_quotes'],addTraderQuotes);
  app.post(['/','/add','/trade'],function(req,res) { return addMessage(req,res,Channel_Trade); });
  app.post(['/local'],function(req,res) { return addMessage(req,res,Channel_All); });
  app.get('/trader_quotes',getTraderQuotesJSON);
  app.get('/stats',getStatsJSON);
  app.get('/backup',getBackup);
  app.get('/pricing_history/:model_id/:from/:to', getPricingHistoryJSON);
  app.get('/s/:term/:from?/:to?', getSearchJSON);
  app.get('/u/:term/:from?/:to?', getSearchUserJSON);
  app.get('/m',getMessagesJSON);
  app.get('/search/:term', getSearchHTML);
  app.get('/sitemap',getSitemap);
  app.get(['/','/:trader_item'], getIndexHTML);
  return app;
}
async function getBackup(req,res) {
  if(!isWhitelisted(req))
    return res.send('nope');
  console.log(KamadanTrade.db);
  let file = await KamadanTrade.db.dump('kamadan');
  if(!file)
    return res.send('fail');
  res.download(file);
  setTimeout(function() {
    if(fs.existsSync(file)) {
      console.log("Deleting "+file);
      try {
        fs.unlinkSync(file);
        console.log("Deleted");
      } catch(e) {
        console.error(e);
        // silent
      }
    }
  },10000);
}
async function addTraderQuotes(req,res) {
  res.end();
  if(!isValidTradeSource(req))
    return console.error("/add called from "+getIP(req)+" - naughty!");
  let json = false;
  try {
    if(req.body.json)
      json = JSON.parse(req.body.json);
    if(!json)
      json = JSON.parse(req.body);
  } catch(e) {
    console.error("Invalid or malformed json in /trader_quotes");
    return;
  }
  console.log("/trader_quotes:",json);
  await lock();
  try {
    let updated_trader_prices = await KamadanTrade.addTraderPrices(json);
    if(!updated_trader_prices)
      return;
    console.log("Trader prices updated");
    pushPrices(updated_trader_prices,true);
    pushPrices(updated_trader_prices,false);
    global.config.current_trade_prices = await KamadanTrade.getTraderPrices();
  } catch(e) {
    console.error(e);
  }
  await unlock();
}
async function addMessage(req, res, channel) {
  res.end();
  if(!isValidTradeSource(req))
    return console.error("/add called from "+getIP(req)+" - naughty!");
  let timestamp = Date.now();
  let is_pre = isPreSearing(req);
  let Trader = is_pre ? AscalonTrade : KamadanTrade;

  await lock();
  try {
    let added_message = await Trader.addMessage(req,timestamp,channel);
    if(added_message) {
      pushMessage(added_message,is_pre);
      Trader.cached_message_log = JSON.stringify(Trader.live_message_log);
    } else {
      // Message blocked due to spam/gold seller
      //console.log("No added message?");
    }
  } catch(e) {
    console.error(e);
  }
  unlock();
}
async function addWhisper(req,res) {
  res.end();
  if(!isValidTradeSource(req))
    return console.error("/whisper called from "+getIP(req)+" - naughty!");
  let timestamp = Date.now();
  let is_pre = isPreSearing(req);
  let Trader = is_pre ? AscalonTrade : KamadanTrade;
  await lock();
    try {
    let added_message = Trader.addWhisper(req,timestamp);
    if(added_message) {
      pushMessage(added_message,is_pre);
    }
  } catch(e) {
    console.error(e);
  }
  unlock();
}
async function getSearchJSON(req,res) {
  let Trader = isPreSearing(req) ? AscalonTrade : KamadanTrade;
  let rows = [];
  try {
     rows = await Trader.search(req.params.term,req.params.from,req.params.to);
  } catch(e) {
    console.error(e);
  }
  res.json(rows);
}
async function getSearchUserJSON(req,res) {
  var Trader = isPreSearing(req) ? AscalonTrade : KamadanTrade;
  var user = ((req.params.term || req.query.term)+'').replace(/^user:/,'');
  try {
    let rows = await Trader.search('user:'+user,req.params.from,req.params.to);
    res.json(rows);
  } catch(e) {
    console.error(e);
    res.json([]);
  }
}
function getMessagesJSON(req,res) {
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
  return res.send(Trader.cached_message_log);
}
async function getStatsJSON(req,res) {
  try {
    let stats = await updateStats();
    if(isWhitelisted(req)) {
      stats.extended = {};
      var extended = extendedStats();
      for(var i in extended) {
        stats.extended[i] = extended[i];
      }
    }
    res.json(stats);
  } catch(e) {
     res.json({"status":"error"});
  }
}
function getSitemap(req,res) {
  var sitemap = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  var urls = ['zkey','ecto','bds','conset','kuunavang','vizu'];
  if(isPreSearing(req)) {
    urls = ['charr bag','charr kit','black dye','kuunavang','vizu'];
  }
  for(var i in urls) {
    sitemap += '<url><loc>https://'+req.headers.host+'/search/'+encodeURIComponent(urls[i])+'</loc><changefreq>hourly</changefreq></url>';
  }
  sitemap += '</urlset>';
  res.set('Content-Type','application/xml; charset=utf-8');
  res.send(sitemap);
}
function getTraderQuotesJSON(req,res) {
  res.json(global.config.current_trade_prices);
};
function getSearchHTML(req,res) {
  var Trader = isPreSearing(req) ? AscalonTrade : KamadanTrade;
  var ip = getIP(req);
  var now = Date.now();
  var gotRows = function(rows) {
    res.send(renderFile(__dirname+'/index.html',{req:req,messages:rows,search_term:req.params.term}));
  }
  last_search_by_ip[ip] = last_search_by_ip[ip] || 0;
  if(last_search_by_ip[ip] > 4) {
    return gotRows([]); // 4 simultaneous searches per IP
  }
  last_search_by_ip[ip]++;
  Trader.search(req.params.term,0,0).then(function(rows) {
    delete last_search_by_ip[ip];
    return gotRows(rows);
  }).catch(function(e) {
    delete last_search_by_ip[ip];
    console.error(e);
    res.send(renderFile(__dirname+'/index.html',{req:req,messages:[],search_term:req.params.term}));
  });
}
function getIndexHTML(req,res) {
  res.send(renderFile(__dirname+'/index.html',{req:req}));
}
function getPricingHistoryJSON(req,res) {
  var Trader = isPreSearing(req) ? AscalonTrade : KamadanTrade;
  Trader.getPricingHistory(req.params.model_id,req.params.from,req.params.to).then(function(rows) {
    res.json(rows);
  }).catch(function(e) {
    console.error(e);
    res.json([]);
  });
}

// Begin
(async function() {
  await preload();
  // Check/renew SSL certificates daily.
  //repeat_script('renew_ssl_certificates.js',864e5);
  repeat_script('run_client.js',10000);

  await KamadanTrade.init();
  KamadanTrade.cached_message_log = JSON.stringify(KamadanTrade.live_message_log);
  global.config.current_trade_prices = await KamadanTrade.getTraderPrices();
  await AscalonTrade.init();
  AscalonTrade.cached_message_log = JSON.stringify(AscalonTrade.live_message_log);

  console.log("\n---------- Starting Web Server ----------\n");
  var app = configureWebServer();
  if(global.ssl_info.enabled) {
    try {
      if(https_server) {
        https_server.close();
        https_server = null;
      }
      var https_contexts = {};
      https_server = https.createServer({
        SNICallback:function(domain,cb) {
          if(!global.ssl_info.ssl_domains[domain])
            return cb("Invalid SSL domain");
          return cb(null,global.ssl_info.ssl_domains[domain].secureContext);
        },
        key: global.ssl_info.key,
        cert: global.ssl_info.cert
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
})();