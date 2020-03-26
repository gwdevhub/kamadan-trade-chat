var GuildWars = {
  // data:image/png;base64,
  materials:{
    930:{
      name:"Glob of Ectoplasm",
      icon:"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"
    },
    933:{
      name:"10 Feathers",
      icon:"iVBORw0KGgoAAAANSUhEUgAAABQAAAAYCAYAAAD6S912AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEgAACxIB0t1+/AAAAAd0SU1FB9sDEBYhEsQZ0GoAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuNv1OCegAAANWSURBVEhLnZVtSFNhFMe33d3NeTdyuk1zvqyamqabLVNTI1YWpWGalS6KSIsyI2hEhb18sSBkXzKtyNJNe9MPab5tc1Nz1ZyREZkWUagEBUGhHyTC3Ok884uf2tU//Lj3Puf/HO7z3Oecy1miqCCGTgoXBFwMpgR78FmO8HyRRYqrYJjQFRLGGBVAT68Ti0ETGDjF5wdsxJh43sJeXIZhFInyENfOiAhIY4SQyoggmRHNCgSC0xgPnbexE08iEcSmJarfFaXEw35tHOhlQRApXTYXror+RtN0KXqUCNfnZiEmfX1S/aHd2+DiwT2Qr4sHHSZMUi7/kbByxUcezduHHtZvSHMoTmGV6ZK3u6MZKk4chi261bBVGw9FmekQG6YYQk8BovC5/YgrkUjiRBKqzuG0g9v9Ag4YdkBhfjbsLcgFtSpqhM/jnUdfKhLom+FHweVlx5xhSvnPvj4nXKgoh8wMDahXhYNOt8YrFgfWoGc7Eo743T/hzrycUy3ND7x36+vAZrOCw2YH69MWuFZZ4U1YrR5AzxFkJcInE/4nrlKh1Dx88Hja4XSBxzMMt+/cAbPFDPYeO5QeLR1GjxHZgLA6f5IjpSeful+OgGfoLZibmjCREzo6WqG2tmaaS3Er0aNHghH/R0Uulyc/aX392z04Ae8/TILV1gtt7R3g6u/5Gx0dYUHLXiQSYXXuRCUlJSab4wWMYbIb1TXQaXOAo+8Z6PV6N8bJviUgAmJmI3ntzVsDnldvwNHbD12dPdBttYPZbPnF5/MvYzwDYXxOFiIdQ5WTlzczPj6OiWww+PINeNwe2JK9qRtjhQgpMdbCsqS1JtP12YnJ7zDgGoTOrp4/Wu3aNoydRDSIkBjZiGxwokqlenS8rGyUJCsqNoBGqxmOWRXTTlEUOcCk77EWhUSnpqbYjMZT3qbGx9Df+xxMVaY5kUhEvmwWwqq8FipuV17u1y9fPoOlwYLJqmY26zc9w3Gy3DWI34pYKBpJv3qlcmZsbBQa7jVCZlbWJxwjzTMNCUIWJbLkWIPB4LJYLLMhCtkUJaSu4dhWJARh3TwXKuzc2TP3ZTJZNd6fQ/KRKGRJPyAiaUbGBvIBSEtPQUhbIluxZAVLpdJivG5GpMgil8nh/AMSWCpDefqtzgAAAABJRU5ErkJggg=="
    },
    934:{
      name:"10 Plant Fibers",
      icon:"iVBORw0KGgoAAAANSUhEUgAAABAAAAAUCAYAAACEYr13AAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAALEgAACxIB0t1+/AAAAAd0SU1FB9sDEBYhLAV4zcEAAAAYdEVYdFNvZnR3YXJlAHBhaW50Lm5ldCA0LjEuNv1OCegAAAOZSURBVDhPYyASMEJpkgFTRKCrE5CWBLHBIiQAkAa+uuK49UAaZAgnSJBYwDGxq7qEi5XVMDncbaqutlpKRWlSLFBcFIgJeoc5NMA5Pi7K54OetuqSeZNqLnc2F57vaCt6ys3N7QyUJ+gSDgkJCa9JbWXfmyuz/hfnxv3PTPD9pKersbK2IHYaUB4UHjgB+4wZ3Z2pMV53qguT/7ZUpP8PdNP/P3dS6VtdHbXuvq6Cg0A1mkCM0xuiKcmRe2ZOqPyfmxb7v7Mm439soMP/1tqUv20NhT/K86JeAtXYAjErWDUaYAFiEXtr49aS3PhTSxdO/V9RkPS/MD38j7mJ2hZ/b4erSREe/80NNCqA6gTAOpAAe1FBXH96akRHVXnOiSmTGw411xf9L82N+T9vasMvbU21ttAAl6lJ0X7/o4KclgHVK0K0QQBHfGxARn1NzjdPF4v/lma6//08HP8oK8o87+ko/xIV7nmqqyn3X0tj3v+kWKf/bXVpP2tKk/KB+iCucHa2NDx6aOO/nq6K/+6u5v8bakv+iwsLngVK1Xu5WtzJSgm8rqujssjb3epSUVbY/4hgp4N6OsqVQHllIGZi0NVVNlq9fMqPhtqc/zY2hruUleQeWJvqHwJK+pgbafyOCnb+l5kUvjrA03zdhM7i/0JCfPXWFgbJbdUZ8ZV5ETFAdQxyqYnBO8KDXf4bG2quU1dX3Rng4/LW18u2N8DH5p+thc7/Kb21b5ysdRfJSIoc62wp/rhuae+fkpzoR/ZW+nNABvDYWhtl93WX3F6/dvo/O1vzB0YGOv/L8qP+J0e7/zfUkf9fU5nyNzcr+GtWiv/LIF/bz2nJ/k9kZcUmAfWGgQxgBiZRHSAd7e1hv7YwL/Z/X0fefz0dtf/62vL/A32s/rs5Gt8XExWeWJcf+qm9Nvt/T0vR/+7GjGd5aZ6LQAawpWbEZFZVZp2LifY9OKG35n9yYvB/E0OV/yG+Vt9Dfaz/ezuZ/JGREKgvLY743AqMjfAA56/G+uoLgHrjQQaAEpCOi7PVOnl5qUmeHg67/f1cDwjwcfWHBzqt9HK1/KyrpfLfyc7gq5KCxP/ocPf/CfEB+4B6AoFYBmQACAhzsrGBBHyA2BWIA4DYzMJIO4WDja26rir3AtB178yMNN9HhLgeZ2NhKgTKgxITPE+wAbEsEAsDMSi78gMxKL1LAbEhMzODJ5DOAeJMIAY5Wx+IORgYGBgATcc/J/v0QNcAAAAASUVORK5CYII="
    }
  }
}

