var KamadanClient = {
  poll_interval:3000,
  ws_interval:20000,
  debug:/local/.test(window.location.hostname),
  log:function() {
    if(!this.debug) return;
    console.log.apply(console,arguments);
  },
  error:function() {
    if(!this.debug) return;
    console.error.apply(console,arguments);
  },
  max_messages:100,
  search_results:[],
  messages:[],
  search:function(term) {
    if(term)
      this.search_input.value = term;
    var term = (this.search_input.value+'').trim();
    var endpoint = '/s/';
    if(term.indexOf('user:') == 0) {
      term = term.substring(5);
      endpoint = '/u/';
    }
    if(!term.length)
      return;
    var self = this;
    var req = new XMLHttpRequest();
    req.addEventListener("load", function() {
      if(!this.response.length) return;
      var result;
      try {
        result = JSON.parse(this.response);
      } catch(e) {
        self.error(e);
        return;
      }
      self.parseSearchResults(result);
    });
    req.open("GET", endpoint+encodeURIComponent(term));
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
    this.current_wrapper = document.getElementById('current-wrapper');
    this.search_input = document.getElementById('search-input');
    this.websocket_url = "ws://"+window.location.hostname+":9090";
    if(window.location.protocol == 'https:') {
      this.websocket_url = "wss://"+window.location.hostname+":8443";
    }
    var self = this;
    document.getElementById('home-link').addEventListener('click',function(e) {
      e.preventDefault();
      self.search_input.value = '';
      self.redrawMessages(true);
    });
    this.loadMessages();
    window.addEventListener("beforeunload", function(event) {
      self.saveMessages(true);
    });
    document.getElementById('search-form').addEventListener('submit', function(e) {
      e.preventDefault();
      self.search();
    });
    var onchange = function(e) {
      if(self.search_timer)
        clearTimeout(self.search_timer);
      if(!(self.search_input.value+'').trim().length)
        return self.redrawMessages(true);
      self.search_timer = setTimeout(function() {
        self.search();
      },250);
    };
    this.search_input.addEventListener('keyup',onchange);
    this.search_input.addEventListener('change',onchange);
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
          this.ws.send('');
        case WebSocket.CONNECTING:
        case WebSocket.CLOSING:
          return;
      }
    }
    var self=this;
    this.ws = new WebSocket(this.websocket_url);
    this.ws.onopen = function(evt) {
      self.log("Websocket opened");
      self.setPollInterval(30000);
    }
    this.ws.onerror = function(evt) {
      self.error("Websocket error",evt);
      self.setPollInterval(3000);
    }
    this.ws.onmessage = function(evt) {
      self.setPollInterval(30000);
      try {
        var data = JSON.parse(evt.data);
        if(data && data.h)
          self.parseMessages([data]);
      }
      catch(e) {
        self.error(e);        
      }
    };
  },
  last_drawn_hash:'',
  redrawMessages:function(flush = false) {
    var html = '';
    if(flush) {
      document.getElementById('search-info').innerHTML = '';
    }
    var to_add = [];
    var messages = this.messages;
    if((this.search_input.value+'').trim().length) {
      if(!flush) return;
      messages = this.search_results;
      clear = true;
      html = '';
    }
    for(var i = 0;i < messages.length ;i++) {
      if(!flush && document.getElementById('t-'+messages[i].h))
        break;
      to_add.push(i);
    }
    for(var i = to_add.length - 1;i >= 0 ;i--) {
      html = '<tr class="row unanimated" id="t-'+messages[i].h+'">\
        <td class="info"><div class="name">'+messages[i].s+'</div><div data-timestamp="'+messages[i].t.getTime()+'" class="age"></div></td>\
        <td class="message">'+messages[i].m+'</td>\
      </tr>' + html;
    }
    // Use document fragment to prepend if available.
    if(flush) {
      window.scrollTo(0,0);
      this.current_wrapper.innerHTML = html;
    } else {
      this.current_wrapper.insertBefore(HTML2DocumentFragment(html),this.current_wrapper.firstChild);
      this.checkAndNotify(to_add);
    }
    this.timestamps();
    this.animations();
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
    if (Notification.permission != "granted") {
      return Notification.requestPermission().then(function (permission) {
        checkAndNotify(new_messages);
      });
    }
    var alert_checks = /wts/i;
    var notification;
    for(var i=0;i<new_messages.length && !notification;i++) {
      if(!alert_checks.test(new_messages[i].m))
        continue;
      var n = {
        body:new_messages[i].s+': '+new_messages[i].m
      };
      if(getFavicon())
        n.icon = getFavicon();
      notification = new Notification("New trade message",n);
    }
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
  parseMessages:function(json) {
    var latest_message = (this.getLastMessage() || {'h':''});
    this.messages = this.messages || [];
    var has_new = false;
    for(var i=json.length-1; i >= 0;i--) {
      //if(json[i].h == latest_message.h)
      //  continue;
      json[i].t = new Date(json[i].t * 1000);
      has_new = this.messages.unshift(json[i]);
    }
    while(this.messages.length > this.max_messages) {
      this.messages.pop();
    }
    if(has_new) {
      this.redrawMessages();
      this.saveMessages(); 
    }
  },
  loadMessages:function() {
    if(!window.localStorage) return;
    this.messages = [];
    try {
      this.messages = JSON.parse(window.localStorage.getItem('messages'))
    } catch(e) {    };
    if(!this.messages || !this.messages.length)
      return;
    for(var i in this.messages) {
      this.messages[i].t = new Date(this.messages[i].t);
    }
    this.redrawMessages();
  },
  saveMessages:function(force = false) {
    if(!window.localStorage) return;
    if(this.pendingSave && !force) return;
    var self=this;
    var doSave = function() {
      window.localStorage.setItem('messages',JSON.stringify(self.messages));
      self.pendingSave = null;
    };
    if(force)
      doSave();
    this.pendingSave = setTimeout(doSave,5000);
  },
  parseSearchResults:function(json) {
    var latest_message = (this.getLastMessage() || {'h':''});
    this.search_results = [];
    var has_new = false;
    for(var i=json.length-1; i >= 0;i--) {
      json[i].t = new Date(json[i].t * 1000);
      has_new = this.search_results.unshift(json[i]);
    }
    
    this.redrawMessages(true);
    document.getElementById('search-info').innerHTML = this.search_results.length+" results found for <i>"+(this.search_input.value+'').trim()+"</i>";
  },
  poll:function() {
    var self = this;
    this.log("polling");
    function requeue() {
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
    req.setRequestHeader('If-None-Match',(this.getLastMessage() || {'h':'none'}).h);
    req.send();
  }
};
var favicon;
function getFavicon(){
  if(favicon)
    return favicon;
  var nodeList = document.getElementsByTagName("link");
  for (var i = 0; i < nodeList.length; i++)
  {
      if((nodeList[i].getAttribute("rel") == "icon")||(nodeList[i].getAttribute("rel") == "shortcut icon"))
      {
          favicon = nodeList[i].getAttribute("href");
      }
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