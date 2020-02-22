var mariadb = require('mariadb');
var ServerConfig = require(__dirname+'/ServerConfig.class.js');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

var KamadanDB = {
  query:function(query,args) {
    var self = this;
    //console.log("KamadanDB QUERY: "+query);
    return this.init().then(function() {
      return self.pool.getConnection().then(function(conn) {
        return conn.query(query, args || []).then(function(results) {
          //console.log(results);
          delete results['meta'];
          return Promise.resolve(results);
        }).finally(function() {
          conn.end();
        });
      });
    });
  },
  batch:function(query,args) {
    var self = this;
    
    return this.init().then(function() {
      console.log("KamadanDB BATCH: "+query);
      return self.pool.getConnection().then(function(conn) {
        return conn.batch(query, args || []).then(function(results) {
          //console.log(results);
          delete results['meta'];
          return Promise.resolve(results);
        }).finally(function() {
          conn.end();
        });
      });
    });
  },
  seed:function() {
    var self=this;
    return Promise.all([
      self.query("CREATE TABLE IF NOT EXISTS kamadan.trade_messages (\
        t INT(10) UNSIGNED NOT NULL COMMENT 'Unix timestamp',\
        n SMALLINT(5) UNSIGNED NOT NULL COMMENT 'Milliseconds',\
        s VARCHAR(100) NULL DEFAULT NULL COMMENT 'Sender',\
        m VARCHAR(255) NULL DEFAULT NULL COMMENT 'Message',\
        PRIMARY KEY (t, n),\
        FULLTEXT INDEX m (m)\
      )\
      COLLATE='utf8mb4_general_ci'\
      ENGINE=InnoDB;")
    ]);
  },
  init:function() {
    var self = this;
    if(this.initted)
      return Promise.resolve();
    if(this.initting)
      return sleep(500).then(function() { return self.init(); });
    this.initting = true;
    console.log("Initialising KamadanDB");
    this.pool = mariadb.createPool({
      host: ServerConfig.get('db_host') || '127.0.0.1',
      database:ServerConfig.get('db_schema'),
      user:ServerConfig.get('db_user'), 
      password: ServerConfig.get('db_pass'),
      connectionLimit: 5
    });
    var self = this;
    self.initted = true;
    return self.seed().finally(function() {
      self.initting = false;
      self.initted = true;
      console.log("KamadanDB initialised");
    });
  }
};
if(module && module.exports)
  module.exports = KamadanDB;