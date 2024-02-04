var live_message_log = [];
var live_message_log_max = 100;
var search_results_max = 25;

var fs = fs || require('fs');
eval(fs.readFileSync(__dirname+'/server_modules.js')+'');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
function KamadanTrade() {
  this.flood_timeout = 10000; // ms to avoid user spamming trade chat i.e. 10s between the same message
  this.live_message_log = [];
  this.checked_table_exists = 0;
  this.table_prefix = 'kamadan_';
  this.last_message_by_user = {};
  this.current_trader_quotes = [];
  this.last_quarantine_by_user = {};
}
KamadanTrade.prototype.housekeeping = function() {
  // Clear down last_message_by_user if over 1 minute old.
  var one_minute_ago_in_seconds = (Date.now() / 1000) - 60;
  for(var i in this.last_message_by_user) {
    if(this.last_message_by_user[i].t < one_minute_ago_in_seconds)
      delete this.last_message_by_user[i];
  }
};
KamadanTrade.prototype.addTraderPrices = async function(json) {

  let current_prices = await this.getTraderPrices();
  let updated_prices = [];
  let models_done = {buy:{},sell:{}};
  let return_prices = {buy:{},sell:{}};
  for(let key in models_done) {
    for(let i in json[key]) {
      let current = current_prices[key][json[key][i].m];
      if(models_done[key][json[key][i].m])
        continue;
      models_done[key][json[key][i].m] = 1;
      if(!current || current.p != json[key][i].p) {
        updated_prices.push({m:json[key][i].m,p:json[key][i].p,t:json[key][i].t,s:key == 'buy' ? 0 : 1});
      }
    }
  }
  if(!updated_prices.length) {
    console.log("No prices updated");
    return false;
  }
  let sql_args = [];
  let sql_insert = [];
  // 1. Insert ignore into trader_items table
  for(let i in updated_prices) {
    sql_args.push(updated_prices[i].m);
    sql_insert.push('(?)');
  }
  await this.db.query("INSERT IGNORE INTO trader_items (m) VALUES "+sql_insert.join(','),sql_args);
  // 2. Fetch back a listing of the items to find the unique id
  let trader_items = await this.db.query("SELECT * from trader_items");
  let item_id_by_modstruct = {};
  for(let i=0;i<trader_items.length;i++) {
    item_id_by_modstruct[trader_items[i].m] = trader_items[i].i;
  }
  // 3. Do the insert into trader_prices
  sql_args = [];
  sql_insert = [];
  for(let i in updated_prices) {
    if(!item_id_by_modstruct[updated_prices[i].m]) {
      console.log("Missing item_id matching mod struct",updated_prices[i].m);
      continue;
    }
    sql_args.push(item_id_by_modstruct[updated_prices[i].m]);
    sql_args.push(updated_prices[i].p);
    sql_args.push(updated_prices[i].t);
    sql_args.push(updated_prices[i].s);
    sql_insert.push('(?,?,?,?)');
    if(updated_prices[i].s) {
      return_prices.sell[updated_prices[i].m] = {p:updated_prices[i].p,t:updated_prices[i].t};
    } else {
      return_prices.buy[updated_prices[i].m] = {p:updated_prices[i].p,t:updated_prices[i].t};
    }
  }
  let res = await this.db.query("INSERT INTO trader_prices2 (i,p,t,s) VALUES "+sql_insert.join(','),sql_args);
  console.log("Trader prices updated: "+res.affectedRows);
  return return_prices;
}
KamadanTrade.prototype.getTraderPrices = async function() {
  let result = {buy:{},sell:{}};
  let query = "SELECT t.p,t.t,t.s, i.m \
            FROM (SELECT MAX(t) AS t, i, s\
              FROM trader_prices2 t\
              GROUP BY i,s) Z \
            JOIN trader_prices2 t ON Z.i = t.i\
              AND Z.t = t.t\
            JOIN trader_items i ON i.i = t.i";
  let rows = await this.db.query(query)
  for(let i=0;i<rows.length;i++) {
    let res = {p:rows[i].p,t:rows[i].t};
    if(rows[i].s) {
      result.sell[rows[i].m] = res;
    } else {
      result.buy[rows[i].m] = res;
    }
  }
  return result;
}
KamadanTrade.prototype.getPricingHistory = async function(model_id,from,to, average_interval_minutes) {
  from = parseInt(from.substr(0,10),10);
  to = parseInt(to.substr(0,10),10);
  if(typeof average_interval_minutes != 'number')
    average_interval_minutes = 60;
  let interval_seconds = average_interval_minutes * 60;
  let interval_rounded = "floor(t/("+interval_seconds+"))*"+interval_seconds;
  // Original query, includes every point.
  let query = "SELECT i.m,t.p,t.t,t.s\
              FROM trader_items i\
              JOIN trader_prices2 t ON i.i = t.i\
                AND t.t >= "+from+" and t.t <= "+to+"\
              WHERE i.m = ?\
              ORDER BY t DESC";
  //let query = "SELECT m,p,t,s FROM trader_prices2 WHERE m = "+model_id+" AND t >= "+from+" and t <= "+to+" ORDER BY t DESC";

  // Rounded to average_interval_minutes
  /*let query = "SELECT * FROM ((SELECT \
            "+interval_rounded+" AS t,\
            m,s,round(avg(p)) AS p \
            FROM trader_prices \
            WHERE m = "+model_id+"\
            AND t >= "+from+"\
            AND t <= "+to+"\
            GROUP BY m,s,"+interval_rounded+" DESC)\
            UNION\
            (SELECT \
            t,m,s,p FROM trader_prices WHERE m = "+model_id+"\
            AND t >= "+from+"\
            AND t <= "+to+"\
            GROUP BY m,s,t DESC LIMIT 1)) Z ORDER BY t desc;";*/

  return await this.db.query(query, model_id.trim());
}

