var fs = require('fs');

//---------------------------------
// SCRIPT PREAMBLE START 
//---------------------------------
var script_name = "renew_ssl_certificates.js";
var debug=1;
var cbDone=0;
var err;
var _arguments = arguments;
var cb = function() {
	if(cbDone)	return;
	cbDone=1;
	if(typeof _arguments[0] == 'function')
		_arguments[0].apply(this,arguments);
}
function log() {
	var arr = Array.from(arguments);
	var a = '['+(new Date()).toISOString()+']['+script_name+']';
	if(typeof arr[0] == 'string')
		arr[0] = a+' '+arr[0];
	else
		arr.unshift(a+' ');
	debug && console.log.apply(console,arr);
}
log("Script Started");
//---------------------------------
// SCRIPT PREAMBLE END 
//---------------------------------
if(typeof ServerConfig == 'undefined') {
  process.env.NODE_PATH = __dirname+'/../../node_modules';
  console.log(__dirname+'/../../node_modules');
  require("module").Module._initPaths();
  ServerConfig = require(__dirname+'/../ServerConfig.class.js');
}
if(ServerConfig.isLocal() && false)
  return Promise.reject("Server is local - not going to mess with SSL certificates");

if(!global.ssl_info) {
  // No ssl info; this is usually passed from server.js
  global.ssl_info = { 
    enabled:false,
    ssl_domains: {},
    ssl_email: ServerConfig.get('ssl_email')
  };
  var ssl_domains = ServerConfig.get('ssl_domains') || [ServerConfig.get('ssl_domain')];
  for(var i in ssl_domains) {
    if(!ssl_domains[i]) continue;
    if(!global.ssl_info.ssl_email) {
      console.error("No SSL email defined in server config (ssl_email).\nThis server won't be running in SSL."); 
      break;
    }
    global.ssl_info.ssl_domains[ssl_domains[i]] = { enabled:false }
    try {
      global.ssl_info.ssl_domains[ssl_domains[i]].key = fs.readFileSync('/etc/letsencrypt/live/'+ssl_domains[i]+'/privkey.pem','utf8');
      global.ssl_info.ssl_domains[ssl_domains[i]].cert = fs.readFileSync('/etc/letsencrypt/live/'+ssl_domains[i]+'/cert.pem','utf8');
      global.ssl_info.ssl_domains[ssl_domains[i]].ca = fs.readFileSync('/etc/letsencrypt/live/'+ssl_domains[i]+'/chain.pem','utf8');
      global.ssl_info.ssl_domains[ssl_domains[i]].secureContext = require('tls').createSecureContext({
        key:  global.ssl_info.ssl_domains[ssl_domains[i]].key,
        cert: global.ssl_info.ssl_domains[ssl_domains[i]].cert,
        ca: global.ssl_info.ssl_domains[ssl_domains[i]].ca
      });
      global.ssl_info.ssl_domains[ssl_domains[i]].enabled = true;
      global.ssl_info.enabled = true;
    } catch(e) {
      console.error("There was a problem getting SSL keys for "+ssl_domains[i]+".\nThis could be because the server is local.\nThis server won't be running in SSL.");
      console.error(e);
    }
  }
}
if(!global.ssl_info.enabled) {
  return Promise.reject("No SSL enabled.\nThis server won't be running in SSL.");
}

var ssl_domain = global.ssl_info.ssl_domain;
var ssl_email = global.ssl_info.ssl_email;

function getSSLForDomain(ssl_domain) {
  return new Promise(function(resolve,reject) {
    const { exec } = require('child_process');  
    const fs = require('fs'), pki = require('node-forge').pki
    // Check current SSL certificate
    var cert;
    try {
      cert = pki.certificateFromPem(fs.readFileSync('/etc/letsencrypt/live/'+ssl_domain+'/cert.pem', 'utf8'));
    } catch(e) {
      // Silent fail; certificate might not exist yet.
      //return reject('Failed to load priv cert from /etc/letsencrypt/live/'+ssl_domain+'/cert.pem');
    }
    
    var running_cert = global.ssl_info.ssl_domains[ssl_domain].cert;
    if(running_cert) {
      // Server is running a certificate
      log("Checking current running certificate against one on disk");
      try {
        running_cert = pki.certificateFromPem(running_cert);
      } catch(e) {
        return reject("Failed to check current running certificate");
      }
    }
    if(running_cert && running_cert.validity.notAfter.getTime() < cert.validity.notAfter.getTime()) {
      // The server is running an old version of the SSL certificate
      log("SSL certificate has been updated since last check; restarting webserver");
      exec("forever restartall");
      return resolve();
    }
    var seven_days_from_now = Date.now() + 864e5 * 7;
    if(cert && cert.validity.notAfter.getTime() > seven_days_from_now) {
      // SSL Certificate is valid for another 2 weeks.
      log("SSL Certificate checked, doesn't need to be updated (expires "+cert.validity.notAfter+")");
      return resolve();
    }
    log("Renewing certificate - this should restart nodejs on completion");
    exec('certbot certonly --webroot -w '+__dirname+' -d '+domain+' -n --agree-tos --force-renewal --email '+ssl_email+'\
      && chmod -R 755 /etc/letsencrypt/\
      && forever restartall', (err, stdout, stderr) => {
      if(err)
        return reject(stderr.split('\n').slice(-3).join('\n'));
      // Should never get here because of the above command "forever restartall"
      return resolve(stdout.split('\n').slice(-10).join('\n'));
    });
  });
}

return new Promise(function(resolve,reject) {
  var to_do = [];
  for(var i in global.ssl_info.ssl_domains) {
    to_do.push(getSSLForDomain(i));
  }
  Promise.all(to_do).then(function() {
    return resolve();
  }).catch(function(e) {
    console.error(e);
  });
});
