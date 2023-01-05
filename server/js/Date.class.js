Date.days_of_the_week = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
Date.months_of_the_year = ["January","February","March","April","May","June","July","August","September","October","November","December"];
Date.second = 1e3;
Date.minute = 6e4;
Date.hour = 36e5;
Date.day = 864e5;
Date.month = Date.day * 30;
Date.isValidDate = function(d) {
	return (typeof d['getTime'] == 'function' && !isNaN(d.getTime()));
}
Date.prototype.clone = function() {
  return new Date(this.getTime());
}
Date.prototype.fromISOString = function(str) {
	var matches = str.match(/^([0-9]{4})[:-]([0-9]{2})[:-]([0-9]{2})[_ ]([0-9]{2})[:-]([0-9]{2})[:-]([0-9]{2})$/);
	if(!matches) throw "Failed to find ISO date string in "+str;
	return new Date(parseInt(matches[1],10),parseInt(matches[2]-1,10),parseInt(matches[3],10),parseInt(matches[4],10),parseInt(matches[5],10),parseInt(matches[6],10));
}
Date.prototype.daySuffix = function() {
	var i = parseInt(this.getDate(),10);
	var j = i % 10,	k = i % 100;
	if (j == 1 && k != 11)		return "st";
	if (j == 2 && k != 12)		return "nd";
	if (j == 3 && k != 13)		return "rd";
	return "th";
}
Date.prototype.toDate = Date.prototype.toDate || function() {
	return new Date(this);
}
Date.prototype.pad = function(str) {
	var i = parseInt(str,10);
	if(isNaN(i) || i > 9)
		return str;
	return '0'+i;
}
Date.prototype.isoDate = function() {
	return this.format('Y-m-d');
}
Date.prototype.format = function(str) {
	if((typeof str !== 'string') || !str.trim().length)
		str = 'YYYY-MM-dd HH:mm:ss';
	if(!Date.isValidDate(this))
		return '-';
	return str.replace(/ss/g,this.pad(this.getSeconds()))
		.replace(/s/g,this.pad(this.getSeconds()))
		.replace(/mm|ii/g,this.pad(this.getMinutes()))
		.replace(/i/g,this.pad(this.getMinutes()))
		.replace(/dddd/g,'{111}')
		.replace(/dd|D/g,this.pad(this.getDate()))
		.replace(/d/g,this.pad(this.getDate()))
		.replace(/S/g,this.getDate())
		.replace(/MMM/g,'{222}')
		.replace(/MM|m/g,this.pad(this.getMonth()+1))
		.replace(/YYYY/g,this.getFullYear())
		.replace(/YY/g,(this.getFullYear()+'').substring(0,2))
		.replace(/Y/g,this.getFullYear())
		.replace(/hh/gi,this.pad(this.getHours()))
		.replace(/H/gi,this.pad(this.getHours()))
		.replace(/o/g,this.daySuffix())
		.replace(/\{111\}/,Date.days_of_the_week[this.getDay()])
		.replace(/\{222\}/,Date.months_of_the_year[this.getMonth()].substring(0,3))
}
Date.prototype.modify = function(amount,unit) {
	if(typeof amount == 'string' && /\s/.test(amount = amount.trim())) {
		amount = amount.split(' ');
		unit = amount[1]+'';
		amount = amount[0]+'';
	}
	amount = parseInt(amount || 0,10);
	if(isNaN(amount) || !amount)
		return new Date(this); 
	var m;
	switch(unit.replace(/s$/i,'').toLowerCase()) {
		case 'second':	m = 1000;				break;
		case 'minute':	m = 1000*60;			break;
		case 'hour':	m = 1000*60*60;			break;
		case 'day':		m = 1000*60*60*24;		break;
		case 'week':	m = 1000*60*60*24*7;	break;
		case 'month':	m = 1000*60*60*24*30;	break;
		case 'year':	m = 1000*60*60*24*365;	break;
	}
	if(!m)	return this;
	this.setTime(this.getTime() + (m*amount));
	return this;
}
Date.prototype.toStartOfDay = function() {
  return this.toStartOf('day');
}
Date.prototype.toEndOfDay = function() {
	this.setHours(23);
	this.setMinutes(59);
	this.setSeconds(59);
	return this;
}
Date.prototype.toStartOfWeek = function() {
	return this.toStartOf('day').toPreceedingDOW(1,true);
}
Date.prototype.getStartOf = function(unit) {
  return this.clone().toStartOf(unit);
}
Date.prototype.toStartOf = function(unit) {
  switch (unit) {
    case "year": this.setMonth(0);
    case "month": this.setDate(1);
    case "day": this.setHours(0);
    case "hour": this.setMinutes(0);
    case "minute": this.setSeconds(0);
    case "second": this.setMilliseconds(0);
  }
  return this;
}
Date.prototype.toStartOfMonth = function() {
  return this.toStartOf('month');
}
Date.prototype.setDayOfWeek = Date.prototype.setDay = function(day_of_week) {
	if(typeof day_of_week == 'undefined')
		day_of_week = 'no_value_given';
	if(isNaN(day_of_week = parseInt(day_of_week,10)) || day_of_week > 6 || day_of_week < 0)
		throw "Invalid day_of_week argument "+day_of_week+" in Date.setDay";	// Fail - invalid day_of_week.
	if(this.getDay() < day_of_week)
		return this.toFollowingDOW(day_of_week);	// If today is Thursday and we want Friday of this week, move FORWARD
	return this.toPreceedingDOW(day_of_week,true);		// Else, move BACK, including today!
}
Date.prototype.toPreceedingDOW = Date.prototype.toPreviousDOW = function(day_of_week,include_today) {
	// 0 == Monday
	if(typeof day_of_week == 'undefined')
		return this.modify('-1 day');	// No argument(s) - just return yesterday.
	if(isNaN(day_of_week = parseInt(day_of_week,10)) || day_of_week > 6 || day_of_week < 0)
		throw "Invalid day_of_week argument "+day_of_week+" in Date.toPreceedingDOW";	// Fail - invalid day_of_week.
	var d = this.getDay();
	var inc = 0;
	while(d != day_of_week || (inc == 0 && !include_today)) {
		d = (d == 0 ? 6 : d-1);
		inc--;
	}
	return this.modify(inc,'day');
}
Date.prototype.toFollowingDOW = Date.prototype.toNextDOW = function(day_of_week,include_today) {
	// 1 == Monday
	if(typeof day_of_week == 'undefined')
		return this.modify('+1 day');	// No argument(s) - just return tomorrow.
	if(isNaN(day_of_week = parseInt(day_of_week,10)) || day_of_week > 6 || day_of_week < 0)
		throw "Invalid day_of_week argument "+day_of_week+" in Date.toFollowingDOW";	// Fail - invalid day_of_week.
	var d = this.getDay();
	var inc = 0;
	while(d != day_of_week || (inc == 0 && !include_today)) {
		d = (d == 0 ? 6 : d+1);
		inc++;
	}
	return this.modify(inc,'day');	
}
Date.prototype.getWeekOfMonth = function(exact) {
	var month = this.getMonth()
		, year = this.getFullYear()
		, firstWeekday = new Date(year, month, 1).getDay()
		, lastDateOfMonth = new Date(year, month + 1, 0).getDate()
		, offsetDate = this.getDate() + firstWeekday - 1
		, index = 1 // start index at 0 or 1, your choice
		, weeksInMonth = index + Math.ceil((lastDateOfMonth + firstWeekday - 7) / 7)
		, week = index + Math.floor(offsetDate / 7)
	;
	if (exact || week < 2 + index) return week;
	return week === weeksInMonth ? index + 5 : week;
};
Date.prototype.niceDate = function() {
	return this.format('So MMM YYYY');
}
Date.prototype.isToday = function() {
	return this.format('Ymd') == (new Date()).format('Ymd');
}
Date.prototype.niceDateTime = function() {
	var local = this.toLocalDate();
	return local.format('So MMM YYYY HH:mm');
}
Date.prototype.toLocalDate = function() {
	var user_offset = (new Date()).getTimezoneOffset();
	var this_offset = this.getTimezoneOffset();
	if(user_offset == this_offset)
		return this;
	return this;  
}
// e.g. 3 hours ago
Date.prototype.diff = function(date_to_compare) {
  var date = date_to_compare || new Date();
  const second = 1e3;
  const minute = 6e4;
  const hour = 36e5;
  const day = 864e5;
  const month = day * 30;
  var self = this;
  var diff = {
    ms: date.getTime() - self.getTime(),
    years: function() {
      return Math.abs(date.getFullYear() - self.getFullYear());
    },
    months:function() {
      return Math.abs(this.years() * 12 + date.getMonth() - self.getMonth());
    },
    days:function() {
      return Math.abs(this.round((date.getStartOf("day") - self.getStartOf("day")) / day));
    },
    hours:function() {
      return Math.abs(this.round((date.getStartOf("hour") - self.getStartOf("hour")) / hour));
    },
    minutes:function() {
      return Math.abs(this.round((date.getStartOf("minute") - self.getStartOf("minute")) / minute));
    },
    seconds:function() {
      return Math.abs(this.round((date.getStartOf("second") - self.getStartOf("second")) / second));
    },
    bestFitUnit:function() {
      var ms_diff = Math.abs(this.ms);
      if(ms_diff < second)
        return "ms";
      else if(ms_diff < minute)
        return "second";
      else if(ms_diff < hour)
        return "minute";
      else if(ms_diff < day)
        return "hour";
      else if(ms_diff < month)
        return "day";
      else if(ms_diff < (month * 12))
        return "month";
      else
        return "year";
    }
  };
  diff.round = Math[diff.ms > 0 ? "floor" : "ceil"];
  return diff;
}
Date.prototype.relativeTime = function(unit, date_to_compare) {
  var diff = this.diff(date_to_compare);
  
  if(!unit || !diff[unit])
    unit = diff.bestFitUnit();
  if(unit == 'ms')
    return "Just now";
  var val = diff[unit+'s']();
  return val+" "+unit+(val > 1 ? "s" : "")+" ago";
}