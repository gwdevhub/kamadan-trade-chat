var fs = require('fs');

var ServerConfig = {
	debug:0,
	settings:{},
	init:function() {
		if(this.loaded)
			return;
		this.loaded=1;
		if(!fs.existsSync(__dirname+'/../server_config.json'))
			return console.error("ServerConfig: No file @ "+__dirname+'/../server_config.json');
		try {
			eval("this.settings = "+fs.readFileSync(__dirname+'/../server_config.json'));
			if(this.debug)console.log("Settings loaded:\n"+JSON.stringify(this.settings));
		} catch(e) {
			console.error("ServerConfig: Failed to load file from "+__dirname+'/../server_config.json');
			return;
		}
	},
	get:function(key) {
		this.init();
		if(typeof key === 'undefined')
			return JSON.parse(JSON.stringify(this.settings));
		return this.settings.hasOwnProperty(key) ? JSON.parse(JSON.stringify(this.settings[key])) : undefined
	},
	isLocal:function() {
		this.init();
		return this.get('is_local') === 1;
	},
	isCloud:function() {
		this.init();
		return this.get('is_cloud') === 1;
	},
	isDevelopment:function() {
		return !this.isProduction();		
	},
	isProduction:function() {
		this.init();
		return this.get('is_production') === 1;
	}

}

if(exports) {
	for(var i in ServerConfig) {
		exports[i] = ServerConfig[i];
	}
} else {
	ServerConfig.init();
}