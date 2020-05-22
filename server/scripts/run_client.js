if(typeof exec == 'undefined') {
  process.env.NODE_PATH = __dirname+'/../../node_modules';
  console.log(__dirname+'/../../node_modules');
  require("module").Module._initPaths();
}
var exec = exec || require('child_process').exec;

var ServerConfig = require(__dirname+'/../../kamadan-trade-client/ServerConfig.class.js');

var kamadan_gw_login = ServerConfig.get('gw_kamadan_login');
if(kamadan_gw_login && kamadan_gw_login.email && kamadan_gw_login.email.trim().length) {
  exec('ps -elf | grep "[-]email \"'+kamadan_gw_login.email+'\""',function(a,stdout,c) {
    if(stdout.indexOf('-email') != -1)
      return;// console.log("Guild Wars client already running!\n"+stdout);
    let cmd = 'cd '+__dirname+'/../../kamadan-trade-client \
    && sudo sh run_client.sh "'+kamadan_gw_login.email+'" "'+kamadan_gw_login.password+'" "'+kamadan_gw_login.character+'" 449 0 > /dev/null 2>&1';
    console.log("Starting Kamadan Guild Wars client!\n"+cmd);
    exec(cmd);
  });
} else {
  console.error("Failed to get gw_kamadan_login from config");
}
var ascalon_gw_login = ServerConfig.get('gw_ascalon_login');
if(ascalon_gw_login && ascalon_gw_login.email && ascalon_gw_login.email.trim().length) {
  exec('ps -elf | grep "[-]email \"'+ascalon_gw_login.email+'\""',function(a,stdout,c) {
    if(stdout.indexOf('-email') != -1)
      return;// console.log("Guild Wars client already running!\n"+stdout);
    let cmd = 'cd '+__dirname+'/../../kamadan-trade-client \
    && sudo sh run_client.sh "'+ascalon_gw_login.email+'" "'+ascalon_gw_login.password+'" "'+ascalon_gw_login.character+'" 148 3 > /dev/null 2>&1';
    console.log("Starting Ascalon Guild Wars client!\n"+cmd);
    exec(cmd);
  });
} else {
  console.error("Failed to get gw_ascalon_login from config");
}
return Promise.resolve();