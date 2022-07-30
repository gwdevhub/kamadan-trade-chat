var mariadb = require('mariadb');
var ServerConfig = require(__dirname+'/ServerConfig.class.js');
const { exec,spawn } = require("child_process");
const fs = require("fs"); // Or `import fs from "fs";` with ESM 
// Promosified shell command
async function cmd(cmd, log_output = true, throw_on_fail = true) {
  return new Promise((resolve, reject) => {
    let stdout_buf = '', stderr_buf='', options = {};
    let first_arg = cmd;
    if(typeof cmd == 'string') {
      options.shell = true;
      cmd = [];
    } else {
      first_arg = cmd.shift();
    }
    let spawn_args = [first_arg,cmd,options];
    console.log(' >>> '+([first_arg].concat(cmd).join(' ')));
    let proc    = spawn.apply(exec,spawn_args);
    proc.stdout.on('data', function (data) {
      if(log_output) console.log(' <<< ' +data.toString());
      stdout_buf += data.toString();
    });

    proc.stderr.on('data', function (data) {
      if(log_output) console.log(' <<< '+data.toString());
      stdout_buf += data.toString();
    });
    if(throw_on_fail)
      proc.on('error', reject);
    proc.on('exit', function (code) {
      if(code != 0 && throw_on_fail) {
      console.log(' <<< '+stdout_buf);
      return reject(code);
    }
      return resolve(stdout_buf);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
} 

let KamadanDB = {
  query:async function(query,args) {
    await this.init();
    let conn = null;
    let results = [];
    try {
      conn = await this.pool.getConnection();
      let start = Date.now();
      results = await conn.query(query, args || []);
      let duration = (Date.now() - start);
      if(duration > 30) {
        console.log("SLOW QUERY: "+query+"\nDuration: "+duration+"ms");
      }
      delete results['meta'];
    } catch(e) {
      console.error(e);
    }
    if(conn) {
      conn.end().finally(conn.destroy());
    }
    return results;
  },
  batch:async function(query,args) {
    await this.init();
    let conn = null;
    let results = [];
    try {
      conn = await this.pool.getConnection();
      results = await conn.batch(query, args || []);
      delete results['meta'];
    } catch(e) {
      console.error(e);
    }
    if(conn) {
      conn.end().finally(conn.destroy());
    }
    return results;
  },
  dump:async function(schema_regex) {
    // @Cleanup: escape regex?
    let schemas = await this.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME REGEXP '"+schema_regex+"';");
    let files_to_clean = [];
    let now = new Date();
    let tmp_sql_folder = '/tmp/'+now.getUTCFullYear()+'-'+now.getUTCMonth()+'-'+now.getUTCDate()+'_'+schema_regex+'_'+Date.now();
    let gzipped_mysql_file = tmp_sql_folder+'.tar.gz';

    try {
      await cmd('mkdir '+tmp_sql_folder,false);
      files_to_clean[tmp_sql_folder] = 1;
      let credentials = '--host='+this.host+' --user='+this.user+' --password="'+this.password+'"';
      // 1 sql file per schema
      for(let i=0;i<schemas.length;schemas++ ) {
        let db_name = schemas[i].SCHEMA_NAME.trim();
        if(!db_name.length)
          continue;
        let mysql_file = tmp_sql_folder+'/'+db_name+'.sql';
        // NB: you'll have to import --force for this to work due to create table statements.
        // NB: Create database statements later
        await cmd('mysqldump '+credentials+' --insert-ignore --no-create-db --skip-add-drop-table '+db_name+' > '+mysql_file, false);
        files_to_clean[mysql_file] = 1;
        
        // Ensure "create table if not exists" and "use" statements
        let extra_lines = "CREATE DATABASE IF NOT EXISTS "+db_name+";\n USE "+db_name+";\n";
        let tmp_file = mysql_file+'.tmp';
        files_to_clean[tmp_file] = 1;
        fs.writeFileSync(tmp_file,extra_lines,'utf8');
        await cmd('cat '+mysql_file+' >> '+tmp_file);
        await cmd('mv '+tmp_file+' '+mysql_file);
      }
      // Gzip file.
      
      await cmd('tar -zcvf '+gzipped_mysql_file+' '+tmp_sql_folder);
      if(!fs.existsSync(gzipped_mysql_file))
        throw "Failed to create gzip file @ "+gzipped_mysql_file;
      let stats = fs.statSync(gzipped_mysql_file)
      let fileSizeInBytes = stats["size"]
      if(fileSizeInBytes < 5000)
        throw "Failed to create gzip file @ "+gzipped_mysql_file;
      delete files_to_clean[gzipped_mysql_file]; // dont want to delete this one.
      console.log("Mysql file created OK @ "+gzipped_mysql_file);
    } catch(e) {
      console.error(e);
    }
    for(let i in files_to_clean) {
      await cmd('rm -R '+i,false,false);
    }
    if(!fs.existsSync(gzipped_mysql_file))
      return false;
    return gzipped_mysql_file;
  },
  seed:async function() {
    return;
  },
  init:async function() {
    if(this.initted)
      return;
    if(this.initting)
      return (await sleep(500)), await this.init();
    this.initting = true;
    console.log("Initialising KamadanDB");
    this.user = ServerConfig.get('db_user');
    this.password = ServerConfig.get('db_pass');
    this.host = ServerConfig.get('db_host') || '127.0.0.1';
    this.database = ServerConfig.get('db_schema');
    this.pool = mariadb.createPool({
      host: this.host, 
      database:this.database,
      user:this.user, 
      password: this.password,
      connectionLimit: 10
    });
    await this.seed();
    this.initting = false;
    this.initted = true;
    console.log("KamadanDB initialised");
  }
};
if(module && module.exports)
  module.exports = KamadanDB;