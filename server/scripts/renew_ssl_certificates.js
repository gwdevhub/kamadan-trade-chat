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
  const { spawn } = require('child_process');
  var stderr=[];
  var stdout=[];
  var dirname = __dirname
  log("Renewing certificate...");
  const proc = spawn('sudo certbot certonly --webroot -w '+__dirname+' -d kamadan.gwtoolbox.com -n --agree-tos --email jon@3vcloud.uk\
  && sudo cp -ura /etc/letsencrypt/live/ '+__dirname+'/ssl/\
  && sudo chmod -R 755 '+__dirname+'/ssl/');
  
  proc.stdout.on('data', (data) => {
    stdout.push(data);
  });

  proc.stderr.on('data', (data) => {
    stderr.push(data);
  });

  proc.on('close', (code) => {
    if(code != 0)
      return reject(stderr.slice(-3).join('\n'));
    return resolve(stdout.slice(-10).join('\n'));
  });
});