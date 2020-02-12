if(typeof String.pad !== 'function') {
	String.prototype.pad = function(min_length,pad_char) {
		var str = this;
		if(!pad_char)
			pad_char='0';
		if(!min_length)
			min_length=2;
		//console.log(this);
		while(str.length < min_length)
			str = pad_char+str;
		return str;
	}
}
String.prototype.slug = function() {
	return this.removePunctuation().toLowerCase().replace(' ','_');
}
if(typeof String.toTitleCase !== 'function') {
	String.prototype.toTitleCase = function()
	{
		return this.replace(/\w*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	}
}
String.prototype.escapeSingleQuotes = function() {
	return this.replace(/(['])/g, '\\$1');
}
String.prototype.escapeDoubleQuotes = String.prototype.escapeQuotes = function() {
	return this.replace(/(["])/g, '\\$1');
}
String.prototype.getKeywords = String.prototype.keywords = function() {
	return this.removePunctuation().replace(/(\b(\w{1,4})\b(\s|$))/g,'').split(' ');
};
String.prototype.html_removeImages = function() {
	return this.replace(/<img\b[^>]*>/gim, "");
}
String.prototype.html_removeStyles = function() {
	return this.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gim, "")
		.replace(/<link\b[^>]*>/gi, "");
}
String.prototype.html_removeScripts = function() {
	return this.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gim, "");
		
}
String.prototype.html_sanitize = function() {
	return this.html_removeImages()
			.html_removeStyles()
			.html_removeScripts();
}
if(typeof String.quoteAttr !== 'function') {
	String.prototype.quoteAttr = function(preserveCR) {
		preserveCR = preserveCR ? '&#13;' : '\n';
		return ('' + this) /* Forces the conversion to string. */
			.replace(/&/g, '&amp;') /* This MUST be the 1st replacement. */
			.replace(/'/g, '&apos;') /* The 4 other predefined entities, required. */
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			/*
			You may add other replacements here for HTML only 
			(but it's not necessary).
			Or for XML, only if the named entities are defined in its DTD.
			*/ 
			.replace(/\r\n/g, preserveCR) /* Must be before the next replacement. */
			.replace(/[\r\n]/g, preserveCR);
			;
	}
}
String.prototype.toFixed = String.prototype.toFixed || function(d) {
	return parseFloat(this).toFixed(d);
}
if(typeof String.replaceAll !== 'function') {
	String.prototype.replaceAll = function(search, replacement) {
		var target = this;
		return target.split(search).join(replacement);
	}
}
if(typeof String.ucFirst !== 'function') {
	String.prototype.ucFirst = function() {
		return this.charAt(0).toUpperCase() + this.slice(1);
	}
}
String.random = String.prototype.random = function(len) {
	var len = len || 10;
	var text = '';
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for( var i=0; i < len; i++ )
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}
String.prototype.escapeRegExp = String.prototype.escapeRegexp = function() {
	return this.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&")
}
String.prototype.includesRegExp = String.prototype.containsRegExp = function(str) {
	if(!(str instanceof RegExp))
		str = new RegExp((str+''),'mi');
	return str.test(this);
}
String.prototype.includes = String.prototype.includes || function(str) {
	if(!(str instanceof RegExp))
		str = new RegExp((str+'').escapeRegExp(),'m');
	return str.test(this);
}
String.prototype.startsWith = String.prototype.startsWith || function(str) {
	return (new RegExp(str.escapeRegExp()+'$','i')).test(this);
}
String.prototype.endsWith = String.prototype.endsWith || function(str) {
	return (new RegExp('^'+str.escapeRegExp(),'i')).test(this);
}
String.prototype.equalsIgnoreCase = function(str) {
	return (new RegExp('^'+((str||'')+'').escapeRegExp()+'$','i')).test(this);
}
String.prototype.equals = function(str) {
	return str == this;
}
String.prototype.contains =  String.prototype.includes;
String.prototype.removeSpaces = function() {
	return this.replace(/[\s]/g,'');
}
String.prototype.removePunctuation = function() {
	return this.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,.\/:;<=>?@\[\]^`{|}~]/g,'').replace(/\s+/g,' ');
}

if(!String.prototype.isLongerThan) {
	String.prototype.isLongerThan = function(len) {
		return this.length > parseInt(len);
	}
}
String.prototype.fromSlug = String.prototype.unslug = function() {
	return this.replace(/_/g,' ').toTitleCase();
}
RegExp.prototype.toJSON = RegExp.prototype.toString;
// Helper functions
String.prototype.fromHTML = String.prototype.unHTML = function() {
	return this.stripHTML().decodeHTML().trim();
}
if(!String.prototype.stripHTML) {
	String.prototype.stripHTML = function() {
		return this.replace(/(<([^>]+)>)/igm,'');
	}
}
if(!String.prototype.firstWord) {
	String.prototype.firstWord = function() {
		return this.split(' ').shift();
	}
}
String.prototype.truncateWords = function(len,dont_ellipse) {
	len = len || 100;
	len = parseInt(len);
	if(this.length < len)			
		return this;
	len += 1;
	var sub = dont_ellipse ? this.substring(0,len) : this.substring(0,len-3);
	sub = sub.replace(/[,. ]+[^,. ]*$/,'');
	if(!dont_ellipse)
		sub += '...';
	return sub;
}
String.prototype.truncate = function(len,dont_ellipse) {
	len = len || 100;
	len = parseInt(len);
	if(this.length < len)			return this;
	if(dont_ellipse)				return this.substring(0,len);
	return this.substring(0,len-3)+'...';
}
if(!String.prototype.isValidEmail) {
	String.prototype.isValidEmail = function() {
		var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(this.trim());
	}
}
if(!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\s*/g,'').replace(/\s*$/g,'');
	}
}
if(!String.prototype.isEmpty) {
	String.prototype.isEmpty = function() {
		return this.trim().length > 0;
	}
}
String.prototype.toDate = String.prototype.toDate || function() {
	return new Date(this);
}
//-----------------------------------------
//	String encoding/decoding
//-----------------------------------------
String.prototype.encodeURIComponent = function() {
	return encodeURIComponent(this);
}
String.prototype.decodeHTML = function() {
	var match_regexp = new RegExp('&('+Object.keys(String.entityCharcodes).join('___').escapeRegExp().replace(/___/g,'|')+');','g');
	return this.replace(match_regexp, function (match, entity) {
		return String.fromCharCode(String.entityCharcodes[entity]) || match;
	});
}
String.entityTable = {
            34 : 'quot', 
            38 : 'amp', 
            39 : 'apos', 
            60 : 'lt', 
            62 : 'gt', 
            160 : 'nbsp', 
            161 : 'iexcl', 
            162 : 'cent', 
            163 : 'pound', 
            164 : 'curren', 
            165 : 'yen', 
            166 : 'brvbar', 
            167 : 'sect', 
            168 : 'uml', 
            169 : 'copy', 
            170 : 'ordf', 
            171 : 'laquo', 
            172 : 'not', 
            173 : 'shy', 
            174 : 'reg', 
            175 : 'macr', 
            176 : 'deg', 
            177 : 'plusmn', 
            178 : 'sup2', 
            179 : 'sup3', 
            180 : 'acute', 
            181 : 'micro', 
            182 : 'para', 
            183 : 'middot', 
            184 : 'cedil', 
            185 : 'sup1', 
            186 : 'ordm', 
            187 : 'raquo', 
            188 : 'frac14', 
            189 : 'frac12', 
            190 : 'frac34', 
            191 : 'iquest', 
            192 : 'Agrave', 
            193 : 'Aacute', 
            194 : 'Acirc', 
            195 : 'Atilde', 
            196 : 'Auml', 
            197 : 'Aring', 
            198 : 'AElig', 
            199 : 'Ccedil', 
            200 : 'Egrave', 
            201 : 'Eacute', 
            202 : 'Ecirc', 
            203 : 'Euml', 
            204 : 'Igrave', 
            205 : 'Iacute', 
            206 : 'Icirc', 
            207 : 'Iuml', 
            208 : 'ETH', 
            209 : 'Ntilde', 
            210 : 'Ograve', 
            211 : 'Oacute', 
            212 : 'Ocirc', 
            213 : 'Otilde', 
            214 : 'Ouml', 
            215 : 'times', 
            216 : 'Oslash', 
            217 : 'Ugrave', 
            218 : 'Uacute', 
            219 : 'Ucirc', 
            220 : 'Uuml', 
            221 : 'Yacute', 
            222 : 'THORN', 
            223 : 'szlig', 
            224 : 'agrave', 
            225 : 'aacute', 
            226 : 'acirc', 
            227 : 'atilde', 
            228 : 'auml', 
            229 : 'aring', 
            230 : 'aelig', 
            231 : 'ccedil', 
            232 : 'egrave', 
            233 : 'eacute', 
            234 : 'ecirc', 
            235 : 'euml', 
            236 : 'igrave', 
            237 : 'iacute', 
            238 : 'icirc', 
            239 : 'iuml', 
            240 : 'eth', 
            241 : 'ntilde', 
            242 : 'ograve', 
            243 : 'oacute', 
            244 : 'ocirc', 
            245 : 'otilde', 
            246 : 'ouml', 
            247 : 'divide', 
            248 : 'oslash', 
            249 : 'ugrave', 
            250 : 'uacute', 
            251 : 'ucirc', 
            252 : 'uuml', 
            253 : 'yacute', 
            254 : 'thorn', 
            255 : 'yuml', 
            402 : 'fnof', 
            913 : 'Alpha', 
            914 : 'Beta', 
            915 : 'Gamma', 
            916 : 'Delta', 
            917 : 'Epsilon', 
            918 : 'Zeta', 
            919 : 'Eta', 
            920 : 'Theta', 
            921 : 'Iota', 
            922 : 'Kappa', 
            923 : 'Lambda', 
            924 : 'Mu', 
            925 : 'Nu', 
            926 : 'Xi', 
            927 : 'Omicron', 
            928 : 'Pi', 
            929 : 'Rho', 
            931 : 'Sigma', 
            932 : 'Tau', 
            933 : 'Upsilon', 
            934 : 'Phi', 
            935 : 'Chi', 
            936 : 'Psi', 
            937 : 'Omega', 
            945 : 'alpha', 
            946 : 'beta', 
            947 : 'gamma', 
            948 : 'delta', 
            949 : 'epsilon', 
            950 : 'zeta', 
            951 : 'eta', 
            952 : 'theta', 
            953 : 'iota', 
            954 : 'kappa', 
            955 : 'lambda', 
            956 : 'mu', 
            957 : 'nu', 
            958 : 'xi', 
            959 : 'omicron', 
            960 : 'pi', 
            961 : 'rho', 
            962 : 'sigmaf', 
            963 : 'sigma', 
            964 : 'tau', 
            965 : 'upsilon', 
            966 : 'phi', 
            967 : 'chi', 
            968 : 'psi', 
            969 : 'omega', 
            977 : 'thetasym', 
            978 : 'upsih', 
            982 : 'piv', 
            8226 : 'bull', 
            8230 : 'hellip', 
            8242 : 'prime', 
            8243 : 'Prime', 
            8254 : 'oline', 
            8260 : 'frasl', 
            8472 : 'weierp', 
            8465 : 'image', 
            8476 : 'real', 
            8482 : 'trade', 
            8501 : 'alefsym', 
            8592 : 'larr', 
            8593 : 'uarr', 
            8594 : 'rarr', 
            8595 : 'darr', 
            8596 : 'harr', 
            8629 : 'crarr', 
            8656 : 'lArr', 
            8657 : 'uArr', 
            8658 : 'rArr', 
            8659 : 'dArr', 
            8660 : 'hArr', 
            8704 : 'forall', 
            8706 : 'part', 
            8707 : 'exist', 
            8709 : 'empty', 
            8711 : 'nabla', 
            8712 : 'isin', 
            8713 : 'notin', 
            8715 : 'ni', 
            8719 : 'prod', 
            8721 : 'sum', 
            8722 : 'minus', 
            8727 : 'lowast', 
            8730 : 'radic', 
            8733 : 'prop', 
            8734 : 'infin', 
            8736 : 'ang', 
            8743 : 'and', 
            8744 : 'or', 
            8745 : 'cap', 
            8746 : 'cup', 
            8747 : 'int', 
            8756 : 'there4', 
            8764 : 'sim', 
            8773 : 'cong', 
            8776 : 'asymp', 
            8800 : 'ne', 
            8801 : 'equiv', 
            8804 : 'le', 
            8805 : 'ge', 
            8834 : 'sub', 
            8835 : 'sup', 
            8836 : 'nsub', 
            8838 : 'sube', 
            8839 : 'supe', 
            8853 : 'oplus', 
            8855 : 'otimes', 
            8869 : 'perp', 
            8901 : 'sdot', 
            8968 : 'lceil', 
            8969 : 'rceil', 
            8970 : 'lfloor', 
            8971 : 'rfloor', 
            9001 : 'lang', 
            9002 : 'rang', 
            9674 : 'loz', 
            9824 : 'spades', 
            9827 : 'clubs', 
            9829 : 'hearts', 
            9830 : 'diams', 
            338 : 'OElig', 
            339 : 'oelig', 
            352 : 'Scaron', 
            353 : 'scaron', 
            376 : 'Yuml', 
            710 : 'circ', 
            732 : 'tilde', 
            8194 : 'ensp', 
            8195 : 'emsp', 
            8201 : 'thinsp', 
            8204 : 'zwnj', 
            8205 : 'zwj', 
            8206 : 'lrm', 
            8207 : 'rlm', 
            8211 : 'ndash', 
            8212 : 'mdash', 
            8216 : 'lsquo', 
            8217 : 'rsquo', 
            8218 : 'sbquo', 
            8220 : 'ldquo', 
            8221 : 'rdquo', 
            8222 : 'bdquo', 
            8224 : 'dagger', 
            8225 : 'Dagger', 
            8240 : 'permil', 
            8249 : 'lsaquo', 
            8250 : 'rsaquo', 
            8364 : 'euro'
        };
var charCodes = {};
for(var i in String.entityTable)
	charCodes[String.entityTable[i]] = i;
String.entityCharcodes = charCodes;
String.prototype.encodeHTML = function() {
	return this.replace(/[\u00A0-\u2666<>\&]/g, function(c) {
		return '&' + (String.entityTable[c.charCodeAt(0)] || '#'+c.charCodeAt(0)) + ';';
	});
}
if (!String.prototype.encodeUTF8) {
	String.prototype.encodeUTF8 = function () {
		return unescape((this));
	}
}
if (!String.prototype.decodeUTF8) {
	String.prototype.decodeUTF8 = function () {
		return decodeURIComponent(escape(this));
	}
}