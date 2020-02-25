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
    ssl_domain: ServerConfig.get('ssl_domain'),
    ssl_email: ServerConfig.get('ssl_email')
  }
}
if(!global.ssl_info.ssl_domain || !global.ssl_info.ssl_email) {
  return Promise.reject("No SSL domain/email defined in server config (ssl_domain, ssl_email).\nThis server won't be running in SSL.");
}

var ssl_domain = global.ssl_info.ssl_domain;
var ssl_email = global.ssl_info.ssl_email;

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
  
  var running_cert = global.ssl_info ? global.ssl_info.cert : null;
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
  exec('certbot certonly --webroot -w '+__dirname+' -d '+ssl_domain+' -n --agree-tos --force-renewal --email '+ssl_email+'\
    && chmod -R 755 /etc/letsencrypt/\
    && forever restartall', (err, stdout, stderr) => {
    if(err)
      return reject(stderr.split('\n').slice(-3).join('\n'));
    // Should never get here because of the above command "forever restartall"
    return resolve(stdout.split('\n').slice(-10).join('\n'));
  });
});