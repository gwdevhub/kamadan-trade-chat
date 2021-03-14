express     = require('express');
bodyParser  = require('body-parser');
TradeModule = require(__dirname+'/KamadanTrade.class.js').KamadanTrade;
morgan      = require('morgan');
WebSocket = require('ws');
WebSocketServer = WebSocket.Server;
ServerConfig = require(__dirname+'/ServerConfig.class.js');
lockFile = require('lockfile');
https = require('https');
crypto = require('crypto');
tls = require('tls');
compression = require('compression')
//Mustache = require('mustache');
Handlebars = require("handlebars");
KamadanDB = require(__dirname+'/KamadanDB.class.js');
LZString = require(__dirname+'/js/lz-string.min.js');


global.serverScripts = {};

var last_gc = 0;
function garbage_collect() {
  let t = Date.now();
  if(t - last_gc < 60000)
    return; // Too soon
  if(global && global.gc)
    global.gc();
  last_gc = t;
}
if(global && global.gc)
  setInterval(garbage_collect,10000);
function preload() {
  console.log("\n---------- Loading Modules via require() ----------\n");
	eval(fs.readFileSync(__dirname+'/server_modules.js')+'');
  
	console.log("\n---------- Loading Helper Functions/Classes ----------\n");
	var helper_functions = [
		__dirname+'/js/String.class.js',
    __dirname+'/js/Date.class.js'
	]
	for(var i in helper_functions)
		console.log(helper_functions[i]), eval(fs.readFileSync(helper_functions[i])+'');
	console.log("\n--------------------------------\n");
  console.log("\n---------- Loading Settings ----------\n");
  global.config = ServerConfig.get();
  //for(var i in settings)
  //  global.config[i] = settings[i];
  console.log("Settings Loaded: ");
  for(var i in config)
    console.log(i+' = '+JSON.stringify(config[i]));
  console.log("\n--------------------------------\n");

	console.log("\n---------- Loading Scripts ----------\n");
  var script_files = [];
  try {
    script_files = fs.readdirSync(__dirname+'/scripts');
  } catch(e) {}
	for(var i in script_files) {
		var func_name = /^([^.]+)\.js$/.exec(script_files[i]);
		if(!func_name)
			continue;
		try {
			eval("global.serverScripts."+func_name[1]+' = function(){\n'+fs.readFileSync(__dirname+'/scripts/'+script_files[i])+'\n}');
		} catch(e) {
			console.error("Failed to initialise script: "+func_name);
			console.error(e);
		}
	}
	console.log("Scripts Loaded:");
	for(var i in global.serverScripts) console.log("  serverScripts."+i+" = "+(typeof global.serverScripts[i]));
  
  return Promise.resolve();
}

function run_script(script) {
  return new Promise(function(resolve,reject) {
    script = script.replace(/\..+$/,'').trim();
    if(!global.serverScripts[script]) {
      for(var i in global.serverScripts) console.log("  serverScripts."+i+" = "+(typeof global.serverScripts[i]));
      reject("No valid script "+script);
    }
    return global.serverScripts[script].apply(serverScripts).then(function() {
      return resolve();
    }).catch(function(err) {
      reject(err);
    });
  }).catch(function(err) {
    console.error("ERROR: "+err);
  });
}
var periodicScripts = {};
function repeat_script(script,interval) {
  if(periodicScripts[script] && periodicScripts[script].interval < interval)
    return console.log(script+" already queued"); // Already queued
  periodicScripts[script] = {interval:interval,timeout:null};
  run_script(script).catch(function(e) {
    console.error("repeat_every_day for "+script+" failed!");
    console.error(e);
  }).finally(function() {
    console.log("repeat_script for "+script+" finished, reqeueing...");
    setTimeout(function() { repeat_script(script,interval) },interval);
  });
}
// Promosified shell command
async function cmd(cmd, log_output = true, throw_on_fail = true) {
  return new Promise((resolve, reject) => {    
    let stdout_buf = '', stderr_buf='', options = {};
    let first_arg = cmd;
    if(typeof cmd == 'string') {
      options.shell = true;
      cmd = [];
    } else {
      first_arg = cmd.shift();
    }
    let spawn_args = [first_arg,cmd,options];
    console.log(' >>> '+([first_arg].concat(cmd).join(' ')));
    let proc    = spawn.apply(exec,spawn_args);
    proc.stdout.on('data', function (data) {
      if(log_output) console.log(' <<< ' +data.toString());
      stdout_buf += data.toString();
    });

    proc.stderr.on('data', function (data) {
      if(log_output) console.log(' <<< '+data.toString());
      stdout_buf += data.toString();
    });
    if(throw_on_fail)
      proc.on('error', reject);
    proc.on('exit', function (code) {
      if(code != 0 && throw_on_fail) {
      console.log(' <<< '+stdout_buf);
      return reject(code);
    }
      return resolve(stdout_buf);
    });
  });
}