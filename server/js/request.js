// Valid source IP Addresses that can submit new trade messages
const whitelisted_sources = [
    '1',
    '127.0.0.1',
    '10.10.10.1',
    '81.103.52.7'
];
const blacklisted_ips = [
    //'162.158.*.*'
];


/**
 * Extract user agent string from request object
 * @param req {any}
 * @returns {string}
 */
export function getUserAgent(req) {
    let ua = '';
    if(typeof req.headers == 'function')
        ua = req.headers('user-agent');
    else if(typeof req.headers != 'undefined')
        ua = req.headers['user-agent'];
    else if(typeof req.get == 'function')
        ua = req.get('user-agent');
    return ua;
}

/**
 * Extract IP Address from request object, resolving forwarded headers.
 * @param req {any}
 * @returns {string}
 */
export function getIP(req) {
    let ip = req.connection.remoteAddress;
    if(typeof req.header != 'undefined')
        ip = req.header('x-forwarded-for') || ip;
    return ip.split(':').pop();
}

/**
 * Returns whether current request is localhost or not
 * @param req {any}
 * @returns {boolean}
 */
export function isLocal(req) {
    return  getIP(req) === '127.0.0.1';
}
// Should this request be gzip compressed?
export function shouldCompress (req, res) {
    if(/stats/.test(req.url))
        return false; // Disabled for /stats endpoint.
    return compression.filter(req, res);
}
/**
 * Has this request come from a trusted source?
 * @param req {any}
 * @returns {boolean}
 */
export function isValidTradeSource(req) {
    return isWhitelisted(req);
}
/**
 * @param req {any}
 * @returns {boolean}
 */
export function isWhitelisted(req) {
    return whitelisted_sources.indexOf(getIP(req)) != -1;
}
/**
 * @param req {any}
 * @returns {boolean}
 */
export function isBlacklisted(req) {
    let ip = getIP(req);
    if(!ip) return true;
    let parts = /([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)/.exec(ip);
    if(!parts) return false;
    let wildcards = [
        parts[1] + '.*.*.*',
        parts[1] + '.' + parts[2] + '.*.*',
        parts[1] + '.' + parts[2] + '.' + parts[3] + '.*',
        ip
    ];
    for(let i in wildcards) {
        if(blacklisted_ips.indexOf(wildcards[i]) != -1)
            return true;
    }
    return false;
}
function isPreSearing(request) {
    if(typeof request.is_presearing != 'undefined')
        return request.is_presearing ? true : false;
    let referer = request.header ? request.header('Referer') : false;
    if(referer && /presear|ascalon/.test(referer))
        return true;
    if(typeof request.path == 'string' && /presear|ascalon/.test(request.path))
        return true;
    let host = false;
    if(request.hostname) host = request.hostname;
    else if(request.headers && request.headers.host) host = request.headers.host;
    else if(request.host) host = request.host;
    if(typeof host == 'string' && /presear|ascalon/.test(host))
        return true;
    return false;
}