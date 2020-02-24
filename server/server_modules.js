express     = require('express');
bodyParser  = require('body-parser');
KamadanTrade = require(__dirname+'/KamadanTrade.class.js').KamadanTrade;
morgan      = require('morgan');
WebSocketServer = require('ws').Server;
ServerConfig = require(__dirname+'/ServerConfig.class.js');
lockFile = require('lockfile');
https = require('https');

serverScripts = {};

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
		__dirname+'/String.class.js'
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
	var script_files = fs.readdirSync(__dirname+'/scripts');
	for(var i in script_files) {
		var func_name = /^([^.]+)\.js$/.exec(script_files[i]);
		if(!func_name)
			continue;
		try {
			eval("serverScripts."+func_name[1]+' = function(){\n'+fs.readFileSync(__dirname+'/scripts/'+script_files[i])+'\n}');
		} catch(e) {
			console.error("Failed to initialise script: "+func_name);
			console.error(e);
		}
	}
	console.log("Scripts Loaded:");
	for(var i in serverScripts) console.log("serverScripts."+i+" = "+(typeof serverScripts[i]));
  
  return Promise.resolve();
}

function run_script(script) {
  return new Promise(function(resolve,reject) {
    if(!serverScripts[script])
      return Promise.reject("No valid script "+script);
    return serverScripts[script].apply(serverScripts);
  });
}
var periodicScripts = {};
function repeat_script(script,interval) {
  if(periodicScripts[script])
    return;
  periodicScripts[script] = interval;
  run_script(script).catch(function(e) {
    console.error("repeat_every_day for "+script+" failed!");
    console.error(e);
  }).finally(function() {
    console.log("repeat_every_hour for "+script+" finished, reqeueing...");
    setTimeout(function() { repeat_script(script,repeat_script) },interval);
  });
}