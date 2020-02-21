var mariadb = require('mariadb');
var TradeDB = {
  query:function(query) {
    var self = this;
    return this.init().then(function() {
      return self.pool.getConnection();
    }).then(function(conn) {
      return conn.query(query).then(function(results) {
        conn.end();
        return results;
      });
    });
  },
  seed:function() {
    return Promise.all([
      this.query("CREATE TABLE `test` (
        `Column 1` INT(11) NOT NULL,
        `Column 2` INT(11) NULL DEFAULT NULL,
        `Column 3` INT(11) NULL DEFAULT NULL,
        PRIMARY KEY (`Column 1`)
      )
      COLLATE='utf8mb4_general_ci'
      ENGINE=InnoDB")
    ]);
  },
  init:function() {
    if(this.initted)
      return Promise.resolve();
    this.initted = true;
    this.pool = mariadb.createPool({
      host: '127.0.0.1', 
      user:ServerConfig.get('db_user'), 
      password: ServerConfig.get('db_password'),
      connectionLimit: 5
    });
    return this.seed();
  }
};

module.exports.TradeDB = TradeDB;