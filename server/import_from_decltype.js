/* import from decltype */

var KamadanDB = require(__dirname+'/KamadanDB.class.js');
var WebSocket = require('ws');
const url = 'wss://kamadan.decltype.org/ws/notify/';
const connection = new WebSocket(url);

var offset = 0;
var decltype_messages = [];
function getNextBatch() {
  var req = JSON.stringify({query:'',offset:offset,suggest:false});
  console.log("Requesting next batch "+req);
  connection.send(req);
}
function insertMessages() {
  if(!decltype_messages.length)
    return;
  var sql = [];
  var args = [];
  for(var i = 0;i<decltype_messages.length;i++) {
    sql.push('(?,?,?,?)');
    args.push(decltype_messages[i].id);
    args.push(decltype_messages[i].name);
    args.push(decltype_messages[i].timestamp);
    args.push(decltype_messages[i].message);
  }
  KamadanDB.query("INSERT INTO kamadan.decltype_messages (i,n,t,m) VALUES "+sql.join(','),args).then(function(res) {
    decltype_messages = [];
    getNextBatch();
  }).catch(function(e) {
    console.error(e);
  });
}
var started = false;
connection.onopen = function(e) {
  console.log("Websocket opened OK");
  if(started) return;
  started = 1;
  getNextBatch();
}
connection.onmessage = function(e) {
  console.log("Got message");
  var data;
  try {
    data = JSON.parse(e.data);
  } catch(e) {};
  if(data.query != '')
    return;
  offset = parseInt(data.offset,10) + data.results.length;
  console.log("num records = "+data.results.length);
  for(var i=0;i<data.results.length;i++) {
    decltype_messages.push(data.results[i]);
  }
  if(decltype_messages.length > 100)
    return insertMessages();
  getNextBatch();
}

setTimeout(function() {
  console.log("total messages been got is "+decltype_messages.length+" - bye!");
},10000);