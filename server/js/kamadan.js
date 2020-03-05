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
    this.last_searched_offset = offset
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
    document.getElementById('home-link').addEventListener('click',function(e) {
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
          this.search_results.unshift(json[i]);
        }
      } else {
        for(var i=0; i < json.length;i++) {
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