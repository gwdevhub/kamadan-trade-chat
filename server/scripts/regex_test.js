var fs = fs || require('fs');
eval(fs.readFileSync(__dirname+'/../js/String.class.js')+'');

let quarantine_regexes = [];
try {
    let regex_strings = (fs.readFileSync(__dirname+'/../chat_filter_regexes.txt')+'').split('\n');
    for(var i=0;i<regex_strings.length;i++) {
        regex_strings[i] = regex_strings[i].trim();
        if(!regex_strings[i].length)
            continue;
        quarantine_regexes.push(new RegExp(regex_strings[i],'i'));
    }
    console.log("Chat filter regexes: ",quarantine_regexes);

} catch(e) {
    console.error("Failed to parse "+__dirname+'/chat_filter_regexes.txt');
    console.error(e);
}
// True on match
let message = process.argv[2];
//var msg_norm_auto = message.m.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
let msg_norm_manual = message.removeDiacritics().removePunctuation().removeUnderscores().removeSpaces();
console.log("message normalised:\n"+msg_norm_manual+"\n");

let arr = msg_norm_manual.split('').map(function(el) {
    return el.charCodeAt(0);
})
console.log(arr);
for(var i in quarantine_regexes) {
    //if(this.quarantine_regexes[i].test(msg_norm_auto))
    //  return true;
    if(quarantine_regexes[i].test(msg_norm_manual)) {
        console.log("Quarantine Hit!");
        process.exit();
    }
}
console.log("Quarantine pass");