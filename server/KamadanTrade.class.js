var live_message_log = [];
var live_message_log_max = 100;
const sqlite3 = require('sqlite3').verbose();

Date.prototype.toStartOf = Date.prototype.toStartOf || function(unit) {
  switch (unit) {
    case "year": this.setMonth(0);
    case "month": this.setDate(1);
    case "day": this.setHours(0);
    case "hour": this.setMinutes(0);
    case "minute": this.setSeconds(0);
    case "second": this.setMilliseconds(0);
  }
  return this;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 
String.prototype.unUnicodeArray = String.prototype.unUnicodeArray || function() {
  var str = this.trim();
  if(/^\[.*\]$/.test(str)) {
    // This is an array or char codes e.g. [19712, 27448, 19734, 58931456]
    try {
      var arr = JSON.parse(str); // Should be parsable
      var new_str = '';
      for(var i in arr) {
        new_str += String.fromCharCode(arr[i]);
      }
      str = new_str;
    } catch(e) {
      // idgaf
    }
  }
  return str;
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
    var self = this;
    if(this.initted)
      return Promise.resolve();
    if(this.initting)
      return sleep(500).then(function() { return self.init(); });
    this.initting = true;
    console.log("Initialising KamadanTrade");
    this.db = require(__dirname+'/KamadanDB.class.js');
    setInterval(function() {
      self.housekeeping();
    },30000);
    return this.db.init().then(function() {
      return self.seedLiveMessageLog()
    }).finally(function() {
      self.initting = false;
      self.initted = true;
      console.log("KamadanTrade initialised");
      return Promise.resolve();
    });
  },
  search:function(term) {
    var self = this;
    term = ((term || '')+'').toLowerCase().trim();
    if(term.indexOf('user:') == 0)
      return this.getMessagesByUser(term.substring(0,5));
    if(!term.length)
      return Promise.resolve(this.live_message_log);
    console.log("Searching messages for "+term);
    return this.init().then(function() {
      // Split string by spaces
      var keywords = term.split(' ');
      var where_clause = " WHERE m LIKE ? ";
      var args = ['%'+keywords[0]+'%']
      for(var i=1;i<keywords.length;i++) {
        where_clause += "AND m LIKE ? ";
        args.push('%'+keywords[i]+'%');
      }
      var sql = "SELECT t,s,m,n FROM kamadan.trade_messages"+where_clause+"GROUP BY m,s ORDER BY t DESC LIMIT "+live_message_log_max;
      return self.db.query(sql,args).then(function(rows) {
        console.log(sql,args,rows);
        for(var i in rows) {
          rows[i].h = '' + rows[i].t + rows[i].n;
          delete rows[i].n;
        }
        return Promise.resolve(rows || []);
      });
    });
  },
  addMessage:function(req) {
    var recv = Date.now();
    var body = req.body || '';
    if(typeof body == 'string') {
      try {
        body = JSON.parse(body);
      } catch(e) {}
    }
    var message = {
      m:((body.m || body.message || '')+'').trim(),
      s:((body.s || body.sender || '')+'').trim(),
      h:recv,
      t:Math.floor(recv / 1000)
    }
    if(!message.m || !message.s) {
      console.error("Missing sender/message when creating trade message");
      console.log(body);
      return false;
    }
    console.log("Trade message received OK");
    // Parse message content
    message.m = message.m.replace(/\\(\\|\[|\])/g,'$1');
    if(!message.m.length)
      return false; // Empty message
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
      return self.db.query("INSERT INTO kamadan.trade_messages (n,t,s,m) values (?,?,?,?)", [message.h.toString().slice(-3),message.t,message.s,message.m]);
    }).catch(function(err) {
      console.error(err);
      return message;
    });
    return message;
  },
  getMessagesByUser:function(term) {
    var self = this;
    term = ((term || '')+'').toLowerCase().trim();
    if(!term.length)
      return Promise.resolve([]);
    console.log("Searching user message for "+term);
    return this.init().then(function() {
      return self.db.query("SELECT n,t,s,m FROM kamadan.trade_messages WHERE s LIKE ? GROUP BY m ORDER BY t DESC LIMIT "+live_message_log_max,[term])
        .then(function(rows) {
          for(var i in rows) {
            rows[i].h = '' + rows[i].t + rows[i].n;
            delete rows[i].n;
          }
          return Promise.resolve(rows || []);
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
    return this.db.query("SELECT n, s, m, t\
    FROM kamadan.trade_messages \
    ORDER BY t desc, n desc \
    LIMIT "+live_message_log_max).then(function(rows) {
      for(var i in rows) {
        rows[i].h = rows[i].t + rows[i].n + '';
        delete rows[i].n;
      }
      self.live_message_log = rows;
      self.last_message = self.live_message_log[0];
      console.log(self.live_message_log.length+" messages retrieved from db");
      return Promise.resolve();
    });
  }
}

if(module && module.exports) {
  module.exports.KamadanTrade = KamadanTrade;
}