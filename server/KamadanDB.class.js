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
        var start = Date.now();
        return conn.query(query, args || []).then(function(results) {
          var duration = (Date.now() - start);
          if(duration > 30) {
            console.log("SLOW QUERY: "+query+"\nDuration: "+duration+"ms");
          }
          delete results['meta'];
          return Promise.resolve(results);
        }).finally(function() {
          conn.end(function(err) {
            if(err) conn.destroy();
          });
        });
      });
    });
  },
  batch:function(query,args) {
    var self = this;
    
    return this.init().then(function() {
      //console.log("KamadanDB BATCH: "+query);
      return self.pool.getConnection().then(function(conn) {
        return conn.batch(query, args || []).then(function(results) {
          //console.log(results);
          delete results['meta'];
          return Promise.resolve(results);
        }).finally(function() {
          conn.end(function(err) {
            if(err) conn.destroy();
          });
        });
      });
    });
  },
  seed:function() {
    var self=this;
    return Promise.resolve();
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
      connectionLimit: 10
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