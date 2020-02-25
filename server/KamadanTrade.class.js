var live_message_log = [];
var live_message_log_max = 100;

var fs = require('fs');

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
  flood_timeout:10000, // ms to avoid user spamming trade chat i.e. 10s between the same message
  live_message_log:[],
  checked_table_exists:0,
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
    
    this.quarantine_regexes = [];
    try {
      var regex_strings = (fs.readFileSync(__dirname+'/chat_filter_regexes.txt')+'').split('\n');
      for(var i=0;i<regex_strings.length;i++) {
        regex_strings[i] = regex_strings[i].trim();
        if(!regex_strings[i].length)
          continue;
        this.quarantine_regexes.push(new RegExp(regex_strings[i],'i'));
      }
      console.log("Chat filter regexes: ",this.quarantine_regexes);
      
    } catch(e) {
      console.error("Failed to parse "+__dirname+'/chat_filter_regexes.txt');
      console.error(e);
    }
    this.db = require(__dirname+'/KamadanDB.class.js');
    setInterval(function() {
      self.housekeeping();
    },30000);
    var year = (new Date()).getUTCFullYear();
    return this.db.init().then(function() {
      var create_statement = "(\
        t BIGINT(20) UNSIGNED NOT NULL COMMENT 'Unix timestamp with milliseconds',\
        s VARCHAR(20) NULL DEFAULT NULL COMMENT 'Sender',\
        m VARCHAR(120) NULL DEFAULT NULL COMMENT 'Message',\
        PRIMARY KEY (t),\
        INDEX s (s)\
      )\
      COLLATE='utf8mb4_general_ci'\
      ENGINE=InnoDB;"
      
      return Promise.all([
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_quarantine "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year-5)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year-4)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year-3)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year-2)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year-1)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year+1)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year+2)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year+3)+" "+create_statement),
        self.db.query("CREATE TABLE IF NOT EXISTS kamadan.kamadan_"+(year+4)+" "+create_statement)
      ]).then(function() {
        return self.seedLiveMessageLog();
      });
    }).finally(function() {
      self.initting = false;
      self.initted = true;
      console.log("KamadanTrade initialised");
      return Promise.resolve();
    });
  },
  quarantineCheck:function(message) {
    // True on match
    var msg = message.m.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    for(var i in this.quarantine_regexes) {
      if(this.quarantine_regexes[i].test(msg))
        return true;
    }
    return false;
  },
  search:function(term,from_unix_ms,to_unix_ms) {
    var self = this;
    term = ((term || '')+'').toLowerCase().trim();
    var by_user = false;
    if(term.indexOf('user:') == 0) {
      by_user = true;
      term = term.substring(5);
    }
    if(!term.length)
      return Promise.resolve(this.live_message_log);
    var to_date = new Date();
    var from_date;
    var latest_year;
    var earliest_year = 2015;
    if(typeof to_unix_ms != 'undefined' && to_unix_ms != 0) {
      console.log("to_unix_ms "+to_unix_ms);
      to_unix_ms = (to_unix_ms+'').trim();
      to_date = (new Date(parseInt(to_unix_ms)));
      if(to_date.getUTCFullYear() < 2010)
        throw "Invalid to date of "+to_unix_ms;
      if(to_date.getTime() > Date.now())
        to_date = new Date();
    }
    latest_year = to_date.getUTCFullYear();
    earliest_year = 2015;
    if(typeof from_unix_ms != 'undefined' && from_unix_ms != 0) {
      console.log("from_unix_ms "+from_unix_ms);
      from_unix_ms = (from_unix_ms+'').trim();
      from_date = (new Date(parseInt(from_unix_ms)));
      earliest_year = from_date.getUTCFullYear();
      if(earliest_year < 2010 || earliest_year > latest_year)
        throw "Invalid to date of "+to_unix_ms;
      if(from_date.getTime() > to_date.getTime())
        throw "Invalid to date of "+to_unix_ms;
    }
    console.log("Searching messages for "+term+", from "+from_date+" to "+to_date);
    return this.init().then(function() {
      var args = [];
      var where_clause = '';
      if(by_user) {
        // Search by user
        where_clause = " WHERE s = ? ";
        args.push(term);
      } else {
        // Split string by spaces
        var keywords = term.split(' ');
        where_clause = " WHERE m LIKE ? ";
        args = ['%'+keywords[0]+'%']
        for(var i=1;i<keywords.length;i++) {
          where_clause += "AND m LIKE ? ";
          args.push('%'+keywords[i]+'%');
        }
      }
      var rows_final = [];
      var searchYear = function(year) {
        if(year < earliest_year)
          return Promise.resolve(rows_final);
        var where = where_clause;
        if(year == earliest_year && from_date)
          where += " AND t > "+from_date.getTime();
        if(year == latest_year && to_date)
          where += " AND t < "+to_date.getTime();
        var sql = "SELECT t,s,m FROM kamadan.kamadan_"+year+" "+where+" ORDER BY t DESC LIMIT "+live_message_log_max;
        console.log(sql);
        return self.db.query(sql,args).then(function(rows) {
          for(var i in rows) {
            rows_final.push(rows[i]);
          }
          if(rows_final.length < live_message_log_max)
            return searchYear(year-1);
          return Promise.resolve(rows_final);
        });
      };
      return searchYear(latest_year);
    });
  },
  addMessage:function(req) {
    var timestamp = Date.now();
    var body = req.body || '';
    if(typeof body == 'string') {
      try {
        body = JSON.parse(body);
      } catch(e) {}
    }
    var message = {
      m:((body.m || body.message || '')+'').trim(),
      s:((body.s || body.sender || '')+'').trim(),
      t:timestamp
    }
    if(!message.m || !message.s)
      return Promise.reject(new Error("Missing sender/message when creating trade message"));
    console.log("Trade message received OK");
    // Parse message content
    message.m = message.m.replace(/\\(\\|\[|\])/g,'$1');
    if(!message.m.length)
      return Promise.reject(new Error("Message is empty"));
    var quarantined = this.quarantineCheck(message);
    var table = 'kamadan_'+(new Date()).getUTCFullYear();
    if(quarantined) {
      console.log("Message hit quarantine: "+message.m);
      table = 'kamadan_quarantine';
    }
    
    // Avoid spam by the same user (or multiple trade message sources!)
    var last_user_msg = this.last_message_by_user[message.s];
    if(last_user_msg && last_user_msg.m == message.m
    && Math.abs(message.t - last_user_msg.t) < this.flood_timeout) {
      console.log("Flood filter hit for "+last_user_msg.s+", "+Math.abs(message.t - last_user_msg.t)+"s diff");
      return Promise.resolve(quarantined ? false : last_user_msg);
    }
    var self = this;
    
    // database message log
    return new Promise(function(resolve,reject) {
      self.init().then(function() {
        // If this user has advertised this message in the last hour, just update it.
        return self.db.query("UPDATE "+table+" SET t = ? WHERE s = ? AND m = ? AND t > ?", [message.t,message.s,message.m,message.t - 36e5]).then(function(res) {
          var done = function() {
            self.last_message_by_user[message.s] = message;
            if(quarantined)
              return resolve(false);
            // live message log
            self.live_message_log.unshift(message);
            while(self.live_message_log.length > live_message_log_max) {
              self.live_message_log.pop();
            }
            self.last_message = message;
            return resolve(message);
          };
          if(res.affectedRows)
            return done();
          return self.db.query("INSERT INTO "+table+" (t,s,m) values (?,?,?)", [message.t,message.s,message.m]).then(function(res) {
            return done();
          });
        });
      });
    });
  },
  getMessagesByUser:function(term,from_unix_ms,to_unix_ms) {
    return this.search.apply(this,arguments);
    var self = this;
    term = ((term || '')+'').toLowerCase().trim();
    if(!term.length)
      return Promise.resolve([]);
    var year = (new Date()).getUTCFullYear();
    if(earlier_than) {
      earlier_than = parseInt(earlier_than,10);
      year = (new Date(earlier_than)).getUTCFullYear();
    }
    console.log("Searching user message for "+term);
    return this.init().then(function() {
      return self.db.query("SELECT t,s,m FROM kamadan.kamadan_"+year+" WHERE s LIKE ? ORDER BY t DESC LIMIT "+live_message_log_max,[term])
        .then(function(rows) {
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
    var year = (new Date()).getUTCFullYear();
    return this.db.query("SELECT t, s, m\
    FROM kamadan.kamadan_"+year+" \
    ORDER BY t desc \
    LIMIT "+live_message_log_max).then(function(rows) {
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