var KamadanClient = {
  poll_interval:3000,
  ws_interval:60000,
  debug:/local/.test(window.location.hostname),
  log:function() {
    if(!this.debug) return;
    console.log.apply(console,arguments);
  },
  error:function() {
    //if(!this.debug) return;
    console.error.apply(console,arguments);
  },
  max_messages:100,
  last_search_term:'',
  message_alert_checks:{},
  current_display:'live',
  last_search_date:null,
  search_results:[],
  messages:[],
  getSearchTerm:function() {
    return (this.search_input.value+'').trim();
  },
  promptDelete:function(message) {
    if(!message || !window.client_player_name)
      return;
    document.getElementById('delete_message_sender').innerHTML = message.s;
    document.getElementById('delete_message_cmd').innerHTML = "/whisper "+window.client_player_name+", DELETE "+message.t;
    document.getElementById('delete_message_modal').style.display = 'flex';
  },
  clearSearch:function() {
    this.search_input.value = this.last_search_term = '';
    this.search_results = [];
    this.current_display = 'live';
    this.redrawMessages();
  },
  loadMore:function() {
    if(this.current_display != 'search' || !this.search_results.length || this.searching)
      return;
    var earliest_msg = this.search_results[this.search_results.length - 1];
    if(this.last_searched_offset == earliest_msg.t)
      return; // Reached end of results
    this.search(this.last_search_term,earliest_msg.t);
  },
  search:function(term,offset) {
    if(term)
      this.search_input.value = term;
    term = this.getSearchTerm();
    offset = offset || 0;
    var endpoint = '/s/';

    if(this.searching)
      return;
    this.searching = 1;
    
    this.last_search_date = Date.now();
    this.last_searched_offset = offset;
    if(this.last_search_term != term || offset == 0) {
      this.search_results = [];
      this.clearMessages();
      window.scrollTo(0,0);
    }
    if(!term.length) {
      this.searching = 0;
      this.clearSearch();
      return;
    }
    var self = this;
    var req = new XMLHttpRequest();
    this.current_display = 'search';
    this.redrawMessages();
    document.getElementById('search-info').innerHTML = "Searching for <i>"+term+"</i>...";
    req.addEventListener("load", function() {
      var result = [];
      try {
        if(this.response.length)
          result = JSON.parse(this.response);
      } catch(e) {
        self.error(e);
      }
      self.search_input.value = self.last_search_term = term;
      self.current_display = 'search';
      self.parseSearchResults(result);
      self.searching = 0;
    });
    req.addEventListener("error",function() {
      self.search_input.value = self.last_search_term = term;
      self.current_display = 'search';
      self.parseSearchResults([]);
      self.searching = 0;
    });
    req.open("GET", endpoint+encodeURIComponent(term)+'/0/'+offset);
    req.send();
  },
  setPollInterval:function(ms) {
    this.poll_interval = Math.min(120000,ms);
    this.log("Poll interval set to "+ms+"ms");
  },
  setWebsocketInterval:function(ms) {
    this.ws_interval = Math.min(120000,ms);
    this.log("Websocket interval set to "+ms+"ms");
  },
  getLastMessage:function() {
    return this.messages ? this.messages[0] : null;
  },
  getMessageById:function(id) {
    for(var i in this.messages) {
      if(this.messages[i].t == id)
        return this.messages[i];
    }
    for(var i in this.search_results) {
      if(this.search_results[i].t == id)
        return this.search_results[i];
    }
    return false;
  },
  init:function() {
    window.scrollTo(0,0);
    this.current_wrapper = document.getElementById('current-wrapper');
    this.page_wrapper = document.getElementById('page');
    this.results_header = document.getElementById('results-header');
    this.table_wrapper = this.current_wrapper.parentElement;
    this.search_input = document.getElementById('search-input');
    this.footer = document.getElementById('footer');
    this.websocket_url = "ws://"+window.location.hostname;
    if(window.location.protocol == 'https:') {
      this.websocket_url = "wss://"+window.location.hostname;
    }
    this.last_search_term = this.getSearchTerm();
    this.search_results = window.search_results || [];
    var self = this;
    
    this.current_wrapper.addEventListener('click',function(e) {
      if(e.target.className != 'delete')
        return;
      var message = self.getMessageById(e.target.parentElement.id);
      if(!message)
        return;
      self.promptDelete(message);
    });
    
    document.getElementById('delete_message_dismiss').addEventListener('click',function(e) {
      document.getElementById('delete_message_modal').style.display = 'none'
    });
    document.getElementById('home-link').addEventListener('click',function(e) {
      if(window.location.pathname.length > 1)
        return;
      e.preventDefault();
      window.scrollTo(0,0);
      self.clearSearch();
    });
    this.loadMessages();
    window.addEventListener("beforeunload", function(event) {
      self.saveMessages(true);
    });
    window.addEventListener('scroll', function(e) {
      if(self.current_display != 'search' || !self.search_results.length || self.searching)
        return;
      
      if(window.scrollY + window.innerHeight > self.footer.offsetTop) {
        self.loadMore();
      }
    });
    document.getElementById('search-form').addEventListener('submit', function(e) {
      e.preventDefault();
      self.search();
    });
    setInterval(function() {
      self.timestamps();
    },1000);
    document.getElementById('current-wrapper').addEventListener('click',function(e){
      if(e.target && e.target.className == 'name') {
        self.search('user:'+e.target.textContent);
      }
   });
    this.setPollInterval(3000);
    this.setWebsocketInterval(20000);
    this.pollWebsocket();
    this.poll();
    this.redrawTraderQuotes();
    if(this.getSearchTerm().length)
      this.search();
  },
  pollWebsocket:function() {
    if(!window.WebSocket)
      return;
    var self=this;
    setTimeout(function() {
      self.pollWebsocket();
    },this.ws_interval);
    if (this.ws) {
      switch(this.ws.readyState) {
        case WebSocket.OPEN:
        case WebSocket.CONNECTING:
        case WebSocket.CLOSING:
          return;
      }
    }
    var self=this;
    try {
      this.ws = new WebSocket(this.websocket_url);
      this.ws.onopen = function(evt) {
        self.log("Websocket opened");
        self.setPollInterval(30000);
        self.poll(true);
      }
      this.ws.onerror = function(evt) {
        self.error("Websocket error",evt);
        self.setPollInterval(3000);
        self.setWebsocketInterval(self.ws_interval + 3000);
      }
      this.ws.onmessage = function(evt) {
        self.setPollInterval(30000);
        try {
          var data = JSON.parse(evt.data);
          if(data && data.t && data.m && data.s)
            self.parseMessages([data], true);
          else if(data && data.r)
            self.removeMessages([data.r]);
          else if(data && data.buy) {
            window.current_trader_quotes = data;
            self.redrawTraderQuotes();
          }
        }
        catch(e) {
          self.error(e);        
        }
      };
    } catch(e) {
      self.error("Websocket error exception",e);
      self.setPollInterval(3000);
      self.setWebsocketInterval(self.ws_interval + 3000);
    }
  },
  last_drawn_hash:'',
  clearMessages:function() {
    this.current_wrapper.innerHTML = '';
  },
  redrawMessages:function() {
    var html = '';
    var to_add = [];
    
    if(this.last_display != this.current_display)
      this.clearMessages();
    if(this.current_display != 'search') {
      document.getElementById('search-info').innerHTML = '';
    }
    var messages = this.current_display == 'search' ? this.search_results : this.messages;
    
    for(var i = 0;i < messages.length ;i++) {
      if(document.getElementById(messages[i].t))
        continue;
      to_add.push(i);
    }
    if(to_add.length) {
      for(var i = to_add.length - 1;i >= 0 ;i--) {
        html = '<tr class="row unanimated" id="'+messages[to_add[i]].t+'">\
          <td class="info"><div class="name">'+messages[to_add[i]].s+'</div><div data-timestamp="'+messages[to_add[i]].t+'" class="age"></div></td>\
          <td class="message">'+messages[to_add[i]].m+'</td>\
          <td class="delete"></td>\
        </tr>' + html;
      }
      
      if(to_add[0] == 0) {
        this.current_wrapper.insertBefore(HTML2DocumentFragment(html),this.current_wrapper.firstChild);
      } else {
        this.current_wrapper.appendChild(HTML2DocumentFragment(html));
      }
      this.timestamps();
      this.animations();
      this.checkAndNotify(to_add);
    }
    this.last_display = this.current_display;
    this.page_wrapper.className = 'display-'+this.current_display;
    this.table_wrapper.className = 'display-'+this.current_display;
  },
  redrawTraderQuotes:function() {
    var quotes = window.current_trader_quotes;
    var html = '';
    for(var model_id in GuildWars.materials) {
      var mat = GuildWars.materials[model_id];
      for(var quote_model_id in quotes.buy) {
        if(quote_model_id != model_id) continue;
        var q = quotes.buy[quote_model_id];
        var title = mat.name+" = "+q.p+"g\n"+(100000 / q.p).toFixed(2)+" = 100k";
        html += "<div class='trader-price' style='background-image:url(data:image/png;base64,"+mat.icon+");' title='"+title+"'>"+(q.p > 1000 ? (q.p/1000).toFixed(1)+"k" : q.p+"g")+"</div>";
      }
    }
    document.getElementById('trader-prices').innerHTML = html;
  },
  timestamps:function() {
    var rows = document.querySelectorAll('.age');
    try {
      for(var i=0;i<rows.length;i++) {
        var ts = (new Date(parseInt(rows[i].getAttribute('data-timestamp')))).relativeTime();
        if(rows[i].innerHTML != ts)
          rows[i].innerHTML = ts;
      }
    } catch(e) {}
  },
  checkAndNotify:function(new_messages) {
    // Cycles through these messages, if a match for notification is found, do it
    if(!window.Notification || window.Notification.permission == 'denied' || window.location.protocol != 'https:')
      return;
    var self = this;
    
    var notification;
    for(var i=0;i<new_messages.length && !notification;i++) {
      for(var j in this.message_alert_checks) {
        var match = true;
        for(var k in this.message_alert_checks[j]) {
          if(notification || !match) break;
          if(new_messages[i].indexOf(this.message_alert_checks[j]) < 0)
            match = false;
        }
        if(notification) break;
        if(!match) continue;
        notification = {
          title:"New trade message",
          body:new_messages[i].s+': '+new_messages[i].m
        };
        if(getFavicon())
          n.icon = getFavicon();
      }
    }
    if(!notification)
      return; // Nothing to notify
    if (Notification.permission != "granted") {
      return Notification.requestPermission().then(function (permission) {
        new Notification(notification.title,{body:notification.body,icon:notification.icon});
      });
    }
  },
  addMessageNotification:function(str) {
    this.message_alert_checks[str] = str.split(' ');
  },
  animations:function() {
    var rows = document.querySelectorAll('.unanimated');
    for(var i=0;i<rows.length;i++) {
      rows[i].classList.add('animate-fade-in');
      rows[i].classList.remove('unanimated');
    }
    setTimeout(function() {
      var rows = document.querySelectorAll('.animate-fade-in');
      for(var i=0;i<rows.length;i++) {
        rows[i].classList.remove('animate-fade-in');
      }
    },500);
  },
  removeMessages:function(timestamps) {
    var timestamp;
    for(var j=0;j<timestamps.length;j++) {
      timestamp = timestamps[j];
      for(var i=0;i<this.messages.length;i++) {
        if(this.messages[i].t == timestamp) {
          this.messages.splice(i,1);
          break;
        }
      }
      for(var i=0;i<this.search_results.length;i++) {
        if(this.search_results[i].t == timestamp) {
          this.search_results.splice(i,1);
          break;
        }
      }
      var element = document.getElementById(timestamp);
      if(element)
        element.parentNode.removeChild(element);
    }
  },
  parseMessages:function(json, check_against_search) {
    this.messages = this.messages || [];
    var has_new = false;
    var remove_messages = [];
    for(var i=json.length-1; i >= 0;i--) {
      if(json[i].r) {
        remove_messages.push(json[i].r);
        delete json[i].r;
      }
      json[i].m = json[i].m.encodeHTML();
      has_new = this.messages.unshift(json[i]);
    }
    this.removeMessages(remove_messages);
    while(this.messages.length > this.max_messages) {
      this.messages.pop();
    }
    // Add to existing search results.
    if(check_against_search && !this.searching && this.last_search_term.length) {
      var term = this.last_search_term;
      var search_words = [];
      var checkSender = function(msg) {
        return msg.s.toLowerCase() == term;
      };
      var checkMessage = function(msg) {
        var toLower = msg.m.toLowerCase();
        for(var i=0;i<search_words.length;i++) {
          if(toLower.indexOf(search_words[i]) == -1)
            return false;
        }
        return true;
      };
      var func;
      if(term.indexOf('user:') == 0) {
        term = term.substring(5).toLowerCase();
        func = checkUser;
      } else {
        search_words = term.split(' ');
        func = checkMessage;
      }
      var hits = [];
      for(var i=json.length-1; i >= 0;i--) {
        if(func(json[i]))
          hits.unshift(json[i]);
      }
      if(hits.length)
        this.parseSearchResults(hits);
    }
    if(has_new) {
      this.redrawMessages();
      this.saveMessages(); 
    }
  },
  loadMessages:function() {
    if(!window.localStorage) 
      return;
    
    this.messages = [];
    try {
      if(window.localStorage.getItem('deployment_date') != window.deployment_date)
        return; // - Deployment change since this was saved
      this.messages = JSON.parse(window.localStorage.getItem('messages'))
    } catch(e) {    };
    if(!this.messages || !this.messages.length)
      return;
    this.redrawMessages();
  },
  saveMessages:function(force) {
    if(!window.localStorage) return;
    if(this.pendingSave && !force) return;
    var self=this;
    var doSave = function() {
      window.localStorage.setItem('deployment_date',window.deployment_date);
      window.localStorage.setItem('messages',JSON.stringify(self.messages));
      self.pendingSave = null;
    };
    if(force)
      doSave();
    this.pendingSave = setTimeout(doSave,5000);
  },
  parseSearchResults:function(json) {
    if(json.length) {
      var push_or_unshift = this.search_results.length && this.search_results[0].t > json[0].t ? 'push' : 'unshift';
      if(push_or_unshift == 'unshift') {
        for(var i=json.length - 1; i >= 0;i--) {
          json[i].m = json[i].m.encodeHTML();
          this.search_results.unshift(json[i]);
        }
      } else {
        for(var i=0; i < json.length;i++) {
          json[i].m = json[i].m.encodeHTML();
          this.search_results.push(json[i]);
        }
      }
    }
    if(this.search_results.length && this.search_results.length < 25) {
      // No more messages to get; manually set last search offset to avoid polling again
      this.last_searched_offset = this.search_results[this.search_results.length - 1].t;
    }
    this.redrawMessages();
    if(this.current_display == 'search')
      document.getElementById('search-info').innerHTML = "Showing "+this.search_results.length+" results for <i>"+this.last_search_term+"</i>";
  },
  poll:function(force) {
    var self = this;
    if(!force && self.ws && self.ws.readyState != WebSocket.CLOSED)
        return;
    this.log("polling");
    function requeue() {
      if(self.poller) {
        clearTimeout(self.poller);
        self.poller = null;
      }
      self.poller = setTimeout(function() {
        self.poll();
      },self.poll_interval);
      self.log("Poll queued");
    }
    var req = new XMLHttpRequest();
    req.addEventListener("load", function() {
      if(!this.response.length)
        return requeue();
      var result;
      try {
        result = JSON.parse(this.response);
      } catch(e) {
        self.error(e);
        return requeue();
      }
      if (!self.ws || self.ws.readyState != WebSocket.OPEN)
        self.setPollInterval(3000);
      self.parseMessages(result);
      requeue();
    });
    req.addEventListener("error",function() {
      self.setPollInterval(self.poll_interval + 3000);
      requeue();
    });
    req.open("GET", "/m");
    req.setRequestHeader('If-None-Match',(this.getLastMessage() || {'t':0}).t);
    req.send();
  }
};
var favicon;
function getFavicon(){
  if(favicon)
    return favicon;
  var nodeList = document.getElementsByTagName("link");
  for (var i = 0; !favicon && i < nodeList.length; i++) {
    if((nodeList[i].getAttribute("rel") == "icon")||(nodeList[i].getAttribute("rel") == "shortcut icon"))
      favicon = nodeList[i].getAttribute("href");
  }
  return favicon;        
}
function HTML2DocumentFragment(markup) {
  if (markup.toLowerCase().trim().indexOf('<!doctype') === 0) {
      let doc = document.implementation.createHTMLDocument("");
      doc.documentElement.innerHTML = markup;
      return doc;
  } else if ('content' in document.createElement('template')) {
      // Template tag exists!
      let el = document.createElement('template');
      el.innerHTML = markup;
      return el.content;
  } else {
      // Template tag doesn't exist!
      var docfrag = document.createDocumentFragment();
      let el = document.createElement('body');
      el.innerHTML = markup;
      for (let i = 0; 0 < el.childNodes.length;) {
          docfrag.appendChild(el.childNodes[i]);
      }
      return docfrag;
  }
}

KamadanClient.init();