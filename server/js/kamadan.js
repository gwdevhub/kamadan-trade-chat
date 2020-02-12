var KamadanClient = {
  search_results:[],
  search:function() {
    var term = (this.search_input.value+'').trim();
    if(!term.length)
      return this.redrawMessages();
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
    req.open("GET", "/s?term="+encodeURIComponent(term));
    req.send();
  },
  getLastMessage:function() {
    return this.messages ? this.messages[0] : null;
  },
  init:function() {
    this.poll();
    this.search_input = document.getElementById('search-input');
    var self = this;
    document.getElementById('search-form').addEventListener('submit', function(e) {
      e.preventDefault();
      self.search();
    });
    document.getElementById('search-input').addEventListener('keyup',function(e) {
      if(self.search_timer)
        clearTimeout(self.search_timer);
      self.search_timer = setTimeout(function() {
        self.search();
      },250);
    });
    
    setInterval(function() {
      self.timestamps();
    },1000);
    setInterval(function() {
      self.poll();
    },30000);
    this.ws = this.ws || new WebSocket("ws://localhost:9090");
    this.ws.onmessage = function(evt) {
      try {
        var data = JSON.parse(evt.data);
        if(data && data.h)
          self.parseMessages([data]);
      }
      catch(e) {}
    };
  },
  last_drawn_hash:'',
  redrawMessages:function(is_search = false) {
    var html = document.getElementById('current-wrapper').innerHTML;
    var to_add = [];
    var messages = this.messages;
    var clear = false;
    if(this.search_input.value.length) {
      if(!is_search) return;
      messages = this.search_results;
      clear = true;
      html = '';
    }
    for(var i = 0;i < messages.length ;i++) {
      if(!clear && document.getElementById('t-'+messages[i].h))
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
  },
  poll:function() {
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
      self.parseMessages(result);
    });
    req.open("GET", "/m");
    req.setRequestHeader('if-none-match',(this.getLastMessage() || {'h':'none'}).h);
    req.send();
  }
};

KamadanClient.init();