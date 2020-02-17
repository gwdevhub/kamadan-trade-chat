var KamadanClient = {
  poll_interval:3000,
  ws_interval:20000,
  search_results:[],
  messages:[],
  search:function() {
    var term = (this.search_input.value+'').trim();
    if(!term.length)
      return;
    var self = this;
    var req = new XMLHttpRequest();
    req.addEventListener("load", function() {
      if(!this.response.length) return;
      try {
        result = JSON.parse(this.response);
      } catch(e) {
        console.error(e);
        return;
      }
      self.parseSearchResults(result);
    });
    req.open("GET", "/s/"+encodeURIComponent(term));
    req.send();
  },
  setPollInterval:function(ms) {
    this.poll_interval = Math.max(120000,ms);
    console.log("Poll interval set to "+ms+"ms");
  },
  setWebsocketInterval:function(ms) {
    this.ws_interval = Math.max(120000,ms);
    console.log("Websocket interval set to "+ms+"ms");
  },
  getLastMessage:function() {
    return this.messages ? this.messages[0] : null;
  },
  init:function() {
    this.search_input = document.getElementById('search-input');
    var self = this;
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
    this.ws = new WebSocket("ws://"+window.location.hostname+":9090");
    this.ws.onopen = function(evt) {
      console.log("Websocket opened");
      self.setPollInterval(30000);
    }
    this.ws.onerror = function(evt) {
      console.error("Websocket error",evt);
      self.setPollInterval(3000);
    }
    this.ws.onmessage = function(evt) {
      self.setPollInterval(30000);
      try {
        var data = JSON.parse(evt.data);
        if(data && data.h)
          self.parseMessages([data]);
      }
      catch(e) {}
    };
  },
  last_drawn_hash:'',
  redrawMessages:function(flush = false) {
    var html = document.getElementById('current-wrapper').innerHTML;
    if(flush) {
      html = '';
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
    document.getElementById('current-wrapper').innerHTML = html;
    this.timestamps();
    this.animations();
  },
  timestamps:function() {
    var rows = document.querySelectorAll('.age');
    for(var i=0;i<rows.length;i++) {
      rows[i].innerHTML = (new Date(parseInt(rows[i].getAttribute('data-timestamp')))).relativeTime();
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
    if(has_new)
      this.redrawMessages();
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
    console.log("polling");
    function requeue() {
      self.poller = setTimeout(function() {
        self.poll();
      },self.poll_interval);
      console.log("Poll queued");
    }
    var req = new XMLHttpRequest();
    req.addEventListener("load", function() {
      if(!this.response.length)
        return requeue();
      var result;
      try {
        result = JSON.parse(this.response);
      } catch(e) {
        console.error(e);
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

KamadanClient.init();