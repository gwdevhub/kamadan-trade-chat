var live_message_log = [];
var live_message_log_max = 100;
const sqlite3 = require('sqlite3').verbose();

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

var KamadanTrade = {
  flood_timeout:10, // Seconds to avoid user spamming trade chat i.e. 10s between the same message
  live_message_log:[],
  last_message_by_user:{},
  housekeeping:function() {
    // Clear down last_message_by_user if over 1 minute old.
    var one_minute_ago_in_seconds = (Date.now() / 1000) - 60;
    for(var i in this.last_message_by_user) {
      if(this.last_message_by_user[i].t < one_minute_ago_in_seconds)
        delete this.last_message_by_user[i];
    }
  },
  init:function() {
    while(this.initting) {
      sleep(100);
    }
    if(this.initted)
      return Promise.resolve();
    this.initted = this.initting = true;
    var self = this;
    setInterval(function() {
      self.housekeeping();
    },30000);
    return new Promise(function(resolve,reject) {
      var db = new sqlite3.Database(__dirname+'/database.db', (err) => {
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
        self.db.all("SELECT h,t,s,m FROM trade_messages WHERE m LIKE ? GROUP BY m,s ORDER BY rowid DESC LIMIT "+live_message_log_max,['%'+term+'%'],(err, rows ) => {
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
    var body = req.body || '';
    if(typeof body == 'string') {
      try {
        body = JSON.parse(body);
      } catch(e) {}
    }
    if(!body || !body.sender || !body.message || !body.timestamp) {
      console.error("Missing sender/message/timestamp when creating trade message");
      console.log(body);
      return false;
    }
    try {
      message = {s:(req.body.sender+'').trim(),m:(req.body.message+'').trim(),t:(req.body.timestamp+'').substr(0,10)};
    } catch(e) {
      console.error("Failed to parse message from request");
      console.error(e);
      return false;
    }
    console.log("incoming message");
    console.log(message);
    // Parse timestamp
    try {
      var d = new Date(parseInt(message.t,10) * 1000);
      console.log(d, d.getTime());
      message.t = d.getTime();
      // - Check for wrong timezone.
      var diff_hours = Math.round((message.t - Date.now()) / 36e5);
      if(diff_hours != 0) {
        message.t += diff_hours * 36e5;
        console.log("Timezone for incoming timestamp "+message.t+" adjusted by "+diff_hours+" hours to be "+message.t);
      }
      message.t = parseInt((message.t+'').substring(0,10),10);
      // Fuck it, just use current unix timestamp.
      message.t = Math.round(Date.now() / 1000);
    } catch(e) {
      console.error("Failed to parse timestamp "+message.t);
      console.error(e);
      return false;
    }
    // Parse message content
    message.m = message.m.replace(/\\(\\|\[|\])/g,'$1');
    if(!message.m.length)
      return false; // Empty message
    message.h = message.t+String.random(3);
    // Avoid spam by the same user (or multiple trade message sources!)
    var last_user_msg = this.last_message_by_user[message.s];
    if(last_user_msg && last_user_msg.m == message.m
    && Math.abs(message.t - last_user_msg.t) < this.flood_timeout) {
      console.log("Flood filter hit for "+last_user_msg.s+", "+Math.abs(message.t - last_user_msg.t)+"s diff");
      return last_user_msg;
    }
    this.last_message_by_user[message.s] = message;
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
      return message;
    });
    return message;
  },
  getMessagesByUser:function(user) {
    var self = this;
    user = (user+'').trim();
    if(!user.length)
      return Promise.resolve([]);
    return this.init().then(function() {
      return new Promise(function(resolve,reject) {
        self.db.all("SELECT h,t,s,m FROM trade_messages WHERE s LIKE ? GROUP BY m ORDER BY rowid DESC LIMIT "+live_message_log_max,[user],(err, rows ) => {
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
        self.last_message = self.live_message_log[0];
        console.log(self.live_message_log.length+" messages retrieved from db");
        resolve();
      });
    });
  }
}

if(module && module.exports) {
  module.exports.KamadanTrade = KamadanTrade;
}