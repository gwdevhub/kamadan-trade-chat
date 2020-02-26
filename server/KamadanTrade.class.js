var live_message_log = [];
var live_message_log_max = 100;

var fs = require('fs');
// https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
var defaultDiacriticsRemovalMap = [
    {'base':'A', 'letters':'\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'},
    {'base':'AA','letters':'\uA732'},
    {'base':'AE','letters':'\u00C6\u01FC\u01E2'},
    {'base':'AO','letters':'\uA734'},
    {'base':'AU','letters':'\uA736'},
    {'base':'AV','letters':'\uA738\uA73A'},
    {'base':'AY','letters':'\uA73C'},
    {'base':'B', 'letters':'\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181'},
    {'base':'C', 'letters':'\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E'},
    {'base':'D', 'letters':'\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779\u00D0'},
    {'base':'DZ','letters':'\u01F1\u01C4'},
    {'base':'Dz','letters':'\u01F2\u01C5'},
    {'base':'E', 'letters':'\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E'},
    {'base':'F', 'letters':'\u0046\u24BB\uFF26\u1E1E\u0191\uA77B'},
    {'base':'G', 'letters':'\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E'},
    {'base':'H', 'letters':'\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D'},
    {'base':'I', 'letters':'\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'},
    {'base':'J', 'letters':'\u004A\u24BF\uFF2A\u0134\u0248'},
    {'base':'K', 'letters':'\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2'},
    {'base':'L', 'letters':'\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780'},
    {'base':'LJ','letters':'\u01C7'},
    {'base':'Lj','letters':'\u01C8'},
    {'base':'M', 'letters':'\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C'},
    {'base':'N', 'letters':'\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4'},
    {'base':'NJ','letters':'\u01CA'},
    {'base':'Nj','letters':'\u01CB'},
    {'base':'O', 'letters':'\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C'},
    {'base':'OI','letters':'\u01A2'},
    {'base':'OO','letters':'\uA74E'},
    {'base':'OU','letters':'\u0222'},
    {'base':'OE','letters':'\u008C\u0152'},
    {'base':'oe','letters':'\u009C\u0153'},
    {'base':'P', 'letters':'\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754'},
    {'base':'Q', 'letters':'\u0051\u24C6\uFF31\uA756\uA758\u024A'},
    {'base':'R', 'letters':'\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782'},
    {'base':'S', 'letters':'\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784'},
    {'base':'T', 'letters':'\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786'},
    {'base':'TZ','letters':'\uA728'},
    {'base':'U', 'letters':'\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'},
    {'base':'V', 'letters':'\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245'},
    {'base':'VY','letters':'\uA760'},
    {'base':'W', 'letters':'\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72'},
    {'base':'X', 'letters':'\u0058\u24CD\uFF38\u1E8A\u1E8C'},
    {'base':'Y', 'letters':'\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE'},
    {'base':'Z', 'letters':'\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762'},
    {'base':'a', 'letters':'\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'},
    {'base':'aa','letters':'\uA733'},
    {'base':'ae','letters':'\u00E6\u01FD\u01E3'},
    {'base':'ao','letters':'\uA735'},
    {'base':'au','letters':'\uA737'},
    {'base':'av','letters':'\uA739\uA73B'},
    {'base':'ay','letters':'\uA73D'},
    {'base':'b', 'letters':'\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253'},
    {'base':'c', 'letters':'\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'},
    {'base':'d', 'letters':'\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A'},
    {'base':'dz','letters':'\u01F3\u01C6'},
    {'base':'e', 'letters':'\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'},
    {'base':'f', 'letters':'\u0066\u24D5\uFF46\u1E1F\u0192\uA77C'},
    {'base':'g', 'letters':'\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F'},
    {'base':'h', 'letters':'\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'},
    {'base':'hv','letters':'\u0195'},
    {'base':'i', 'letters':'\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'},
    {'base':'j', 'letters':'\u006A\u24D9\uFF4A\u0135\u01F0\u0249'},
    {'base':'k', 'letters':'\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'},
    {'base':'l', 'letters':'\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747'},
    {'base':'lj','letters':'\u01C9'},
    {'base':'m', 'letters':'\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'},
    {'base':'n', 'letters':'\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5'},
    {'base':'nj','letters':'\u01CC'},
    {'base':'o', 'letters':'\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'},
    {'base':'oi','letters':'\u01A3'},
    {'base':'ou','letters':'\u0223'},
    {'base':'oo','letters':'\uA74F'},
    {'base':'p','letters':'\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755'},
    {'base':'q','letters':'\u0071\u24E0\uFF51\u024B\uA757\uA759'},
    {'base':'r','letters':'\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'},
    {'base':'s','letters':'\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B'},
    {'base':'t','letters':'\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'},
    {'base':'tz','letters':'\uA729'},
    {'base':'u','letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'},
    {'base':'v','letters':'\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'},
    {'base':'vy','letters':'\uA761'},
    {'base':'w','letters':'\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'},
    {'base':'x','letters':'\u0078\u24E7\uFF58\u1E8B\u1E8D'},
    {'base':'y','letters':'\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'},
    {'base':'z','letters':'\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'}
];

var diacriticsMap = {};
for (var i=0; i < defaultDiacriticsRemovalMap .length; i++){
    var letters = defaultDiacriticsRemovalMap [i].letters;
    for (var j=0; j < letters.length ; j++){
        diacriticsMap[letters[j]] = defaultDiacriticsRemovalMap [i].base;
    }
}

// "what?" version ... http://jsperf.com/diacritics/12
function removeDiacritics (str) {
    return str.replace(/[^\u0000-\u007E]/g, function(a){ 
       return diacriticsMap[a] || a; 
    });
}  


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
    var msg_norm_auto = message.m.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    var msg_norm_manual = removeDiacritics(message.m);
    for(var i in this.quarantine_regexes) {
      if(this.quarantine_regexes[i].test(msg_norm_auto))
        return true;
      if(this.quarantine_regexes[i].test(msg_norm_manual))
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
      console.log("Flood filter hit for "+last_user_msg.s+", "+Math.abs(message.t - last_user_msg.t)+"ms diff");
      return Promise.resolve(false);
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