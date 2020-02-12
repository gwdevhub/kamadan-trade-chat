var live_message_log = [];
var live_message_log_max = 100;
const sqlite3 = require('sqlite3').verbose();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

var KamadanTrade = {
  live_message_log:[],
  init:function() {
    while(this.initting) {
      sleep(100);
    }
    if(this.initted)
      return Promise.resolve();
    this.initted = this.initting = true;
    var self = this;
    return new Promise(function(resolve,reject) {
      var db = new sqlite3.Database('./database.db', (err) => {
        self.initting = false;
        if (err) {
          console.error(err.message);
          reject(err);
          return;
        }
        console.log('Connected to the in-memory SQlite database.');
        db.run('CREATE TABLE IF NOT EXISTS trade_messages (h TEXT,t INTEGER,s TEXT,m TEXT)',function(err) {
          if(err) return reject(err);
          db.run("CREATE INDEX IF NOT EXISTS hash_idx ON trade_messages(h)",function(err) {
            if(err) return reject(err);
            self.db = db;
            self.seedLiveMessageLog().then(resolve).catch(reject);
          });
        });
      });
    });
  },
  search:function(term) {
    var self = this;
    console.log(term);
    return this.init().then(function() {
      return new Promise(function(resolve,reject) {
        self.db.all("SELECT h,t,s,m FROM trade_messages WHERE m LIKE ? ORDER BY rowid DESC LIMIT "+live_message_log_max,['%'+term+'%'],(err, rows ) => {
          if(err) {
            console.error(err);
            return reject(err);
          }
          console.log(rows);
          return resolve(rows);
        });
      });
    });
  },
  addMessage:function(req) {
    var message;
    try {
      message = {s:req.body.sender+'',m:req.body.message+'',t:req.body.timestamp};
    } catch(e) {
      console.error("Failed to parse message from request");
      console.error(e);
      return;
    }
    // Parse timestamp
    try {
      message.t = (new Date(parseInt(message.t))).getTime();
    } catch(e) {
      console.error("Failed to parse timestamp "+message.t);
      console.error(e);
      return;
    }
    // Parse message content
    message.m = message.m.replace(/\/\//,'/');
    message.h = String.random(10);
    // live message log
    this.live_message_log.unshift(message);
    while(this.live_message_log.length > live_message_log_max) {
      this.live_message_log.pop();
    }
    this.last_message = message;
    
    var self = this;
    // database message log
    this.init().then(function() {
      // db loaded!
      self.db.run("INSERT INTO trade_messages (h,t,s,m) values (?,?,?,?)", 
        [message.h,message.t,message.s,message.m], function(err) {
        if (err) return console.error(err.message);
      });
    }).catch(function(err) {
      console.error(err);
    });
    return message;
  },
  getMessagesSince:function(h) {
    var slice_end = 0;
    while(slice_end < this.live_message_log.length && this.live_message_log[slice_end].h != h) {
      slice_end++;
    }
    return this.live_message_log.slice(0,slice_end);
  },
  seedLiveMessageLog:function() {
    var self = this;
    return new Promise(function(resolve,reject) {
      self.db.all("SELECT h,t,s,m FROM trade_messages ORDER BY rowid DESC LIMIT "+live_message_log_max,(err, rows ) => {
        if(err) {
          console.error(err);
          return reject(err);
        }
        self.live_message_log = rows;
        self.last_message = self.live_message_log[self.live_message_log.length-1];
        console.log(self.live_message_log.length+" messages retrieved from db");
        resolve();
      });
    });
  }
}

if(module && module.exports) {
  module.exports.KamadanTrade = KamadanTrade;
}