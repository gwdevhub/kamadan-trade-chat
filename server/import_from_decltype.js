/* import from decltype */

var KamadanDB = require(__dirname+'/KamadanDB.class.js');
var WebSocket = require('ws');
const url = 'wss://kamadan.decltype.org/ws/notify/';


var offset = 0;
var decltype_messages = [];
var to_get=0;
var got = [];
var has_first = false;

function getNextBatch() {
  decltype_messages = [];
  console.log("Requesting next batch, offset "+offset);
  to_get = 1;
  for(var i=0;i<to_get;i++) {
    connection.send(JSON.stringify({query:'',offset:offset * (i+1),suggest:false}));
  }
}
function insertMessages() {
  console.log("writing batch");
  if(!decltype_messages.length)
    return;
  to_get = decltype_messages.length;
  let args = [];
  for(var i = 0;i<decltype_messages.length;i++) {
    for(var j = 0;j<decltype_messages[i].length;j++) {
      if(decltype_messages[i][j].id == 1)
        has_first = true;
      let a = [];
      a.push(decltype_messages[i][j].id);
      a.push(decltype_messages[i][j].name);
      a.push(decltype_messages[i][j].timestamp);
      a.push(decltype_messages[i][j].message);
      args.push(a);
      offset++;
    }
  }
  console.log(args.length);
  KamadanDB.batch("INSERT INTO kamadan.decltype_messages (i,n,t,m) VALUES (?,?,?,?)", args).then(function(res) {
      console.log(res);
      if(!has_first)
        getNextBatch();
    });
  
}
var started = false;
const connection = new WebSocket(url);
connection.onopen = function(e) {
  console.log("Websocket opened OK");
  if(started) return;
  started = 1;
  KamadanDB.query("SELECT COUNT(*) offset FROM kamadan.decltype_messages").then(function(res) {
    if(res.length)
      offset = parseInt(res[0].offset);
    getNextBatch();
  });
}
connection.onmessage = function(e) {
  console.log("Got message");
  var data;
  try {
    data = JSON.parse(e.data);
  } catch(e) {};
  if(data.query != '')
    return;
  decltype_messages.push(data.results);
  to_get--;
  if(to_get > 0)
    return;
  insertMessages();
}