KamadanTrade.prototype.init = function() {
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
    ENGINE=InnoDB;";
    var item_prices_table = "CREATE TABLE IF NOT EXISTS trader_prices2 (\
      t BIGINT(20) UNSIGNED NOT NULL COMMENT 'Unix timestamp with milliseconds',\
      i SMALLINT UNSIGNED NOT NULL COMMENT 'unique id of quoted item, see trader_items',\
      s TINYINT NOT NULL COMMENT '1 if sell quote, 1 if buy quote',\
      p INT UNSIGNED NOT NULL COMMENT 'UTC timestamp of quote',\
      PRIMARY KEY (t,i),\
      INDEX i (i)\
      )\
      COLLATE='utf8mb4_general_ci'\
      ENGINE=InnoDB;";
    var item_ids_table = "CREATE TABLE IF NOT EXISTS `trader_items` (\
      i SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'unique identifier',\
      m VARCHAR(128) NOT NULL COMMENT 'model_id-mod_struct as a string',\
      PRIMARY KEY (i),\
      UNIQUE INDEX model_modstruct (m)\
    )\
    COMMENT='A lookup table of items from trader, keyed by mod struct and model id'\
    COLLATE='utf8mb4_general_ci'\
    ENGINE=InnoDB;";
    return Promise.all([
      self.db.query(item_ids_table),
      self.db.query(item_prices_table),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+"searchlog ( term VARCHAR(100) NOT NULL, last_search BIGINT NOT NULL, count INT NOT NULL, PRIMARY KEY (term)) COLLATE='utf8mb4_general_ci'"),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+"quarantine "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+"deleted "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS whispers "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year-5)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year-4)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year-3)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year-2)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year-1)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year+1)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year+2)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year+3)+" "+create_statement),
      self.db.query("CREATE TABLE IF NOT EXISTS "+self.table_prefix+(year+4)+" "+create_statement)
    ]).then(function() {
      return self.seedLiveMessageLog();
    });
  }).finally(function() {
    self.initting = false;
    self.initted = true;
    console.log("KamadanTrade initialised");
    return Promise.resolve();
  });
}
KamadanTrade.prototype.quarantineCheck = function(message) {
  // True on match
  let msg_norm_manual = message.m.removeDiacritics().removePunctuation().removeUnderscores().removeSpaces();
  for(var i in this.quarantine_regexes) {
    if(this.quarantine_regexes[i].test(msg_norm_manual))
      return true;
  }
  return false;
}
KamadanTrade.prototype.search = async function(term,from_unix_ms,to_unix_ms) {
  term = ((term || '')+'').toLowerCase().trim();
  if(!term.length)
    return this.live_message_log;
  // No need to wait for this one
  this.db.query("INSERT INTO "+this.table_prefix+"searchlog (term,last_search,count) VALUES (?,?,1) ON DUPLICATE KEY UPDATE last_search = ?, count = count+1",[term,Date.now(),Date.now()])
      .catch(function(e) {console.error(e);});
  let by_user = false;
  if(term.indexOf('user:') == 0) {
    by_user = true;
    term = term.substring(5);
  }
  let to_date = new Date();
  let from_date;
  let latest_year;
  let earliest_year = 2015;
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
  await this.init();
  let args = [];
  let where_clause = '';
  if(by_user) {
    // Search by user
    where_clause = " WHERE s = ? ";
    args.push(term);
  } else {
    // Split string by spaces
    let keywords = term.split(' ');
    let incwords = [];
    let exwords = [];
    for(let i=0;i<keywords.length;i++) {
      switch(keywords[i][0]) {
        case '!':
          if(keywords[i].length > 1)
            exwords.push(keywords[i].substr(1));
          break;
        default:
          incwords.push(keywords[i]);
          break;
      }
    }
    // Include these words...
    for(let i=0;i<incwords.length;i++) {
      where_clause += where_clause.length ? " AND" : " WHERE";
      where_clause+= " m LIKE ? ";
      args.push('%'+incwords[i]+'%');
    }
    // ...but exclude these ones.
    for(let i=0;i<exwords.length;i++) {
      where_clause += where_clause.length ? " AND" : " WHERE";
      where_clause+= " m NOT LIKE ? ";
      args.push('%'+exwords[i]+'%');
    }
  }
  let rows_final = [];
  let db = this.db;
  let self=this;
  let searchYear = async function(year) {
    if(year < earliest_year)
      return rows_final;
    let where = where_clause;
    if(year == earliest_year && from_date)
      where += " AND t > "+from_date.getTime();
    if(year == latest_year && to_date)
      where += " AND t < "+to_date.getTime();
    let sql = "SELECT t,s,m FROM kamadan."+self.table_prefix+year+" "+where+" ORDER BY t DESC LIMIT "+search_results_max;
    //console.log(sql);
    let rows = await db.query(sql,args);
    for(let i in rows) {
      rows_final.push(rows[i]);
    }
    if(rows_final.length < search_results_max && latest_year - year < 3) // NOTE: search back 3 years max
      return await searchYear(year-1);
    return rows_final;
  };
  return await searchYear(latest_year);
}
KamadanTrade.prototype.parseMessageFromRequest = function(req,timestamp) {
  let body = req.body || '';
  if(typeof body == 'string') {
    try {
      body = JSON.parse(body);
    } catch(e) {}
  }
  let message = {
    m:((body.m || body.message || '')+'').trim(),
    s:((body.s || body.sender || '')+'').trim(),
    t:timestamp
  }
  if(!message.m || !message.s)
    return new Error("Missing sender/message when creating message");

  // Parse message content
  message.m = message.m.replace(/\\(\\|\[|\])/g,'$1');
  // 2020-03-06: RMT adding garbage to the end of their message
  message.m = message.m.replace(/----[0-9]+$/,'');
  // 2021-10-27: Bots sending random numbers to trade chat
  message.m = message.m.replace(/^[0-9]+$/,'');
  if(!message.m.length)
    return new Error("Message is empty");
  return message;
}
KamadanTrade.prototype.addWhisper = async function(req,timestamp) {
  let message = this.parseMessageFromRequest(req,timestamp);
  if(message instanceof Error)
    return message;
  console.log("Whisper received from "+message.s+": "+message.m);
  this.db.query("INSERT INTO whispers (t,s,m) values (?,?,?)",[message.t,message.s,message.m]);
  // Do something with this whisper
  let matches;
  if(matches = /delete ([0-9]{13})/i.exec(message.m)) {
    // Someone wants to delete a trade message.
    let date = new Date(parseInt(matches[1],10));
    if(date.getUTCFullYear() < 2015 || date.getTime() > Date.now())
      throw "Player "+message.s+" wants to delete message "+matches[1]+", but this is an invalid date";
    let r = date.getTime();
    let res = await this.db.query("INSERT INTO "+this.table_prefix+"deleted SELECT * FROM "+this.table_prefix+date.getUTCFullYear()+" WHERE t = ? AND s = ?",[r,message.s]);
    if(!res.affectedRows)
      throw "Player "+message.s+" wants to delete message "+matches[1]+", but no rows were affected";
    await this.db.query("DELETE FROM "+this.table_prefix+date.getUTCFullYear()+" WHERE t = ? AND s = ?",[r,message.s]);
    for(let i=0;i < this.live_message_log.length;i++) {
      if(this.live_message_log[i].t == r) {
        this.live_message_log.splice(i,1);
        break;
      }
    }
    // Success; return object with "r" set to timestamp of message to remove via connected clients.
    return {r:r};
  }
}
KamadanTrade.prototype.quarantineMessage = async function(message) {
  //console.log("Message hit quarantine");
  //console.log(message.m);
  let table = this.table_prefix+'quarantine';
  await this.db.query("INSERT INTO "+table+" (t,s,m) values (?,?,?)", [message.t,message.s,message.m]);
  this.last_quarantine_by_user[message.s] = message.t;
  return message;
}
KamadanTrade.prototype.getQuarantine = async function(from,to) {
  let queries = [
      ["SET sql_mode=(SELECT REPLACE(@@sql_mode, 'ONLY_FULL_GROUP_BY', ''));"],
      ["SELECT FROM_UNIXTIME(t / 1000,\"%Y-%m-%d %h:%i:%s\") as timestamp_utc, s as player_name,\n" +
      "      m as trade_message FROM (SELECT *\n" +
      "      FROM kamadan_quarantine\n" +
      "  WHERE t > "+from+"\n" +
      "  AND t < "+to+") Z\n" +
      "  GROUP BY player_name\n" +
      "  ORDER BY timestamp_utc DESC;"]
  ];
  let res = await this.db.queryMultiple(queries);
  return res;
}
KamadanTrade.prototype.addMessage = async function(req,timestamp, channel) {
  let message = this.parseMessageFromRequest(req,timestamp);
  if(message instanceof Error)
    throw message;
  //console.log("Trade message received OK");
  let quarantined = this.quarantineCheck(message);

  if(quarantined) {
    await this.quarantineMessage(message);
    return false;
  }
  if(this.last_quarantine_by_user[message.s] && (Date.now() - this.last_quarantine_by_user[message.s]) < 36e5) {
    // This sender has a quarantine less than an hour ago; stops spammers trying to test the system
    return false;
  }
  let table = this.table_prefix+(new Date()).getUTCFullYear();
  switch(channel) {
    case MessageType_Chat_Trade:
    case MessageType_PartySearch_Trade:
      break;
    default:
      console.log("Non-trade chat message received");
      return false;
  }

  await this.init();

  let existing_message_id = false;
  if(channel === MessageType_PartySearch_Trade) {
    // Check to see if we've received a chat version of this message from this user less than 2 seconds ago with the same message.
    let res = await this.db.query("SELECT m,t FROM "+table+" WHERE s = ? AND m <> ? AND t > ? ORDER BY t DESC LIMIT 5",
        [message.s,message.m,message.t - 2000]);
    for(let i=0;i<res.length;i++) {
      if(res[i].m.length > message.m.length && res[i].m.indexOf(message.m) === 0) {
        console.log("Found existing chat version of this message, no need to write to database.")
        return false; // no need to write
      }
    }
  }
  if(channel === MessageType_Chat_Trade && message.m.length > 31) {
    // Check to see if we've received a party search advert from this user less than 2 seconds ago with the same message.
    let trade_search_message = message.m.substring(0,31);
    let res = await this.db.query("SELECT m,t FROM "+table+" WHERE s = ? AND m = ? AND t > ? ORDER BY t DESC LIMIT 1",
        [message.s,trade_search_message,message.t - 2000]);
    if(res.length) {
      existing_message_id = parseInt(res[0].t);
      console.log("Found party search version of this message; replace found message with this one.")
    }
  }
  // Avoid spam by the same user (or multiple trade message sources!)
  let last_user_msg = this.last_message_by_user[message.s];
  let last_user_message_body = last_user_msg ? last_user_msg.m.removePunctuation() : '';
  let message_less_punctuation = message.m.removePunctuation();
  if(last_user_message_body && last_user_message_body === message_less_punctuation) {
    if(Math.abs(message.t - last_user_msg.t) < this.flood_timeout) {
      console.log("Flood filter hit for "+last_user_msg.s+", "+Math.abs(message.t - last_user_msg.t)+"ms diff");
      return false;
    }
    // Avoid spammers adding random chars to their trade message by consolidating it.
    message.m = last_user_msg.m;
  }
  if(!existing_message_id) {
    // Look for the same message from this user in the last 14 days...
    let res = await this.db.query("SELECT t FROM "+table+" WHERE s = ? AND m = ? AND t > ? ORDER BY t DESC LIMIT 1",[message.s,message.m,message.t - (864e5 * 14)]);
    if(res.length) {
      existing_message_id = parseInt(res[0].t);
    }
  }
  if(existing_message_id) {
    // ...if found, just update the timestamp of the found message to be new again
    // message.r = "Replace with this message id"
    message.r = existing_message_id;
    await this.db.query("UPDATE "+table+" SET t = ?, m = ? WHERE t = ?",[message.t,message.m,existing_message_id]);
  } else {
    // ...if not found, insert this message as a new trade message!
    await this.db.query("INSERT INTO "+table+" (t,s,m) values (?,?,?)", [message.t,message.s,message.m]);
  }
  this.last_message_by_user[message.s] = message;
  if(quarantined)
    return false;
  // live message log
  this.live_message_log.unshift(message);
  if(message.r) {
    for(let i=0;i < this.live_message_log.length;i++) {
      if(this.live_message_log[i].t == message.r) {
        this.live_message_log.splice(i,1);
        break;
      }
    }
  }
  while(this.live_message_log.length > live_message_log_max) {
    this.live_message_log.pop();
  }
  this.last_message = message;
  return message;
}
KamadanTrade.prototype.getMessagesSince = function(h) {
  let slice_end = 0;
  while(slice_end < this.live_message_log.length && this.live_message_log[slice_end].h != h) {
    slice_end++;
  }
  return this.live_message_log.slice(0,slice_end);
}
KamadanTrade.prototype.seedLiveMessageLog = async function() {
  let year = (new Date()).getUTCFullYear();
  let rows = await this.db.query("SELECT t, s, m FROM kamadan."+this.table_prefix+year+" ORDER BY t desc LIMIT "+live_message_log_max);
  this.live_message_log = rows;
  this.last_message = this.live_message_log[0];
  console.log(this.live_message_log.length+" messages retrieved from db");
}

if(module && module.exports) {
  module.exports.KamadanTrade = KamadanTrade;
}