//---------------------------------
// SCRIPT PREAMBLE START 
//---------------------------------
var script_name = "renew_ssl_certificates.js";
var debug=0;
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
if(ServerConfig.isLocal())
  return Promise.reject("Server is local - not going to mess with SSL certificates");


return new Promise(function(resolve,reject) {
  const { exec } = require('child_process');
  var dirname = __dirname
  log("Renewing certificate...");
  exec('certbot certonly --webroot -w '+__dirname+' -d kamadan.gwtoolbox.com -n --agree-tos --email jon@3vcloud.uk\
    && chmod -R 755 /etc/letsencrypt/', (err, stdout, stderr) => {
    if(err)
      return reject(stderr.split('\n').slice(-3).join('\n'));
    return resolve(stdout.split('\n').slice(-10).join('\n'));
  });
});